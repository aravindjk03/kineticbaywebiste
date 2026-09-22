/**
 * Projects, plans and recorded payments (no payment gateway).
 *
 * Every plan becomes a payment schedule, so one-time, recurring and
 * milestone projects are all tracked the same way: what was due by now,
 * what has been paid, and what is overdue.
 */

export const APPROVAL_LIMIT = 50000; // INR: Admin approves up to this, Super Admin above
export const PLANS = ['one_time', 'monthly', 'quarterly', 'yearly', 'milestone'];
export const PROJECT_STATUSES = ['draft', 'pending_approval', 'approved', 'rejected', 'active', 'completed', 'cancelled'];
export const PAYMENT_METHODS = ['bank_transfer', 'upi', 'cheque', 'cash', 'card', 'other'];
export const WON_STATUSES = new Set(['approved', 'active', 'completed']);

const MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };
const round = (n) => Math.round(Number(n || 0) * 100) / 100;

const addMonths = (iso, n) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
};

/** The instalments a project is expected to pay. */
export function schedule(p) {
  const start = (p.start_date || p.created_at || new Date().toISOString()).slice(0, 10);
  if (p.plan === 'milestone') {
    return (p.milestones || []).map((m, i) => ({ label: m.title || `Milestone ${i + 1}`, amount: round(m.amount), due_date: (m.due_date || start).slice(0, 10) }));
  }
  if (MONTHS[p.plan]) {
    const periods = Math.max(1, Math.min(120, Number(p.periods) || 1));
    return Array.from({ length: periods }, (_, i) => ({
      label: `${p.plan === 'monthly' ? 'Month' : p.plan === 'quarterly' ? 'Quarter' : 'Year'} ${i + 1}`,
      amount: round(p.amount_per_period),
      due_date: addMonths(start, i * MONTHS[p.plan]),
    }));
  }
  return [{ label: 'Full payment', amount: round(p.amount), due_date: (p.due_date || start).slice(0, 10) }];
}

export const contractValue = (p) => round(schedule(p).reduce((s, x) => s + x.amount, 0));

export const requiredApprover = (value) => (value > APPROVAL_LIMIT ? 'super_admin' : 'admin');

/** Money position of a project on a given day. Payments are applied to the oldest instalment first. */
export function finance(p, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  const items = schedule(p);
  const paid = round((p.payments || []).reduce((s, x) => s + Number(x.amount || 0), 0));
  let left = paid;
  const rows = items.map((x) => {
    const covered = Math.min(left, x.amount);
    left = round(left - covered);
    const state = covered >= x.amount ? 'paid' : x.due_date < today ? 'overdue' : covered > 0 ? 'part_paid' : 'upcoming';
    return { ...x, paid: round(covered), state };
  });
  const value = round(items.reduce((s, x) => s + x.amount, 0));
  const dueToDate = round(items.filter((x) => x.due_date <= today).reduce((s, x) => s + x.amount, 0));
  const next = rows.find((r) => r.state !== 'paid');
  const live = WON_STATUSES.has(p.status);
  return {
    value, paid, outstanding: round(Math.max(0, value - paid)),
    due_to_date: dueToDate,
    overdue: live ? round(Math.max(0, dueToDate - paid)) : 0,
    next_due: next ? { label: next.label, amount: round(next.amount - next.paid), due_date: next.due_date } : null,
    schedule: rows,
  };
}

export const withFinance = (p, now) => ({ ...p, finance: finance(p, now) });
