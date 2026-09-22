import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';

/* ─── Shared types for the CRM / service-desk views ─── */

export interface StaffMember { id: string; name: string; role: string }

export interface SlaClock {
  due: string;
  state: 'on_track' | 'at_risk' | 'breached' | 'met' | 'missed';
  met_at: string | null;
  remaining_ms: number;
}

export interface TicketSla {
  target_hours: { response: number; resolution: number };
  response: SlaClock;
  resolution: SlaClock;
}

export interface LeadActivity {
  id: string;
  type: 'note' | 'call' | 'meeting' | 'whatsapp' | 'email' | 'status' | 'owner';
  text: string;
  subject?: string;
  author_id: string | null;
  author_name: string;
  at: string;
}

export interface Lead {
  id: string;
  reference_id: string;
  name: string;
  email: string;
  company: string;
  service_name: string;
  budget_range: string;
  timeline: string;
  message: string;
  status: string;
  notes: string;
  source?: string;
  owner_id?: string | null;
  follow_up_at?: string | null;
  first_response_at?: string | null;
  last_contacted_at?: string | null;
  activities?: LeadActivity[];
  response_clock?: SlaClock;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Notification {
  id: string;
  kind: string;
  severity: 'critical' | 'warning' | 'info';
  at: string;
  title: string;
  detail: string;
  link: { tab: string; id?: string };
}

export const LEAD_STAGES = [
  { key: 'NEW', label: 'New' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'PROPOSAL_SENT', label: 'Proposal sent' },
  { key: 'WON', label: 'Won' },
  { key: 'LOST', label: 'Lost' },
];

/* ─── Formatting ─── */

export const human = (s?: string | null) =>
  String(s || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export function duration(ms: number) {
  const m = Math.max(0, Math.round(Math.abs(ms) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60 ? `${m % 60}m` : ''}`.trim();
  return `${Math.floor(h / 24)}d ${h % 24 ? `${h % 24}h` : ''}`.trim();
}

export function ago(iso?: string | null) {
  if (!iso) return '—';
  const ms = Date.now() - Date.parse(iso);
  if (ms < 0) return `in ${duration(-ms)}`;
  if (ms < 60000) return 'just now';
  return `${duration(ms)} ago`;
}

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtHours = (h: number | null | undefined) => (h == null ? '—' : h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(h < 10 ? 1 : 0)}h`);

export const initials = (name?: string) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export const staffName = (staff: StaffMember[], id?: string | null) => (id ? staff.find((s) => s.id === id)?.name || 'Former staff' : 'Unassigned');

/* ─── Status chips (always icon + label, never colour alone) ─── */

const TONE = {
  good: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  warn: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  bad: 'bg-red-500/10 text-red-300 border-red-500/35',
  neutral: 'bg-surface-raised text-text-secondary border-border',
};

export function Chip({ tone, icon: Icon, children, title }: { tone: keyof typeof TONE; icon: typeof Clock; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap ${TONE[tone]}`}>
      <Icon className="w-3 h-3 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

/** One clock: "Reply in 3h", "Reply 2h overdue", "Replied on time". */
export function ClockChip({ clock, verb }: { clock?: SlaClock; verb: { pending: string; done: string } }) {
  if (!clock) return null;
  const due = `Due ${fmtDate(clock.due)}`;
  switch (clock.state) {
    case 'met': return <Chip tone="good" icon={CheckCircle} title={due}>{verb.done} on time</Chip>;
    case 'missed': return <Chip tone="neutral" icon={AlertTriangle} title={due}>{verb.done} late</Chip>;
    case 'breached': return <Chip tone="bad" icon={XCircle} title={due}>{verb.pending} {duration(clock.remaining_ms)} overdue</Chip>;
    case 'at_risk': return <Chip tone="warn" icon={AlertTriangle} title={due}>{verb.pending} in {duration(clock.remaining_ms)}</Chip>;
    default: return <Chip tone="neutral" icon={Clock} title={due}>{verb.pending} in {duration(clock.remaining_ms)}</Chip>;
  }
}

/** The clock that matters right now for a ticket: first reply until it's sent, then resolution. */
export function SlaBadge({ sla }: { sla?: TicketSla }) {
  if (!sla) return null;
  if (sla.response.state !== 'met' && sla.response.state !== 'missed') {
    return <ClockChip clock={sla.response} verb={{ pending: 'Reply', done: 'Replied' }} />;
  }
  return <ClockChip clock={sla.resolution} verb={{ pending: 'Resolve', done: 'Resolved' }} />;
}

export function FollowUpChip({ at }: { at?: string | null }) {
  if (!at) return null;
  const ms = Date.parse(at) - Date.now();
  if (ms < 0) return <Chip tone="bad" icon={AlertTriangle} title={fmtDate(at)}>Follow-up {duration(ms)} overdue</Chip>;
  if (ms < 24 * 3600e3) return <Chip tone="warn" icon={Clock} title={fmtDate(at)}>Follow up in {duration(ms)}</Chip>;
  return <Chip tone="neutral" icon={Clock} title={fmtDate(at)}>Follow up {new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Chip>;
}

export function Avatar({ name, size = 'sm' }: { name?: string; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-9 h-9 text-xs' : 'w-6 h-6 text-[9px]';
  return (
    <span title={name} className={`${cls} rounded-full bg-primary/15 border border-primary/30 text-primary font-bold inline-flex items-center justify-center shrink-0`}>
      {initials(name)}
    </span>
  );
}

/** Side drawer used for lead and customer detail. */
export function Drawer({ open, onClose, title, subtitle, children, width = 'max-w-xl' }: {
  open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative w-full ${width} h-full bg-[#0e1015] border-l border-border shadow-2xl flex flex-col`}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <div className="font-heading font-bold text-base text-ink truncate">{title}</div>
            {subtitle && <div className="text-[11px] text-text-secondary mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="px-2 py-1 rounded-lg text-text-secondary hover:text-ink hover:bg-surface-raised text-xs">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">{children}</div>
      </div>
    </div>
  );
}
