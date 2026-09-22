import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Plus, RefreshCw, Search, ShieldCheck, XCircle, IndianRupee } from 'lucide-react';
import { api } from '../../lib/api';
import { StaffMember, Chip, Drawer, fmtDate, human, inr, inrShort, staffName } from './crmShared';

type Notify = (type: 'success' | 'error', message: string) => void;

interface Instalment { label: string; amount: number; due_date: string; paid: number; state: 'paid' | 'part_paid' | 'overdue' | 'upcoming' }
interface Payment { id: string; amount: number; date: string; method: string; reference: string; note: string; recorded_by_name: string }
export interface Project {
  id: string; ref: string; title: string; customer_email: string; customer_name: string; company: string; service: string;
  lead_id: string | null; owner_id: string | null; plan: string; start_date: string; amount?: number; due_date?: string;
  amount_per_period?: number; periods?: number; milestones?: { title: string; amount: number; due_date: string }[];
  status: string; notes: string; payments: Payment[]; created_by: string; created_at: string; updated_at: string;
  approval: null | { required_role: string; requested_by: string; requested_by_name: string; requested_at: string; decision: string | null; decided_by_name?: string; decided_at?: string; note?: string };
  history: { at: string; by: string; text: string }[];
  finance: { value: number; paid: number; outstanding: number; due_to_date: number; overdue: number; next_due: null | { label: string; amount: number; due_date: string }; schedule: Instalment[] };
}

export interface ProjectDraft { customer_email?: string; customer_name?: string; company?: string; service?: string; lead_id?: string; title?: string }

