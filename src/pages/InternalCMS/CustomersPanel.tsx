import { useEffect, useState } from 'react';
import { Mail, RefreshCw, Search, Ticket, FileText, CheckCircle, Send, Phone, StickyNote, Briefcase, IndianRupee, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { Lead, StaffMember, TicketSla, human, ago, fmtDate, staffName, Avatar, Drawer, SlaBadge, inr, Chip } from './crmShared';

import { Project, StatusChip } from './ProjectsPanel';

interface CustomerRow {
  email: string; name: string; company: string;
  enquiry_count: number; ticket_count: number; open_tickets: number;
  lead_status: string | null; owner_id: string | null;
  first_seen: string; last_activity: string;
  services: string[]; project_count: number; active_projects: number;
  total_business: number; paid: number; outstanding: number; overdue: number;
}

interface CustomerProfile extends CustomerRow {
  enquiries: Lead[];
  tickets: { id: string; public_id: string; subject: string; status: string; priority: string; created_at: string; sla?: TicketSla }[];
  projects: Project[];
  timeline: { at: string; kind: string; ref: string; id: string; title: string; text: string; author?: string }[];
}

const KIND_ICON: Record<string, typeof Mail> = {
  enquiry: FileText, ticket: Ticket, project: Briefcase, project_approved: CheckCircle, project_rejected: XCircle, payment: IndianRupee, ticket_update: Send, ticket_resolved: CheckCircle,
  lead_email: Mail, lead_call: Phone, lead_meeting: Phone, lead_whatsapp: Phone, lead_note: StickyNote,
};

export default function CustomersPanel({ staff, notify, focusEmail, onOpenLead, onOpenTicket, onOpenProject }: {
  staff: StaffMember[];
  notify: (type: 'success' | 'error', message: string) => void;
  focusEmail?: string | null;
  onOpenLead: (id: string) => void;
  onOpenTicket: (id: string) => void;
  onOpenProject: (id: string) => void;
}) {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRows((await api.getCustomers()).customers || []);
    } catch (e) {
      notify('error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const open = async (email: string) => {
    try {
      setProfile((await api.getCustomer(email)).customer);
    } catch (e) {
      notify('error', (e as Error).message);
    }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (focusEmail) open(focusEmail); }, [focusEmail]);

  const q = search.trim().toLowerCase();
  const shown = rows.filter((r) => !q || [r.name, r.email, r.company].some((f) => (f || '').toLowerCase().includes(q)));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-xl text-ink">Customers</h2>
          <p className="text-xs text-text-secondary mt-0.5">Everyone who has sent an enquiry or raised a ticket, grouped by email, with their full history in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or company" className="pl-8 pr-3 py-2 rounded-xl bg-surface-raised border border-border text-xs text-ink w-56 focus:outline-none focus:border-primary/60" />
          </label>
          <button onClick={load} title="Refresh" className="p-2 rounded-xl bg-surface-raised border border-border text-text-secondary hover:text-ink"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-surface/70 overflow-x-auto">
        <table className="w-full text-left text-xs text-ink min-w-[1000px]">
          <thead className="bg-surface-raised border-b border-border text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Lead stage</th>
              <th className="p-3.5">Owner</th>
              <th className="p-3.5">Services taken</th>
              <th className="p-3.5 text-right">Business done</th>
              <th className="p-3.5 text-right">Balance</th>
              <th className="p-3.5 text-right">Enquiries</th>
              <th className="p-3.5 text-right">Tickets (open)</th>
              <th className="p-3.5">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {shown.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-text-secondary">{loading ? 'Loading…' : 'No customers yet. They appear here as soon as someone sends an enquiry or raises a ticket.'}</td></tr>
            )}
            {shown.map((r) => (
              <tr key={r.email} onClick={() => open(r.email)} className="hover:bg-surface-raised/40 cursor-pointer">
                <td className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.name} size="md" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.name}</div>
                      <div className="text-[11px] text-text-secondary truncate">{r.company ? `${r.company} · ` : ''}{r.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3.5 text-text-secondary">{r.lead_status ? human(r.lead_status) : '—'}</td>
                <td className="p-3.5 text-text-secondary">{r.owner_id ? staffName(staff, r.owner_id) : '—'}</td>
                <td className="p-3.5 text-text-secondary max-w-[180px] truncate" title={r.services.join(', ')}>{r.services.length ? r.services.join(', ') : '—'}</td>
                <td className="p-3.5 text-right tabular-nums">{r.total_business ? inr(r.total_business) : '—'}</td>
                <td className="p-3.5 text-right tabular-nums">{r.overdue ? <Chip tone="bad" icon={AlertTriangle}>{inr(r.overdue)} overdue</Chip> : r.outstanding ? inr(r.outstanding) : '—'}</td>
                <td className="p-3.5 text-right tabular-nums">{r.enquiry_count}</td>
                <td className="p-3.5 text-right tabular-nums">{r.ticket_count}{r.open_tickets ? <span className="text-text-secondary"> ({r.open_tickets})</span> : ''}</td>
                <td className="p-3.5 text-text-secondary">{ago(r.last_activity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer
        open={Boolean(profile)}
        onClose={() => setProfile(null)}
        title={profile?.name}
        subtitle={profile && <>{profile.company ? `${profile.company} · ` : ''}<a className="text-primary" href={`mailto:${profile.email}`}>{profile.email}</a> · first seen {fmtDate(profile.first_seen)}</>}
      >
        {profile && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[['Business done', inr(profile.total_business)], ['Received', inr(profile.paid)], ['Balance', inr(profile.outstanding)], ['Overdue', inr(profile.overdue)]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-border/80 bg-surface/60 p-3">
                  <div className="text-[11px] text-text-secondary">{k}</div>
                  <div className={`text-base font-bold tabular-nums ${k === 'Overdue' && profile.overdue ? 'text-red-300' : 'text-ink'}`}>{v}</div>
                </div>
              ))}
            </div>
            {profile.services.length > 0 && (
              <div className="text-xs text-text-secondary">Services taken: <span className="text-ink">{profile.services.join(' · ')}</span></div>
            )}

            {profile.projects.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">Projects & payments</h3>
                <div className="space-y-1.5">
                  {profile.projects.map((p) => (
                    <button key={p.id} onClick={() => onOpenProject(p.id)} className="w-full text-left rounded-xl border border-border bg-[#101217] hover:border-primary/50 px-3 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-ink font-semibold truncate">{p.title}</div>
                        <div className="text-[11px] text-text-secondary">{p.ref} · {inr(p.finance.value)} · received {inr(p.finance.paid)}</div>
                      </div>
                      <StatusChip p={p} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              {[['Enquiries', profile.enquiry_count], ['Tickets', profile.ticket_count], ['Open tickets', profile.open_tickets]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-border/80 bg-surface/60 p-3">
                  <div className="text-[11px] text-text-secondary">{k}</div>
                  <div className="text-lg font-bold text-ink tabular-nums">{v}</div>
                </div>
              ))}
            </div>

            {profile.enquiries.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">Enquiries</h3>
                <div className="space-y-1.5">
                  {profile.enquiries.map((e) => (
                    <button key={e.id} onClick={() => onOpenLead(e.id)} className="w-full text-left rounded-xl border border-border bg-[#101217] hover:border-primary/50 px-3 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-ink font-semibold truncate">{e.service_name}</div>
                        <div className="text-[11px] text-text-secondary">{e.reference_id} · {fmtDate(e.created_at)} · {staffName(staff, e.owner_id)}</div>
                      </div>
                      <span className="text-[11px] text-text-secondary shrink-0">{human(e.status)} →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {profile.tickets.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">Tickets</h3>
                <div className="space-y-1.5">
                  {profile.tickets.map((t) => (
                    <button key={t.id} onClick={() => onOpenTicket(t.id)} className="w-full text-left rounded-xl border border-border bg-[#101217] hover:border-primary/50 px-3 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-ink font-semibold truncate">{t.subject}</div>
                        <div className="text-[11px] text-text-secondary">{t.public_id} · {human(t.priority)} · {human(t.status)}</div>
                      </div>
                      <SlaBadge sla={t.sla} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2.5">Full history</h3>
              <ol className="relative border-l border-border/80 ml-2 space-y-4">
                {profile.timeline.map((ev, i) => {
                  const Icon = KIND_ICON[ev.kind] || StickyNote;
                  return (
                    <li key={`${ev.id}-${i}`} className="ml-4">
                      <span className="absolute -left-[9px] mt-0.5 w-[18px] h-[18px] rounded-full bg-surface-raised border border-border flex items-center justify-center"><Icon className="w-2.5 h-2.5 text-text-secondary" /></span>
                      <div className="text-[11px] text-text-secondary"><b className="text-ink font-semibold">{ev.title}</b> · {ev.ref}{ev.author ? ` · ${ev.author}` : ''} · {fmtDate(ev.at)}</div>
                      {ev.text && <p className="text-xs text-ink/90 whitespace-pre-wrap mt-1 line-clamp-4">{ev.text}</p>}
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
