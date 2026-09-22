/**
 * Automatic routing of new tickets and leads.
 *
 * Principles: route by skill (category → the role that owns it), balance load
 * inside that role (fewest open items, then whoever was assigned least
 * recently), always fall back upwards so nothing is left unowned, and escalate
 * major issues to everyone.
 */

export const TICKET_RULES = [
  { categories: ['security'], role: 'super_admin', why: 'Security issues go straight to a Super Admin' },
  { categories: ['billing'], role: 'admin', why: 'Billing is owned by Admin' },
  { categories: ['technical_support', 'bug_report', 'integration', 'feature_request'], role: 'admin', why: 'Technical work is shared across Admins' },
  { categories: ['project_enquiry', 'consultation', 'general_inquiry'], role: 'marketing', why: 'Sales questions go to Marketing' },
];
export const LEAD_ROLE = 'marketing';
const FALLBACK = ['admin', 'super_admin'];

/** Critical/urgent tickets and anything security-related alert every role. */
export const isMajorIssue = (t) => ['critical', 'urgent'].includes(t.priority) || t.category === 'security';

function pick(users, roles, openCount, lastAssigned) {
  for (const role of roles) {
    const pool = users.filter((u) => u.status === 'active' && u.role === role);
    if (!pool.length) continue;
    pool.sort((a, b) => (openCount(a.id) - openCount(b.id)) || String(lastAssigned(a.id)).localeCompare(String(lastAssigned(b.id))));
    return pool[0];
  }
  return null;
}

const CLOSED_TICKET = new Set(['RESOLVED', 'CLOSED']);

export function assignTicket(ticket, users, tickets) {
  const rule = TICKET_RULES.find((r) => r.categories.includes(ticket.category)) || TICKET_RULES[2];
  const open = tickets.filter((t) => !t.deleted_at && !CLOSED_TICKET.has(t.status));
  const user = pick(
    users,
    [rule.role, ...FALLBACK.filter((r) => r !== rule.role)],
    (id) => open.filter((t) => t.assigned_to === id).length,
    (id) => tickets.filter((t) => t.assigned_to === id).map((t) => t.created_at).sort().pop() || '',
  );
  return user ? { user, why: user.role === rule.role ? rule.why : `${rule.why} (none available, escalated to ${user.role.replace('_', ' ')})` } : null;
}

export function assignLead(lead, users, leads) {
  const open = leads.filter((e) => !e.deleted_at && !['WON', 'LOST'].includes(e.status));
  const user = pick(
    users,
    [LEAD_ROLE, ...FALLBACK],
    (id) => open.filter((e) => e.owner_id === id).length,
    (id) => leads.filter((e) => e.owner_id === id).map((e) => e.created_at).sort().pop() || '',
  );
  return user ? { user, why: user.role === LEAD_ROLE ? 'New leads are shared across Marketing' : 'No Marketing user available, escalated' } : null;
}