const PLAN_LABEL: Record<string, string> = { one_time: 'One-time', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', milestone: 'Milestones' };
const METHODS = ['bank_transfer', 'upi', 'cheque', 'cash', 'card', 'other'];
const FILTERS = [
  { key: 'all', label: 'All' }, { key: 'pending_approval', label: 'Awaiting approval' }, { key: 'draft', label: 'Drafts' },
  { key: 'live', label: 'Approved & active' }, { key: 'overdue', label: 'Payment overdue' }, { key: 'completed', label: 'Completed' },
  { key: 'closed', label: 'Rejected & cancelled' },
];
const today = () => new Date().toISOString().slice(0, 10);
const field = 'w-full bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary/60 disabled:opacity-60';

export function StatusChip({ p }: { p: Project }) {
  switch (p.status) {
    case 'pending_approval': return <Chip tone="warn" icon={ShieldCheck}>Needs {p.approval?.required_role === 'super_admin' ? 'Super Admin' : 'Admin'}</Chip>;
    case 'approved': case 'active': return <Chip tone="good" icon={CheckCircle}>{human(p.status)}</Chip>;
    case 'completed': return <Chip tone="good" icon={CheckCircle}>Completed</Chip>;
    case 'rejected': return <Chip tone="bad" icon={XCircle}>Rejected</Chip>;
    case 'cancelled': return <Chip tone="neutral" icon={XCircle}>Cancelled</Chip>;
    default: return <Chip tone="neutral" icon={Clock}>Draft</Chip>;
  }
}

export default function ProjectsPanel({ staff, me, notify, focusId, draft, onDraftUsed, onOpenCustomer }: {
  staff: StaffMember[];
  me: { id: string; role: string; permissions: string[] };
  notify: Notify;
  focusId?: string | null;
  draft?: ProjectDraft | null;
  onDraftUsed?: () => void;
  onOpenCustomer: (email: string) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [limit, setLimit] = useState(50000);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState<ProjectDraft | null>(null);
  const can = (p: string) => me.role === 'super_admin' || me.permissions.includes(p);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getProjects();
      setProjects(res.projects || []);
      setLimit(res.approval_limit || 50000);
    } catch (e) {
      notify('error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (focusId) setOpenId(focusId); }, [focusId]);
  useEffect(() => { if (draft) { setCreating(draft); onDraftUsed?.(); } }, [draft]);

  const replace = (p: Project) => setProjects((xs) => (xs.some((x) => x.id === p.id) ? xs.map((x) => (x.id === p.id ? p : x)) : [p, ...xs]));

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const f = filter === 'all' || p.status === filter
        || (filter === 'live' && ['approved', 'active'].includes(p.status))
        || (filter === 'overdue' && p.finance.overdue > 0)
        || (filter === 'closed' && ['rejected', 'cancelled'].includes(p.status));
      return f && (!q || [p.title, p.ref, p.customer_name, p.customer_email, p.company, p.service].some((x) => (x || '').toLowerCase().includes(q)));
    });
  }, [projects, filter, search]);

  const live = projects.filter((p) => ['approved', 'active', 'completed'].includes(p.status));
  const totals = {
    value: live.reduce((s, p) => s + p.finance.value, 0),
    paid: live.reduce((s, p) => s + p.finance.paid, 0),
    outstanding: live.reduce((s, p) => s + p.finance.outstanding, 0),
    overdue: live.reduce((s, p) => s + p.finance.overdue, 0),
    pending: projects.filter((p) => p.status === 'pending_approval').length,
  };

  const open = projects.find((p) => p.id === openId) || null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-xl text-ink">Projects & billing</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Every signed project, its payment plan and every payment received. Up to {inr(limit)} an Admin approves; above that a Super Admin must approve.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Project, customer or ref" className="pl-8 pr-3 py-2 rounded-xl bg-surface-raised border border-border text-xs text-ink w-52 focus:outline-none focus:border-primary/60" />
          </label>
          <button onClick={load} title="Refresh" className="p-2 rounded-xl bg-surface-raised border border-border text-text-secondary hover:text-ink"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          {can('projects:create') && (
            <button onClick={() => setCreating({})} className="px-3 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />New project</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Business won', inrShort(totals.value), `${live.length} projects`],
          ['Received', inrShort(totals.paid), totals.value ? `${Math.round((totals.paid / totals.value) * 100)}% of won value` : '—'],
          ['Still to collect', inrShort(totals.outstanding), 'across all plans'],
          ['Overdue', inrShort(totals.overdue), totals.overdue ? 'follow up with customers' : 'nothing overdue'],
          ['Awaiting approval', String(totals.pending), 'projects'],
        ].map(([k, v, sub]) => (
          <div key={k} className="rounded-2xl border border-border/80 bg-surface/60 p-4">
            <div className="text-[11px] text-text-secondary">{k}</div>
            <div className="text-2xl font-bold text-ink tabular-nums mt-1 leading-none">{v}</div>
            <div className="text-[11px] text-text-secondary mt-1.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-xl text-xs ${filter === f.key ? 'bg-primary text-ink font-semibold' : 'bg-surface-raised border border-border text-text-secondary hover:text-ink'}`}>{f.label}</button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/80 bg-surface/70 overflow-x-auto">
        <table className="w-full text-left text-xs text-ink min-w-[860px]">
          <thead className="bg-surface-raised border-b border-border text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Project</th>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Plan</th>
              <th className="p-3.5 text-right">Value</th>
              <th className="p-3.5 text-right">Received</th>
              <th className="p-3.5">Next payment</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {shown.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-text-secondary">{loading ? 'Loading…' : 'No projects here yet.'}</td></tr>}
            {shown.map((p) => (
              <tr key={p.id} onClick={() => setOpenId(p.id)} className="hover:bg-surface-raised/40 cursor-pointer">
                <td className="p-3.5"><div className="font-semibold">{p.title}</div><div className="text-[11px] text-text-secondary font-mono">{p.ref} · {p.service || '—'}</div></td>
                <td className="p-3.5"><div>{p.customer_name}</div><div className="text-[11px] text-text-secondary">{p.company || p.customer_email}</div></td>
                <td className="p-3.5 text-text-secondary">{PLAN_LABEL[p.plan]}{p.periods ? ` × ${p.periods}` : ''}</td>
                <td className="p-3.5 text-right tabular-nums">{inr(p.finance.value)}</td>
                <td className="p-3.5 text-right tabular-nums">{inr(p.finance.paid)}</td>
                <td className="p-3.5">
                  {p.finance.overdue > 0
                    ? <Chip tone="bad" icon={AlertTriangle}>{inr(p.finance.overdue)} overdue</Chip>
                    : p.finance.next_due && ['approved', 'active'].includes(p.status)
                      ? <span className="text-text-secondary">{inr(p.finance.next_due.amount)} on {fmtDate(p.finance.next_due.due_date).split(',')[0]}</span>
                      : <span className="text-text-secondary">—</span>}
                </td>
                <td className="p-3.5"><StatusChip p={p} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && <ProjectForm draft={creating} limit={limit} notify={notify} onClose={() => setCreating(null)} onSaved={(p) => { replace(p); setCreating(null); setOpenId(p.id); }} />}
      {open && <ProjectDrawer p={open} staff={staff} me={me} limit={limit} notify={notify} onClose={() => setOpenId(null)} onUpdated={replace} onOpenCustomer={onOpenCustomer} />}
    </div>
  );
}

/* ═══════════════════════════ New project ═══════════════════════════ */

function ProjectForm({ draft, limit, notify, onClose, onSaved }: { draft: ProjectDraft; limit: number; notify: Notify; onClose: () => void; onSaved: (p: Project) => void }) {
  const [f, setF] = useState({
    title: draft.title || '', customer_email: draft.customer_email || '', customer_name: draft.customer_name || '', company: draft.company || '',
    service: draft.service || '', plan: 'one_time', amount: '', due_date: today(), start_date: today(), amount_per_period: '', periods: '12', notes: '',
  });
  const [milestones, setMilestones] = useState([{ title: 'Advance', amount: '', due_date: today() }]);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  const value = f.plan === 'one_time' ? Number(f.amount) || 0
    : f.plan === 'milestone' ? milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0)
      : (Number(f.amount_per_period) || 0) * (Number(f.periods) || 0);

  const save = async (submit: boolean) => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { title: f.title, customer_email: f.customer_email, customer_name: f.customer_name, company: f.company, service: f.service, plan: f.plan, start_date: f.start_date, notes: f.notes, lead_id: draft.lead_id };
      if (f.plan === 'one_time') Object.assign(body, { amount: f.amount, due_date: f.due_date });
      else if (f.plan === 'milestone') body.milestones = milestones;
      else Object.assign(body, { amount_per_period: f.amount_per_period, periods: f.periods });
      let res = await api.createProject(body);
      if (submit) res = await api.submitProject(res.project.id);
      notify('success', submit ? `Sent for ${res.project.approval?.required_role === 'super_admin' ? 'Super Admin' : 'Admin'} approval` : 'Draft saved');
      onSaved(res.project);
    } catch (e) {
      notify('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open onClose={onClose} title="New project" subtitle={draft.lead_id ? 'Linked to the lead you came from' : 'Record a signed or proposed project'}>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="sm:col-span-2 space-y-1"><span className="text-[11px] text-text-secondary">Project title</span><input className={field} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Smart factory IoT rollout" /></label>
        <label className="space-y-1"><span className="text-[11px] text-text-secondary">Customer email</span><input className={field} value={f.customer_email} onChange={(e) => set('customer_email', e.target.value)} /></label>
        <label className="space-y-1"><span className="text-[11px] text-text-secondary">Customer name</span><input className={field} value={f.customer_name} onChange={(e) => set('customer_name', e.target.value)} /></label>
        <label className="space-y-1"><span className="text-[11px] text-text-secondary">Company</span><input className={field} value={f.company} onChange={(e) => set('company', e.target.value)} /></label>
        <label className="space-y-1"><span className="text-[11px] text-text-secondary">Service</span><input className={field} value={f.service} onChange={(e) => set('service', e.target.value)} placeholder="e.g. IoT Solutions" /></label>
      </div>

      <div className="rounded-2xl border border-border/80 bg-surface/60 p-3.5 space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Payment plan</div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PLAN_LABEL).map(([k, label]) => (
            <button key={k} onClick={() => set('plan', k)} className={`px-3 py-1.5 rounded-lg border text-xs ${f.plan === k ? 'border-primary/60 bg-primary/10 text-ink' : 'border-border text-text-secondary'}`}>{label}</button>
          ))}
        </div>
        {f.plan === 'one_time' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-[11px] text-text-secondary">Amount (₹)</span><input type="number" min="0" className={field} value={f.amount} onChange={(e) => set('amount', e.target.value)} /></label>
            <label className="space-y-1"><span className="text-[11px] text-text-secondary">Due on</span><input type="date" className={field} value={f.due_date} onChange={(e) => set('due_date', e.target.value)} /></label>
          </div>
        )}
        {['monthly', 'quarterly', 'yearly'].includes(f.plan) && (
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1"><span className="text-[11px] text-text-secondary">Amount each {f.plan === 'monthly' ? 'month' : f.plan === 'quarterly' ? 'quarter' : 'year'} (₹)</span><input type="number" min="0" className={field} value={f.amount_per_period} onChange={(e) => set('amount_per_period', e.target.value)} /></label>
            <label className="space-y-1"><span className="text-[11px] text-text-secondary">Number of payments</span><input type="number" min="1" max="120" className={field} value={f.periods} onChange={(e) => set('periods', e.target.value)} /></label>
            <label className="space-y-1"><span className="text-[11px] text-text-secondary">First payment on</span><input type="date" className={field} value={f.start_date} onChange={(e) => set('start_date', e.target.value)} /></label>
          </div>
        )}
        {f.plan === 'milestone' && (
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_140px_auto] gap-2 items-center">
                <input className={field} value={m.title} placeholder="Milestone" onChange={(e) => setMilestones((ms) => ms.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <input type="number" min="0" className={field} value={m.amount} placeholder="₹" onChange={(e) => setMilestones((ms) => ms.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                <input type="date" className={field} value={m.due_date} onChange={(e) => setMilestones((ms) => ms.map((x, j) => (j === i ? { ...x, due_date: e.target.value } : x)))} />
                <button disabled={milestones.length === 1} onClick={() => setMilestones((ms) => ms.filter((_, j) => j !== i))} className="text-[11px] text-text-secondary hover:text-ink px-1 disabled:opacity-30">Remove</button>
              </div>
            ))}
            <button onClick={() => setMilestones((ms) => [...ms, { title: `Milestone ${ms.length + 1}`, amount: '', due_date: today() }])} className="text-[11px] text-primary">+ Add milestone</button>
          </div>
        )}
        <div className="flex items-center justify-between text-xs border-t border-border pt-3">
          <span className="text-text-secondary">Contract value</span>
          <span className="font-bold text-ink tabular-nums">{inr(value)}</span>
        </div>
        <div className="text-[11px] text-text-secondary flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          {value > limit ? `Above ${inr(limit)}: needs Super Admin approval.` : `Up to ${inr(limit)}: an Admin can approve.`}
        </div>
      </div>

      <label className="block space-y-1"><span className="text-[11px] text-text-secondary">Notes</span><textarea rows={3} className={field} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Scope, terms, PO number…" /></label>

      <div className="flex justify-end gap-2">
        <button disabled={busy} onClick={() => save(false)} className="px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-text-secondary hover:text-ink">Save draft</button>
        <button disabled={busy} onClick={() => save(true)} className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold">Save & send for approval</button>
      </div>
    </Drawer>
  );
}

