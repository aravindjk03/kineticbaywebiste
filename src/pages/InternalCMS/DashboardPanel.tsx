import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, XCircle, Info, ArrowUpRight, ArrowDownRight, Mail } from 'lucide-react';
import { api } from '../../lib/api';
import { Notification, human, fmtHours, ago } from './crmShared';

interface Bucket { key: string; count: number }
interface Day { date: string; count: number }
interface TeamRow {
  id: string; name: string; role: string; leads_open: number; overdue_followups: number; contacts30: number;
  tickets_open: number; tickets_resolved30: number; avg_first_response_hours: number | null; last_login: string | null;
}
interface Dashboard {
  generated_at: string;
  leads: {
    today: number; last7: number; last30: number; prev30: number; open: number; won30: number; uncontacted: number;
    overdue_followups: number; avg_first_contact_hours: number | null; funnel: Bucket[]; by_status: Bucket[];
    by_source: Bucket[]; by_service: Bucket[]; daily: Day[];
  };
  tickets: {
    open: number; breached: number; at_risk: number; unassigned: number; created30: number; resolved30: number;
    avg_first_response_hours: number | null; response_target_met_pct: number | null; by_category: Bucket[]; by_priority: Bucket[]; daily: Day[];
  };
  website: { visits30: number; total_visits: number; unique_visitors: number; conversion_pct: number | null; top_pages: Bucket[] };
  content: { awaiting: number; published: number };
  actions: Notification[];
  team?: TeamRow[];
  health?: { emails_sent7: number; emails_failed7: number; failed_logins24: number; access_denied24: number; logins7: number; active_users: number };
}

/* ─── Building blocks ─── */

