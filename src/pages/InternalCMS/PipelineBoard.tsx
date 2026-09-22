import { useEffect, useMemo, useState } from 'react';
import { Download, Mail, MessageCircle, Phone, RefreshCw, Search, Send, StickyNote, Users as UsersIcon, CalendarClock, UserRound } from 'lucide-react';
import { api } from '../../lib/api';
import {
  Lead, LeadActivity, StaffMember, LEAD_STAGES, human, ago, fmtDate, staffName,
  ClockChip, FollowUpChip, Avatar, Drawer,
} from './crmShared';

type Feedback = (type: 'success' | 'error', message: string) => void;

const ACTIVITY_ICON: Record<string, typeof Phone> = { call: Phone, meeting: UsersIcon, whatsapp: MessageCircle, email: Mail, note: StickyNote, status: RefreshCw, owner: UserRound };

function csv(leads: Lead[], staff: StaffMember[]) {
  const cols = ['Reference', 'Name', 'Email', 'Company', 'Service', 'Source', 'Stage', 'Owner', 'Follow-up', 'Created'];
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = leads.map((l) => [l.reference_id, l.name, l.email, l.company, l.service_name, l.source || '', human(l.status), staffName(staff, l.owner_id), l.follow_up_at || '', l.created_at].map(esc).join(','));
  const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kineticbay-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ═══════════════════════════ Pipeline board ═══════════════════════════ */

export default function PipelineBoard({ staff, meId, canEdit, notify, focusId, onOpenCustomer }: {
  staff: StaffMember[]; meId: string; canEdit: boolean; notify: Feedback; focusId?: string | null; onOpenCustomer: (email: string) => void;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState<'all' | 'me' | 'none'>('all');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getCmsEnquiries();
      setLeads(res.enquiries || []);
    } catch (e) {
      notify('error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (focusId) setOpenId(focusId); }, [focusId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) =>
      (owner === 'all' || (owner === 'me' ? l.owner_id === meId : !l.owner_id))
      && (!q || [l.name, l.email, l.company, l.service_name, l.reference_id].some((f) => (f || '').toLowerCase().includes(q))));
  }, [leads, search, owner, meId]);

  const replace = (lead: Lead) => setLeads((ls) => ls.map((l) => (l.id === lead.id ? lead : l)));

  const move = async (id: string, status: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === status) return;
    replace({ ...lead, status }); // optimistic
    try {
      const res = await api.updateLead(id, { status });
      replace(res.enquiry);
      notify('success', `${lead.name} moved to ${human(status)}`);
    } catch (e) {
      replace(lead);
      notify('error', (e as Error).message);
    }
  };

  const openLead = leads.find((l) => l.id === openId) || null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-xl text-ink">Sales pipeline</h2>
          <p className="text-xs text-text-secondary mt-0.5">Every website and chatbot enquiry as a card. Drag a card to move it through the stages; click it to reply, log a call or set a follow-up.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads" className="pl-8 pr-3 py-2 rounded-xl bg-surface-raised border border-border text-xs text-ink w-48 focus:outline-none focus:border-primary/60" />
          </label>
          <div className="flex rounded-xl border border-border overflow-hidden text-xs">
            {([['all', 'All'], ['me', 'Mine'], ['none', 'Unassigned']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setOwner(k)} className={`px-3 py-2 ${owner === k ? 'bg-primary text-ink font-semibold' : 'bg-surface-raised text-text-secondary hover:text-ink'}`}>{label}</button>
            ))}
          </div>
          <button onClick={load} className="p-2 rounded-xl bg-surface-raised border border-border text-text-secondary hover:text-ink" title="Refresh"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => csv(visible, staff)} className="px-3 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Export CSV</button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x">
        {LEAD_STAGES.map((stage) => {
          const cards = visible.filter((l) => l.status === stage.key);
          return (
            <section
              key={stage.key}
              onDragOver={(e) => { if (canEdit && dragId) { e.preventDefault(); setOverStage(stage.key); } }}
              onDragLeave={() => setOverStage((s) => (s === stage.key ? null : s))}
              onDrop={(e) => { e.preventDefault(); setOverStage(null); if (dragId) move(dragId, stage.key); setDragId(null); }}
              className={`snap-start shrink-0 w-[260px] rounded-2xl border p-2.5 flex flex-col max-h-[70vh] transition-colors ${overStage === stage.key ? 'border-primary/70 bg-primary/5' : 'border-border/80 bg-surface/60'}`}
              aria-label={`${stage.label} stage`}
            >
              <header className="flex items-center justify-between px-1.5 pb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{stage.label}</span>
                <span className="text-[11px] font-semibold text-ink tabular-nums">{cards.length}</span>
              </header>
              <div className="space-y-2 overflow-y-auto pr-0.5">
                {cards.length === 0 && <div className="text-[11px] text-text-secondary/60 text-center py-6 border border-dashed border-border/60 rounded-xl">{canEdit ? 'Drop a card here' : 'No leads'}</div>}
                {cards.map((l) => (
                  <article
                    key={l.id}
                    draggable={canEdit}
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => { setDragId(null); setOverStage(null); }}
                    onClick={() => setOpenId(l.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(l.id); }}
                    tabIndex={0}
                    className={`rounded-xl border border-border bg-[#101217] hover:border-primary/50 p-3 cursor-pointer space-y-2 focus:outline-none focus:border-primary ${dragId === l.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink truncate">{l.name}</div>
                        <div className="text-[11px] text-text-secondary truncate">{l.company || l.email}</div>
                      </div>
                      {l.owner_id ? <Avatar name={staffName(staff, l.owner_id)} /> : <span className="text-[9px] text-text-secondary/70 border border-dashed border-border rounded-full px-1.5 py-0.5">No owner</span>}
                    </div>
                    <div className="text-[11px] text-text-secondary truncate">{l.service_name}</div>
                    <div className="flex flex-wrap gap-1">
                      {!l.first_response_at && !['WON', 'LOST'].includes(l.status) && <ClockChip clock={l.response_clock} verb={{ pending: 'Contact', done: 'Contacted' }} />}
                      {!['WON', 'LOST'].includes(l.status) && <FollowUpChip at={l.follow_up_at} />}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-text-secondary/70">
                      <span className="uppercase tracking-wide">{l.source || 'website'}</span>
                      <span>{ago(l.created_at)}</span>
                    </div>
                    {canEdit && (
                      // keyboard / touch alternative to drag-and-drop
                      <select
                        aria-label="Move to stage"
                        value={l.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => move(l.id, e.target.value)}
                        className="w-full bg-surface-raised border border-border rounded-lg text-[11px] text-text-secondary px-2 py-1 md:hidden"
                      >
                        {LEAD_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <LeadDrawer lead={openLead} staff={staff} canEdit={canEdit} notify={notify} onClose={() => setOpenId(null)} onUpdated={replace} onOpenCustomer={onOpenCustomer} />
    </div>
  );
}

/* ═══════════════════════════ Lead drawer ═══════════════════════════ */

const plusDays = (d: number) => { const t = new Date(); t.setDate(t.getDate() + d); t.setHours(10, 0, 0, 0); return t; };
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function LeadDrawer({ lead, staff, canEdit, notify, onClose, onUpdated, onOpenCustomer }: {
  lead: Lead | null; staff: StaffMember[]; canEdit: boolean; notify: Feedback; onClose: () => void; onUpdated: (l: Lead) => void; onOpenCustomer?: (email: string) => void;
}) {
  const [mode, setMode] = useState<'reply' | 'log'>('reply');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [logType, setLogType] = useState<'call' | 'meeting' | 'whatsapp' | 'note'>('call');
  const [logText, setLogText] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setSubject(`Re: your enquiry about ${lead.service_name}`);
    setMessage('');
    setLogText('');
    setNotes(lead.notes || '');
  }, [lead?.id]);

  if (!lead) return null;

  const patch = async (data: Parameters<typeof api.updateLead>[1], ok: string) => {
    setBusy(true);
    try {
      const res = await api.updateLead(lead.id, data);
      onUpdated(res.enquiry);
      notify('success', ok);
    } catch (e) {
      notify('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      const res = await api.replyToLead(lead.id, subject, message);
      onUpdated(res.enquiry);
      setMessage('');
      notify('success', `Email sent to ${lead.email}`);
    } catch (e) {
      notify('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const logActivity = async () => {
    if (!logText.trim()) return;
    setBusy(true);
    try {
      const res = await api.logLeadActivity(lead.id, logType, logText);
      onUpdated(res.enquiry);
      setLogText('');
      notify('success', `${human(logType)} logged`);
    } catch (e) {
      notify('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const timeline: LeadActivity[] = [
    ...(lead.activities || []),
    { id: 'origin', type: 'note' as const, text: lead.message, author_id: null, author_name: lead.name, at: lead.created_at, subject: 'Original enquiry' },
  ].sort((a, b) => b.at.localeCompare(a.at));

  const field = 'w-full bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary/60 disabled:opacity-60';
  const closed = ['WON', 'LOST'].includes(lead.status);

  return (
    <Drawer
      open
      onClose={onClose}
      title={lead.name}
      subtitle={<span className="font-mono">{lead.reference_id}</span>}
    >
      {/* Contact summary */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div><div className="text-text-secondary text-[11px]">Email</div><a href={`mailto:${lead.email}`} className="text-primary break-all">{lead.email}</a></div>
        <div><div className="text-text-secondary text-[11px]">Company</div><div className="text-ink">{lead.company || '—'}</div></div>
        <div><div className="text-text-secondary text-[11px]">Interested in</div><div className="text-ink">{lead.service_name}</div></div>
        <div><div className="text-text-secondary text-[11px]">Source</div><div className="text-ink capitalize">{lead.source || 'website'}</div></div>
        <div><div className="text-text-secondary text-[11px]">Budget / timeline</div><div className="text-ink">{lead.budget_range} · {lead.timeline}</div></div>
        <div><div className="text-text-secondary text-[11px]">Came in</div><div className="text-ink">{fmtDate(lead.created_at)}</div></div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {!lead.first_response_at && !closed && <ClockChip clock={lead.response_clock} verb={{ pending: 'Contact', done: 'Contacted' }} />}
        {!closed && <FollowUpChip at={lead.follow_up_at} />}
        {lead.last_contacted_at && <span className="text-[11px] text-text-secondary">Last contacted {ago(lead.last_contacted_at)}</span>}
        {onOpenCustomer && <button onClick={() => onOpenCustomer(lead.email)} className="text-[11px] text-primary hover:underline ml-auto">Open customer profile →</button>}
      </div>

      {/* Ownership */}
      <div className="grid sm:grid-cols-3 gap-3 rounded-2xl border border-border/80 bg-surface/60 p-3.5">
        <label className="space-y-1">
          <span className="text-[11px] text-text-secondary">Stage</span>
          <select disabled={!canEdit || busy} value={lead.status} onChange={(e) => patch({ status: e.target.value }, `Moved to ${human(e.target.value)}`)} className={field}>
            {LEAD_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-text-secondary">Owner</span>
          <select disabled={!canEdit || busy} value={lead.owner_id || ''} onChange={(e) => patch({ owner_id: e.target.value || null }, 'Owner updated')} className={field}>
            <option value="">Unassigned</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-text-secondary flex items-center gap-1"><CalendarClock className="w-3 h-3" />Follow up on</span>
          <input
            type="datetime-local"
            disabled={!canEdit || busy}
            value={toLocalInput(lead.follow_up_at)}
            onChange={(e) => patch({ follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null }, 'Follow-up date saved')}
            className={field}
          />
        </label>
        {canEdit && (
          <div className="sm:col-span-3 flex flex-wrap gap-1.5">
            {[['Tomorrow', 1], ['In 3 days', 3], ['Next week', 7]].map(([label, d]) => (
              <button key={label} disabled={busy} onClick={() => patch({ follow_up_at: plusDays(d as number).toISOString() }, `Follow-up set for ${label.toString().toLowerCase()}`)} className="px-2.5 py-1 rounded-lg bg-surface-raised border border-border text-[11px] text-text-secondary hover:text-ink">{label}</button>
            ))}
            {lead.follow_up_at && <button disabled={busy} onClick={() => patch({ follow_up_at: null }, 'Follow-up cleared')} className="px-2.5 py-1 rounded-lg text-[11px] text-text-secondary hover:text-ink">Clear</button>}
          </div>
        )}
      </div>

      {/* Act */}
      {canEdit && (
        <div className="rounded-2xl border border-border/80 bg-surface/60 overflow-hidden">
          <div className="flex border-b border-border text-xs">
            <button onClick={() => setMode('reply')} className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 ${mode === 'reply' ? 'text-ink font-semibold bg-surface-raised' : 'text-text-secondary'}`}><Mail className="w-3.5 h-3.5" />Email reply</button>
            <button onClick={() => setMode('log')} className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 ${mode === 'log' ? 'text-ink font-semibold bg-surface-raised' : 'text-text-secondary'}`}><Phone className="w-3.5 h-3.5" />Log call / meeting / note</button>
          </div>
          <div className="p-3.5 space-y-2.5">
            {mode === 'reply' ? (
              <>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={field} placeholder="Subject" />
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className={field} placeholder={`Hi ${lead.name.split(' ')[0]}, thanks for reaching out…`} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-text-secondary">Sent from kineticbay@gmail.com · replies come back to the team inbox · logged below.</span>
                  <button disabled={busy || !message.trim()} onClick={sendReply} className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><Send className="w-3.5 h-3.5" />Send</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-1.5">
                  {(['call', 'meeting', 'whatsapp', 'note'] as const).map((t) => {
                    const Icon = ACTIVITY_ICON[t];
                    return <button key={t} onClick={() => setLogType(t)} className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-1 ${logType === t ? 'border-primary/60 text-ink bg-primary/10' : 'border-border text-text-secondary'}`}><Icon className="w-3 h-3" />{t === 'whatsapp' ? 'WhatsApp' : human(t)}</button>;
                  })}
                </div>
                <textarea value={logText} onChange={(e) => setLogText(e.target.value)} rows={4} className={field} placeholder={logType === 'note' ? 'Internal note (not sent to the customer)' : 'What was discussed? Next steps?'} />
                <div className="flex justify-end">
                  <button disabled={busy || !logText.trim()} onClick={logActivity} className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold disabled:opacity-50">Save to timeline</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2.5">Timeline</h3>
        <ol className="relative border-l border-border/80 ml-2 space-y-4">
          {timeline.map((a) => {
            const Icon = a.id === 'origin' ? Mail : ACTIVITY_ICON[a.type] || StickyNote;
            return (
              <li key={a.id} className="ml-4">
                <span className="absolute -left-[9px] mt-0.5 w-[18px] h-[18px] rounded-full bg-surface-raised border border-border flex items-center justify-center"><Icon className="w-2.5 h-2.5 text-text-secondary" /></span>
                <div className="text-[11px] text-text-secondary">
                  <b className="text-ink font-semibold">{a.id === 'origin' ? 'Enquiry received' : a.type === 'email' ? `Email: ${a.subject || ''}` : a.type === 'status' || a.type === 'owner' ? a.text : human(a.type)}</b>
                  {' · '}{a.author_name} · {fmtDate(a.at)}
                </div>
                {a.type !== 'status' && a.type !== 'owner' && <p className="text-xs text-ink/90 whitespace-pre-wrap mt-1 leading-relaxed">{a.text}</p>}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Private notes */}
      <label className="block space-y-1">
        <span className="text-[11px] text-text-secondary">Private notes</span>
        <textarea disabled={!canEdit} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (lead.notes || '') && patch({ notes }, 'Notes saved')} rows={3} className={field} placeholder="Anything the team should know (saved when you click away)" />
      </label>
    </Drawer>
  );
}