/* ═══════════════════════════ Project detail ═══════════════════════════ */

const INSTALMENT: Record<Instalment['state'], { tone: 'good' | 'warn' | 'bad' | 'neutral'; icon: typeof Clock; label: string }> = {
  paid: { tone: 'good', icon: CheckCircle, label: 'Paid' },
  part_paid: { tone: 'warn', icon: Clock, label: 'Part paid' },
  overdue: { tone: 'bad', icon: AlertTriangle, label: 'Overdue' },
  upcoming: { tone: 'neutral', icon: Clock, label: 'Upcoming' },
};

function ProjectDrawer({ p, staff, me, limit, notify, onClose, onUpdated, onOpenCustomer }: {
  p: Project; staff: StaffMember[]; me: { id: string; role: string; permissions: string[] }; limit: number;
  notify: Notify; onClose: () => void; onUpdated: (p: Project) => void; onOpenCustomer: (email: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [pay, setPay] = useState({ amount: '', date: today(), method: 'bank_transfer', reference: '', note: '' });
  const can = (perm: string) => me.role === 'super_admin' || me.permissions.includes(perm);
  const F = p.finance;
  const needsSuper = p.approval?.required_role === 'super_admin';
  const mayDecide = p.status === 'pending_approval' && (me.role === 'super_admin' || (!needsSuper && can('projects:approve'))) && (p.approval?.requested_by !== me.id || me.role === 'super_admin');
  const live = ['approved', 'active', 'completed'].includes(p.status);

  const run = async (fn: () => Promise<{ project: Project }>, ok: string) => {
    setBusy(true);
    try {
      const res = await fn();
      onUpdated(res.project);
      notify('success', ok);
      return true;
    } catch (e) {
      notify('error', (e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={p.title} subtitle={<><span className="font-mono">{p.ref}</span> · {p.service || 'No service'} · owner {staffName(staff, p.owner_id)}</>}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip p={p} />
        <button onClick={() => onOpenCustomer(p.customer_email)} className="text-xs text-primary hover:underline">{p.customer_name}{p.company ? ` · ${p.company}` : ''} →</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[['Contract value', F.value], ['Received', F.paid], ['Balance', F.outstanding], ['Overdue', F.overdue]].map(([k, v]) => (
          <div key={k as string} className="rounded-xl border border-border/80 bg-surface/60 p-3">
            <div className="text-[11px] text-text-secondary">{k}</div>
            <div className={`text-base font-bold tabular-nums ${k === 'Overdue' && (v as number) > 0 ? 'text-red-300' : 'text-ink'}`}>{inr(v as number)}</div>
          </div>
        ))}
      </div>

      {/* Approval */}
      {(p.status === 'draft' || p.status === 'rejected' || p.status === 'pending_approval') && (
        <div className="rounded-2xl border border-border/80 bg-surface/60 p-3.5 space-y-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" />Approval</div>
          <p className="text-xs text-text-secondary">
            {F.value > limit ? `Value is above ${inr(limit)}, so a Super Admin must approve.` : `Value is ${inr(limit)} or less, so an Admin (or Super Admin) can approve.`}
            {p.status === 'pending_approval' && <> Requested by {p.approval?.requested_by_name} {fmtDate(p.approval?.requested_at)}.</>}
            {p.status === 'rejected' && <> Rejected by {p.approval?.decided_by_name}: “{p.approval?.note}”. Edit and resubmit when ready.</>}
          </p>
          {(p.status === 'draft' || p.status === 'rejected') && can('projects:create') && (
            <button disabled={busy} onClick={() => run(() => api.submitProject(p.id), 'Sent for approval')} className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold">Send for approval</button>
          )}
          {mayDecide && (
            <div className="space-y-2">
              <textarea rows={2} className={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required to reject)" />
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => run(() => api.decideProject(p.id, 'approve', note), 'Project approved')} className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Approve</button>
                <button disabled={busy || !note.trim()} onClick={() => run(() => api.decideProject(p.id, 'reject', note), 'Project rejected')} className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/35 text-red-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><XCircle className="w-3.5 h-3.5" />Reject</button>
              </div>
            </div>
          )}
          {p.status === 'pending_approval' && !mayDecide && (
            <div className="text-[11px] text-text-secondary">
              {p.approval?.requested_by === me.id ? 'Waiting for another approver: you can’t approve your own request.' : needsSuper ? 'Waiting for a Super Admin.' : 'Waiting for an Admin.'}
            </div>
          )}
        </div>
      )}

      {/* Schedule */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">Payment schedule · {PLAN_LABEL[p.plan]}</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-border/50">
              {F.schedule.map((x, i) => {
                const s = INSTALMENT[live ? x.state : 'upcoming'];
                return (
                  <tr key={i}>
                    <td className="p-2.5 text-ink">{x.label}</td>
                    <td className="p-2.5 text-text-secondary">{new Date(x.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="p-2.5 text-right tabular-nums">{inr(x.amount)}</td>
                    <td className="p-2.5 text-right tabular-nums text-text-secondary">{x.paid ? inr(x.paid) : '—'}</td>
                    <td className="p-2.5 text-right"><Chip tone={s.tone} icon={s.icon}>{s.label}</Chip></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record payment */}
      {live && can('payments:record') && (
        <div className="rounded-2xl border border-border/80 bg-surface/60 p-3.5 space-y-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-primary" />Record a payment received</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input type="number" min="0" className={field} placeholder={F.next_due ? `₹ e.g. ${F.next_due.amount}` : '₹ amount'} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
            <input type="date" max={today()} className={field} value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} />
            <select className={field} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{METHODS.map((m) => <option key={m} value={m}>{m === 'upi' ? 'UPI' : human(m)}</option>)}</select>
            <input className={`${field} sm:col-span-2`} placeholder="Reference (UTR, cheque no., invoice no.)" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
            <button
              disabled={busy || !(Number(pay.amount) > 0)}
              onClick={async () => { if (await run(() => api.recordPayment(p.id, { ...pay, amount: Number(pay.amount) }), 'Payment recorded')) setPay({ amount: '', date: today(), method: pay.method, reference: '', note: '' }); }}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold disabled:opacity-50"
            >Record</button>
          </div>
        </div>
      )}

      {/* Payments */}
      {p.payments.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">Payments received</h3>
          <ul className="space-y-1.5">
            {[...p.payments].sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-[#101217] px-3 py-2 text-xs">
                <span><b className="text-ink tabular-nums">{inr(x.amount)}</b> <span className="text-text-secondary">· {new Date(x.date).toLocaleDateString()} · {x.method === 'upi' ? 'UPI' : human(x.method)}{x.reference ? ` · ${x.reference}` : ''} · by {x.recorded_by_name}</span></span>
                {me.role === 'super_admin' && <button disabled={busy} onClick={() => confirm('Remove this payment record?') && run(() => api.deletePayment(p.id, x.id), 'Payment removed')} className="text-[11px] text-text-secondary hover:text-red-300">Remove</button>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lifecycle */}
      {can('projects:create') && (
        <div className="flex flex-wrap gap-2">
          {p.status === 'approved' && <button disabled={busy} onClick={() => run(() => api.setProjectStatus(p.id, 'active'), 'Marked active')} className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-xs text-ink">Start project</button>}
          {p.status === 'active' && <button disabled={busy} onClick={() => run(() => api.setProjectStatus(p.id, 'completed'), 'Marked completed')} className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-xs text-ink">Mark completed</button>}
          {['draft', 'rejected', 'approved', 'active'].includes(p.status) && <button disabled={busy} onClick={() => confirm('Cancel this project?') && run(() => api.setProjectStatus(p.id, 'cancelled'), 'Project cancelled')} className="px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-red-300">Cancel project</button>}
        </div>
      )}

      {p.notes && <div><h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">Notes</h3><p className="text-xs text-ink/90 whitespace-pre-wrap">{p.notes}</p></div>}

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">History</h3>
        <ul className="space-y-1.5 text-[11px]">
          {[...(p.history || [])].reverse().map((h, i) => <li key={i} className="text-text-secondary"><b className="text-ink font-medium">{h.text}</b> · {h.by} · {fmtDate(h.at)}</li>)}
        </ul>
      </div>
    </Drawer>
  );
}