function Card({ title, children, action, className = '' }: { title: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border/80 bg-surface/60 p-4 ${className}`}>
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value, sub, onClick }: { label: string; value: React.ReactNode; sub?: React.ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`text-left rounded-2xl border border-border/80 bg-surface/60 p-4 ${onClick ? 'hover:border-primary/50 transition-colors' : ''}`}>
      <div className="text-[11px] text-text-secondary">{label}</div>
      <div className="text-2xl font-bold text-ink tabular-nums mt-1 leading-none">{value}</div>
      {sub && <div className="text-[11px] text-text-secondary mt-1.5">{sub}</div>}
    </Tag>
  );
}

function Trend({ now, prev }: { now: number; prev: number }) {
  if (!prev) return <span>{now ? 'first month with leads' : 'no leads yet'}</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  const Up = pct >= 0 ? ArrowUpRight : ArrowDownRight;
  return <span className="inline-flex items-center gap-0.5"><Up className="w-3 h-3" />{Math.abs(pct)}% vs previous 30 days</span>;
}

/** Single-hue daily column chart with a hover readout. */
function Columns({ data, label }: { data: Day[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  const h = hover != null ? data[hover] : null;
  return (
    <div>
      <div className="text-[11px] text-text-secondary h-4 mb-1.5">
        {h ? <><b className="text-ink tabular-nums">{h.count}</b> {label} on {new Date(h.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</> : <><b className="text-ink tabular-nums">{total}</b> {label} in the last 30 days</>}
      </div>
      <div className="flex items-end gap-[2px] h-28 border-b border-border/70" onMouseLeave={() => setHover(null)} role="img" aria-label={`${label} per day, last 30 days`}>
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 h-full flex items-end cursor-default" onMouseEnter={() => setHover(i)}>
            <div
              className={`w-full rounded-t-[3px] ${hover === i ? 'bg-primary' : 'bg-primary/65'}`}
              style={{ height: d.count ? `${Math.max(4, (d.count / max) * 100)}%` : '0%' }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-text-secondary/70 mt-1">
        <span>{data[0] && new Date(data[0].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** Horizontal single-hue bars, labelled directly. */
function Bars({ data, format = human, empty = 'Nothing yet' }: { data: Bucket[]; format?: (k: string) => string; empty?: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (!data.length) return <div className="text-xs text-text-secondary py-4">{empty}</div>;
  return (
    <ul className="space-y-2">
      {data.slice(0, 7).map((d) => (
        <li key={d.key} title={`${format(d.key)}: ${d.count}`}>
          <div className="flex justify-between text-[11px] mb-0.5">
            <span className="text-ink truncate pr-2">{format(d.key)}</span>
            <span className="text-text-secondary tabular-nums">{d.count}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-raised overflow-hidden">
            <div className="h-full rounded-full bg-primary/75" style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const STATUS_ICON = { critical: XCircle, warning: AlertTriangle, info: Info };
const STATUS_CLS = { critical: 'text-red-300', warning: 'text-amber-300', info: 'text-text-secondary' };

/* ─── Panel ─── */

export default function DashboardPanel({ userName, onNavigate, notify }: {
  userName: string; onNavigate: (tab: string, id?: string) => void; notify: (type: 'success' | 'error', message: string) => void;
}) {
  const [d, setD] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [digestBusy, setDigestBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setD((await api.getDashboard()).dashboard);
    } catch (e) {
      notify('error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const runDigest = async () => {
    setDigestBusy(true);
    try {
      const r = (await api.runDigest()).result;
      notify('success', r.sent ? `Digest emailed (${r.items} items)` : `Digest not sent: ${r.skipped || 'email failed'}`);
    } catch (e) {
      notify('error', (e as Error).message);
    } finally {
      setDigestBusy(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (!d) {
    return <div className="py-20 text-center text-xs text-text-secondary">{loading ? 'Loading dashboard…' : 'Dashboard unavailable.'}</div>;
  }
  const L = d.leads, T = d.tickets;
  const funnelTop = L.funnel[0]?.count || 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl text-ink">{greeting}, {userName.split(' ')[0]}</h2>
          <p className="text-xs text-text-secondary mt-0.5">Leads, customers and support at a glance · updated {ago(d.generated_at)}</p>
        </div>
        <div className="flex gap-2">
          {d.health && (
            <button onClick={runDigest} disabled={digestBusy} className="px-3 py-2 rounded-xl bg-surface-raised border border-border text-xs text-text-secondary hover:text-ink flex items-center gap-1.5 disabled:opacity-50">
              <Mail className="w-3.5 h-3.5" />Email today's digest now
            </button>
          )}
          <button onClick={load} className="px-3 py-2 rounded-xl bg-surface-raised border border-border text-xs text-text-secondary hover:text-ink flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="New leads · last 30 days" value={L.last30} sub={<Trend now={L.last30} prev={L.prev30} />} onClick={() => onNavigate('crm')} />
        <Stat label="Open leads" value={L.open} sub={<>{L.uncontacted} not contacted yet · {L.overdue_followups} follow-ups overdue</>} onClick={() => onNavigate('crm')} />
        <Stat label="Open tickets" value={T.open} sub={<>{T.breached} past target · {T.unassigned} unassigned</>} onClick={() => onNavigate('tickets')} />
        <Stat label="Won · last 30 days" value={L.won30} sub={<>{L.today} lead{L.today === 1 ? '' : 's'} today · {L.last7} this week</>} />
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        {/* Action list */}
        <Card title="Do these first" className="lg:col-span-1 lg:row-span-2" action={<span className="text-[11px] text-text-secondary tabular-nums">{d.actions.length}</span>}>
          {d.actions.length === 0 ? (
            <div className="text-xs text-text-secondary py-6 text-center">Nothing overdue. Nice work.</div>
          ) : (
            <ul className="space-y-1">
              {d.actions.map((n) => {
                const Icon = STATUS_ICON[n.severity];
                return (
                  <li key={n.id}>
                    <button onClick={() => onNavigate(n.link.tab, n.link.id)} className="w-full text-left flex gap-2.5 rounded-xl px-2.5 py-2 hover:bg-surface-raised/70">
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${STATUS_CLS[n.severity]}`} aria-label={n.severity} />
                      <span className="min-w-0">
                        <span className="block text-xs text-ink leading-snug">{n.title}</span>
                        <span className="block text-[11px] text-text-secondary truncate">{n.detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Leads per day" className="lg:col-span-2"><Columns data={L.daily} label="leads" /></Card>

        <Card title="Conversion funnel · last 30 days">
          {L.funnel.map((s) => (
            <div key={s.key} className="mb-2 last:mb-0" title={`${human(s.key)}: ${s.count}`}>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-ink">{human(s.key)}</span>
                <span className="text-text-secondary tabular-nums">{s.count}{funnelTop ? ` · ${Math.round((s.count / funnelTop) * 100)}%` : ''}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-raised overflow-hidden">
                <div className="h-full rounded-full bg-primary/75" style={{ width: `${funnelTop ? (s.count / funnelTop) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </Card>
        <Card title="Where leads come from"><Bars data={L.by_source} format={(k) => human(k)} empty="No leads in the last 30 days" /></Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Avg. time to first contact" value={fmtHours(L.avg_first_contact_hours)} sub="Target: within 24h" />
        <Stat label="Avg. first reply on tickets" value={fmtHours(T.avg_first_response_hours)} sub={T.response_target_met_pct == null ? 'No replies yet this month' : `${T.response_target_met_pct}% within target`} />
        <Stat label="Tickets resolved · 30 days" value={T.resolved30} sub={`${T.created30} raised`} />
        <Stat label="Website → lead conversion" value={d.website.conversion_pct == null ? '—' : `${d.website.conversion_pct}%`} sub={`${d.website.visits30} visits in 30 days`} onClick={() => onNavigate('analytics')} />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card title="Services requested · 30 days"><Bars data={L.by_service} format={(k) => k} /></Card>
        <Card title="Open tickets by category"><Bars data={T.by_category} empty="No open tickets" /></Card>
        <Card title="Tickets raised per day"><Columns data={T.daily} label="tickets" /></Card>
      </div>

      {d.team && (
        <Card title="Team performance · last 30 days">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="text-[11px] text-text-secondary">
                <tr className="border-b border-border">
                  <th className="text-left font-medium py-2 pr-3">Person</th>
                  <th className="text-right font-medium py-2 px-3">Open leads</th>
                  <th className="text-right font-medium py-2 px-3">Overdue follow-ups</th>
                  <th className="text-right font-medium py-2 px-3">Customer contacts</th>
                  <th className="text-right font-medium py-2 px-3">Open tickets</th>
                  <th className="text-right font-medium py-2 px-3">Resolved</th>
                  <th className="text-right font-medium py-2 px-3">Avg. first reply</th>
                  <th className="text-right font-medium py-2 pl-3">Last sign-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {d.team.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-3"><div className="text-ink font-medium">{u.name}</div><div className="text-[10px] text-text-secondary uppercase">{u.role.replace('_', ' ')}</div></td>
                    <td className="text-right tabular-nums px-3">{u.leads_open}</td>
                    <td className="text-right tabular-nums px-3">{u.overdue_followups ? <span className="inline-flex items-center gap-1 text-amber-300"><AlertTriangle className="w-3 h-3" />{u.overdue_followups}</span> : 0}</td>
                    <td className="text-right tabular-nums px-3">{u.contacts30}</td>
                    <td className="text-right tabular-nums px-3">{u.tickets_open}</td>
                    <td className="text-right tabular-nums px-3">{u.tickets_resolved30}</td>
                    <td className="text-right tabular-nums px-3">{fmtHours(u.avg_first_response_hours)}</td>
                    <td className="text-right text-text-secondary pl-3">{u.last_login ? ago(u.last_login) : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {d.health && (
        <Card title="System health" action={<button onClick={() => onNavigate('audit')} className="text-[11px] text-primary hover:underline">Audit log →</button>}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            {[
              ['Emails sent · 7d', d.health.emails_sent7, false],
              ['Emails failed · 7d', d.health.emails_failed7, d.health.emails_failed7 > 0],
              ['Sign-ins · 7d', d.health.logins7, false],
              ['Failed sign-ins · 24h', d.health.failed_logins24, d.health.failed_logins24 >= 5],
              ['Blocked actions · 24h', d.health.access_denied24, d.health.access_denied24 >= 5],
              ['Active staff', d.health.active_users, false],
            ].map(([k, v, warn]) => (
              <div key={k as string}>
                <div className="text-[11px] text-text-secondary">{k}</div>
                <div className="text-lg font-bold text-ink tabular-nums flex items-center gap-1.5">
                  {v as number}
                  {warn && <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-300"><AlertTriangle className="w-3 h-3" />check</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-text-secondary mt-3">{d.content.awaiting} content item{d.content.awaiting === 1 ? '' : 's'} waiting for review · {d.content.published} published</div>
        </Card>
      )}
    </div>
  );
}
