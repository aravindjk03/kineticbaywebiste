import { useEffect, useMemo, useState } from 'react';
import {
  Archive, ArrowLeft, Inbox, Mail, MailOpen, Paperclip, PenSquare, RefreshCw, Reply, ReplyAll, Search, Send,
  Settings2, Star, Trash2, UserPlus, FileSignature, Link2, Copy, Info,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Avatar, Drawer, fmtDate, human } from './crmShared';
import { PREVIEW_THREADS, PreviewThread, PreviewMessage } from './mailPreview';

type Notify = (type: 'success' | 'error', message: string) => void;
type Thread = Omit<PreviewThread, 'messages' | 'labels'> & { labels?: string[] };
type Message = PreviewMessage;
interface CrmLink { email: string; leads: { id: string; ref: string; status: string }[]; tickets: { id: string; ref: string; status: string }[]; projects: { id: string; ref: string; status: string }[] }
interface Account { email: string; roles: string[]; connected_at: string; connected_by_name: string }
interface Status { oauth_configured: boolean; redirect_uri: string; accounts: Account[]; can_manage: boolean }

const VIEWS = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'unread', label: 'Unread', icon: Mail },
  { key: 'proposals', label: 'Proposals & quotes', icon: FileSignature },
  { key: 'starred', label: 'Starred', icon: Star },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'all', label: 'All mail', icon: MailOpen },
];
const ROLE_LABEL: Record<string, string> = { super_admin: 'Super Admin', admin: 'Admin', marketing: 'Marketing' };
const field = 'w-full bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary/60';

const when = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

/** Email HTML is untrusted: render it in a sandbox with scripts disabled and links opening in a new tab. */
function HtmlBody({ html }: { html: string }) {
  const doc = `<!doctype html><html><head><base target="_blank"><meta name="referrer" content="no-referrer"><style>body{font:14px/1.55 -apple-system,Segoe UI,Arial,sans-serif;color:#1b1c20;margin:0;padding:14px;word-wrap:break-word}img{max-width:100%;height:auto}a{color:#c2552a}</style></head><body>${html}</body></html>`;
  const [h, setH] = useState(240);
  return (
    <iframe
      title="Email content"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      srcDoc={doc}
      className="w-full rounded-xl bg-white border border-border"
      style={{ height: h }}
      onLoad={(e) => { try { setH(Math.min(1400, Math.max(160, (e.currentTarget.contentDocument?.body.scrollHeight || 200) + 30))); } catch { /* cross-origin */ } }}
    />
  );
}

export default function MailPanel({ me, notify, onNavigate }: {
  me: { id: string; role: string; permissions: string[] };
  notify: Notify;
  onNavigate: (tab: string, id?: string) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [account, setAccount] = useState('');
  const [view, setView] = useState('inbox');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [open, setOpen] = useState<{ thread: Thread & { messages: Message[] }; crm: CrmLink[] } | null>(null);
  const [compose, setCompose] = useState<null | { to: string; cc: string; subject: string; body: string; thread_id?: string; in_reply_to?: string; references?: string }>(null);
  const [setup, setSetup] = useState(false);
  const [preview, setPreview] = useState<PreviewThread[]>(PREVIEW_THREADS);
  const can = (p: string) => me.role === 'super_admin' || me.permissions.includes(p);

  const isPreview = Boolean(status) && status!.accounts.length === 0;

  const loadStatus = async () => {
    try {
      const s: Status = await api.getMailStatus();
      setStatus(s);
      setAccount((a) => (s.accounts.some((x) => x.email === a) ? a : s.accounts[0]?.email || ''));
    } catch (e) {
      notify('error', (e as Error).message);
    }
  };
  useEffect(() => { loadStatus(); }, []);

  const loadThreads = async (more = false) => {
    if (!account) return;
    setLoading(true);
    try {
      const res = await api.getMailThreads(account, view, query, more ? next || undefined : undefined);
      setThreads((t) => (more ? [...t, ...res.threads] : res.threads));
      setNext(res.next_page);
    } catch (e) {
      notify('error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (account) { setOpenId(null); setOpen(null); loadThreads(); } }, [account, view, query]);

  // preview mode: filter the sample conversations locally
  const previewList = useMemo(() => {
    const s = query.toLowerCase();
    return preview.filter((t) => {
      const v = view === 'inbox' ? t.inbox && t.labels.includes('inbox') : view === 'unread' ? t.unread : view === 'starred' ? t.starred : view === 'sent' ? t.labels.includes('sent') : view === 'proposals' ? t.labels.includes('proposals') : true;
      return v && (!s || [t.subject, t.snippet, t.from.name, t.from.email].some((x) => x.toLowerCase().includes(s)));
    });
  }, [preview, view, query]);

  const list: Thread[] = isPreview ? previewList : threads;

  const openThread = async (id: string) => {
    setOpenId(id);
    if (isPreview) {
      const t = preview.find((x) => x.id === id)!;
      setPreview((p) => p.map((x) => (x.id === id ? { ...x, unread: false } : x)));
      setOpen({ thread: { ...t, unread: false }, crm: [] });
      return;
    }
    try {
      const res = await api.getMailThread(account, id);
      setOpen({ thread: res.thread, crm: res.crm || [] });
      setThreads((ts) => ts.map((x) => (x.id === id ? { ...x, unread: false } : x)));
    } catch (e) {
      notify('error', (e as Error).message);
    }
  };

  const act = async (action: string) => {
    if (!open) return;
    const id = open.thread.id;
    if (isPreview) {
      setPreview((p) => p.map((x) => (x.id !== id ? x : {
        ...x,
        starred: action === 'star' ? true : action === 'unstar' ? false : x.starred,
        unread: action === 'unread' ? true : x.unread,
        labels: action === 'archive' || action === 'trash' ? x.labels.filter((l) => l !== 'inbox') : x.labels,
        inbox: action === 'archive' || action === 'trash' ? false : x.inbox,
      })));
      if (['archive', 'trash', 'unread'].includes(action)) { setOpen(null); setOpenId(null); }
      else setOpen({ ...open, thread: { ...open.thread, starred: action === 'star' } });
      notify('success', `Preview: ${action === 'trash' ? 'moved to trash' : action === 'archive' ? 'archived' : action === 'unread' ? 'marked unread' : action === 'star' ? 'starred' : 'unstarred'} (nothing real changed)`);
      return;
    }
    try {
      await api.mailAction(account, id, action);
      if (['archive', 'trash', 'unread'].includes(action)) {
        setOpen(null); setOpenId(null);
        setThreads((ts) => (action === 'unread' ? ts.map((x) => (x.id === id ? { ...x, unread: true } : x)) : ts.filter((x) => x.id !== id)));
      } else {
        setOpen({ ...open, thread: { ...open.thread, starred: action === 'star' } });
        setThreads((ts) => ts.map((x) => (x.id === id ? { ...x, starred: action === 'star' } : x)));
      }
    } catch (e) {
      notify('error', (e as Error).message);
    }
  };

  const reply = (all: boolean) => {
    if (!open) return;
    const msgs = open.thread.messages;
    const last = [...msgs].reverse().find((m) => m.from.email !== account) || msgs[msgs.length - 1];
    const cc = all ? [last.to, last.cc].join(',').split(',').map((x) => x.trim()).filter((x) => x && !x.includes(account) && !x.includes(last.from.email)).join(', ') : '';
    const quoted = (last.text || last.snippet || '').split('\n').map((l) => `> ${l}`).join('\n');
    setCompose({
      to: last.from.email, cc,
      subject: /^re:/i.test(open.thread.subject) ? open.thread.subject : `Re: ${open.thread.subject}`,
      body: `\n\nOn ${fmtDate(last.date)}, ${last.from.name} wrote:\n${quoted}`,
      thread_id: open.thread.id, in_reply_to: last.message_id, references: last.references,
    });
  };

  const send = async () => {
    if (!compose) return;
    if (isPreview) { notify('error', 'This is the preview: sending is switched off until a real Gmail account is connected.'); return; }
    try {
      const res = await api.sendMail({ account, ...compose });
      notify('success', res.logged_on_leads?.length ? `Sent, and logged on lead ${res.logged_on_leads.join(', ')}` : 'Email sent');
      setCompose(null);
      if (open && compose.thread_id === open.thread.id) openThread(open.thread.id);
      else loadThreads();
    } catch (e) {
      notify('error', (e as Error).message);
    }
  };

  const toLead = async () => {
    if (!open) return;
    if (isPreview) { notify('error', 'Preview: connect Gmail to turn real emails into leads.'); return; }
    try {
      const res = await api.mailToLead(account, open.thread.id);
      notify('success', `Lead ${res.enquiry.reference_id} created and assigned`);
      openThread(open.thread.id);
    } catch (e) {
      notify('error', (e as Error).message);
    }
  };

  if (!status) return <div className="py-20 text-center text-xs text-text-secondary">Loading mail…</div>;

  const crmFor = open?.crm.filter((c) => c.leads.length || c.tickets.length || c.projects.length) || [];
  const unknownSender = open && !isPreview && open.crm.length > 0 && crmFor.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl text-ink">Inbox</h2>
          <p className="text-xs text-text-secondary mt-0.5">Kinetic Bay Gmail inside the CMS: read, reply and turn proposals into leads without leaving the platform.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status.accounts.length > 1 && (
            <select value={account} onChange={(e) => setAccount(e.target.value)} className="bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs text-ink" aria-label="Mailbox">
              {status.accounts.map((a) => <option key={a.email} value={a.email}>{a.email}</option>)}
            </select>
          )}
          {status.accounts.length === 1 && <span className="text-xs text-text-secondary px-2">{account}</span>}
          {status.can_manage && (
            <button onClick={() => setSetup(true)} className="px-3 py-2 rounded-xl bg-surface-raised border border-border text-xs text-text-secondary hover:text-ink flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" />Mailboxes</button>
          )}
          {can('mail:send') && (
            <button onClick={() => setCompose({ to: '', cc: '', subject: '', body: '' })} className="px-3 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold flex items-center gap-1.5"><PenSquare className="w-3.5 h-3.5" />Compose</button>
          )}
        </div>
      </div>

      {isPreview && (
        <div className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-xs text-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="flex items-start gap-2"><Info className="w-4 h-4 text-primary shrink-0 mt-0.5" /><span><b>Preview with sample emails.</b> Nothing here is real, and sending is switched off. This is how your Kinetic Bay mailbox will look once it is connected.</span></span>
          {status.can_manage
            ? <button onClick={() => setSetup(true)} className="px-3 py-1.5 rounded-lg bg-primary text-ink font-semibold shrink-0">Connect Gmail</button>
            : <span className="text-text-secondary shrink-0">Ask a Super Admin to connect Gmail.</span>}
        </div>
      )}

      <div className="rounded-2xl border border-border/80 bg-surface/60 overflow-hidden grid lg:grid-cols-[190px_minmax(280px,380px)_1fr] min-h-[620px]">
        {/* Views */}
        <nav className={`border-b lg:border-b-0 lg:border-r border-border p-2 flex lg:flex-col gap-1 overflow-x-auto ${openId ? 'hidden lg:flex' : ''}`}>
          {VIEWS.map((v) => {
            const Icon = v.icon;
            const count = isPreview && v.key === 'unread' ? preview.filter((t) => t.unread).length : 0;
            return (
              <button key={v.key} onClick={() => setView(v.key)} className={`shrink-0 flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs ${view === v.key ? 'bg-primary text-ink font-semibold' : 'text-text-secondary hover:bg-surface-raised hover:text-ink'}`}>
                <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{v.label}</span>
                {count > 0 && <span className="text-[10px] tabular-nums">{count}</span>}
              </button>
            );
          })}
        </nav>

        {/* Thread list */}
        <section className={`border-b lg:border-b-0 lg:border-r border-border flex flex-col min-h-0 ${openId ? 'hidden lg:flex' : 'flex'}`}>
          <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }} className="p-2 border-b border-border flex gap-1.5">
            <label className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail" className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface-raised border border-border text-xs text-ink focus:outline-none focus:border-primary/60" />
            </label>
            <button type="button" onClick={() => (isPreview ? setPreview(PREVIEW_THREADS) : loadThreads())} title="Refresh" className="p-2 rounded-xl bg-surface-raised border border-border text-text-secondary hover:text-ink"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          </form>
          <ul className="flex-1 overflow-y-auto divide-y divide-border/60 max-h-[70vh]">
            {list.length === 0 && <li className="p-8 text-center text-xs text-text-secondary">{loading ? 'Loading…' : 'No conversations here.'}</li>}
            {list.map((t) => (
              <li key={t.id}>
                <button onClick={() => openThread(t.id)} className={`w-full text-left px-3 py-3 flex gap-2.5 ${openId === t.id ? 'bg-primary/10' : 'hover:bg-surface-raised/60'}`}>
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${t.unread ? 'bg-primary' : ''}`} aria-label={t.unread ? 'Unread' : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`text-xs truncate ${t.unread ? 'text-ink font-bold' : 'text-ink/90'}`}>{t.participants.join(', ')}{t.count > 1 ? <span className="text-text-secondary font-normal"> ({t.count})</span> : ''}</span>
                      <span className="text-[10px] text-text-secondary shrink-0">{when(t.date)}</span>
                    </span>
                    <span className={`block text-xs truncate ${t.unread ? 'text-ink font-semibold' : 'text-ink/80'}`}>{t.subject}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px] text-text-secondary truncate flex-1">{t.snippet}</span>
                      {t.has_attachments && <Paperclip className="w-3 h-3 text-text-secondary shrink-0" aria-label="Has attachments" />}
                      {t.starred && <Star className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" aria-label="Starred" />}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {!isPreview && next && (
              <li className="p-3 text-center"><button onClick={() => loadThreads(true)} className="text-xs text-primary">Load more</button></li>
            )}
          </ul>
        </section>

        {/* Reading pane */}
        <section className={`min-w-0 flex-col ${openId ? 'flex' : 'hidden lg:flex'}`}>
          {!open ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-text-secondary">
              <MailOpen className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-xs">Select a conversation to read it.</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-1.5">
                <button onClick={() => { setOpenId(null); setOpen(null); }} className="lg:hidden p-1.5 rounded-lg text-text-secondary hover:text-ink" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>
                {can('mail:send') && <button onClick={() => reply(false)} className="px-2.5 py-1.5 rounded-lg bg-primary text-ink text-xs font-semibold flex items-center gap-1"><Reply className="w-3.5 h-3.5" />Reply</button>}
                {can('mail:send') && <button onClick={() => reply(true)} className="px-2.5 py-1.5 rounded-lg bg-surface-raised border border-border text-xs text-ink flex items-center gap-1"><ReplyAll className="w-3.5 h-3.5" />Reply all</button>}
                <button onClick={() => act(open.thread.starred ? 'unstar' : 'star')} title={open.thread.starred ? 'Unstar' : 'Star'} className="p-1.5 rounded-lg text-text-secondary hover:text-ink"><Star className={`w-4 h-4 ${open.thread.starred ? 'text-amber-300 fill-amber-300' : ''}`} /></button>
                <button onClick={() => act('archive')} title="Archive" className="p-1.5 rounded-lg text-text-secondary hover:text-ink"><Archive className="w-4 h-4" /></button>
                <button onClick={() => act('unread')} title="Mark unread" className="p-1.5 rounded-lg text-text-secondary hover:text-ink"><Mail className="w-4 h-4" /></button>
                {can('mail:send') && <button onClick={() => confirm('Move this conversation to Gmail trash?') && act('trash')} title="Move to trash" className="p-1.5 rounded-lg text-text-secondary hover:text-red-300"><Trash2 className="w-4 h-4" /></button>}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[72vh]">
                <h3 className="font-heading font-bold text-base text-ink">{open.thread.subject}</h3>

                {/* CRM links */}
                {(crmFor.length > 0 || unknownSender || isPreview) && (
                  <div className="rounded-xl border border-border bg-surface-raised/40 px-3 py-2.5 text-[11px] flex flex-wrap items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-primary" />
                    {crmFor.map((c) => (
                      <span key={c.email} className="flex flex-wrap items-center gap-1.5">
                        <button onClick={() => onNavigate('customers', c.email)} className="text-primary hover:underline">{c.email}</button>
                        {c.leads.map((l) => <button key={l.id} onClick={() => onNavigate('crm', l.id)} className="px-1.5 py-0.5 rounded border border-border text-ink hover:border-primary/50">Lead {l.ref} · {human(l.status)}</button>)}
                        {c.tickets.map((t) => <button key={t.id} onClick={() => onNavigate('tickets', t.id)} className="px-1.5 py-0.5 rounded border border-border text-ink hover:border-primary/50">Ticket {t.ref}</button>)}
                        {c.projects.map((p) => <button key={p.id} onClick={() => onNavigate('projects', p.id)} className="px-1.5 py-0.5 rounded border border-border text-ink hover:border-primary/50">Project {p.ref}</button>)}
                      </span>
                    ))}
                    {(unknownSender || isPreview) && (
                      <span className="flex items-center gap-2">
                        <span className="text-text-secondary">{isPreview ? 'Real emails are matched to your leads, tickets and projects here.' : 'This sender is not in the CRM yet.'}</span>
                        {can('enquiries:update') && <button onClick={toLead} className="px-2 py-1 rounded-lg bg-primary text-ink font-semibold flex items-center gap-1"><UserPlus className="w-3 h-3" />Create lead</button>}
                      </span>
                    )}
                  </div>
                )}

                {open.thread.messages.map((m, i) => (
                  <article key={m.id} className="rounded-2xl border border-border bg-[#101217] p-4 space-y-3">
                    <header className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={m.from.name} size="md" />
                        <div className="min-w-0">
                          <div className="text-xs text-ink font-semibold truncate">{m.from.name} <span className="text-text-secondary font-normal">&lt;{m.from.email}&gt;</span></div>
                          <div className="text-[11px] text-text-secondary truncate">to {m.to}{m.cc ? `, cc ${m.cc}` : ''}</div>
                        </div>
                      </div>
                      <span className="text-[11px] text-text-secondary shrink-0">{fmtDate(m.date)}</span>
                    </header>
                    {m.html && !isPreview
                      ? <HtmlBody html={m.html} />
                      : <div className={`text-[13px] leading-relaxed whitespace-pre-wrap ${i === open.thread.messages.length - 1 ? 'text-ink' : 'text-ink/80'}`}>{m.text || m.snippet}</div>}
                    {m.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {m.attachments.map((a) => (
                          isPreview
                            ? <span key={a.id} className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] text-ink flex items-center gap-1.5"><Paperclip className="w-3 h-3" />{a.name} · {kb(a.size)}</span>
                            : <a key={a.id} href={api.mailAttachmentUrl(account, m.id, a.id, a.name)} className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] text-ink hover:border-primary/50 flex items-center gap-1.5"><Paperclip className="w-3 h-3" />{a.name} · {kb(a.size)}</a>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Compose */}
      <Drawer open={Boolean(compose)} onClose={() => setCompose(null)} title={compose?.thread_id ? 'Reply' : 'New email'} subtitle={isPreview ? 'Preview: sending is switched off' : `From ${account}`}>
        {compose && (
          <div className="space-y-3">
            <label className="block space-y-1"><span className="text-[11px] text-text-secondary">To</span><input className={field} value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} placeholder="name@company.com, another@company.com" /></label>
            <label className="block space-y-1"><span className="text-[11px] text-text-secondary">Cc</span><input className={field} value={compose.cc} onChange={(e) => setCompose({ ...compose, cc: e.target.value })} /></label>
            <label className="block space-y-1"><span className="text-[11px] text-text-secondary">Subject</span><input className={field} value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} /></label>
            <textarea rows={14} className={field} value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} autoFocus />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-text-secondary">If the recipient is an open lead, this email is logged on their timeline.</span>
              <button onClick={send} className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />Send</button>
            </div>
          </div>
        )}
      </Drawer>

      {setup && <MailboxSetup status={status} notify={notify} onClose={() => setSetup(false)} onChanged={loadStatus} />}
    </div>
  );
}

/* ═══════════════════════════ Mailbox setup (Super Admin) ═══════════════════════════ */

function MailboxSetup({ status, notify, onClose, onChanged }: { status: Status; notify: Notify; onClose: () => void; onChanged: () => void }) {
  const [roles, setRoles] = useState<string[]>(['super_admin', 'admin', 'marketing']);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    try {
      const { url } = await api.startMailConnect(roles, hint || undefined);
      window.location.href = url; // Google consent screen; it returns to the CMS
    } catch (e) {
      notify('error', (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Drawer open onClose={onClose} title="Mailboxes" subtitle="Connect Kinetic Bay Gmail accounts and choose which roles can see each one">
      {!status.oauth_configured && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-ink space-y-2">
          <b className="flex items-center gap-1.5"><Info className="w-4 h-4 text-amber-300" />One-time Google setup needed</b>
          <ol className="list-decimal pl-5 space-y-1 text-text-secondary">
            <li>In Google Cloud Console, create a project and enable the <b className="text-ink">Gmail API</b>.</li>
            <li>Set up the OAuth consent screen and add your Kinetic Bay Gmail addresses as test users.</li>
            <li>Create an OAuth client of type <b className="text-ink">Web application</b> with this redirect URI:</li>
          </ol>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-bg border border-border px-2 py-1.5 text-[11px] text-ink">{status.redirect_uri}</code>
            <button onClick={() => { navigator.clipboard.writeText(status.redirect_uri); notify('success', 'Redirect URI copied'); }} className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-ink" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
          </div>
          <p className="text-text-secondary">Then send the Client ID and Client Secret to your developer to add to Cloudflare (as <code>GOOGLE_CLIENT_ID</code> and the secret <code>GOOGLE_CLIENT_SECRET</code>).</p>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Connected</h3>
        {status.accounts.length === 0 && <div className="text-xs text-text-secondary">No mailbox connected yet: the Inbox is showing sample emails.</div>}
        {status.accounts.map((a) => (
          <div key={a.email} className="rounded-xl border border-border bg-[#101217] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-ink font-semibold truncate">{a.email}</div>
                <div className="text-[11px] text-text-secondary">connected by {a.connected_by_name} · {fmtDate(a.connected_at)}</div>
              </div>
              <button disabled={busy} onClick={async () => { if (!confirm(`Disconnect ${a.email}? The CMS will lose access to it.`)) return; setBusy(true); try { await api.disconnectMailbox(a.email); notify('success', 'Mailbox disconnected'); onChanged(); } catch (e) { notify('error', (e as Error).message); } finally { setBusy(false); } }} className="text-[11px] text-text-secondary hover:text-red-300">Disconnect</button>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-text-secondary">
              Visible to:
              {Object.entries(ROLE_LABEL).map(([r, label]) => (
                <label key={r} className="flex items-center gap-1">
                  <input
                    type="checkbox" disabled={busy || r === 'super_admin'} checked={r === 'super_admin' || a.roles.includes(r)}
                    onChange={async (e) => { setBusy(true); try { await api.updateMailbox(a.email, e.target.checked ? [...a.roles, r] : a.roles.filter((x) => x !== r)); onChanged(); } catch (err) { notify('error', (err as Error).message); } finally { setBusy(false); } }}
                  />{label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/80 bg-surface/60 p-4 space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Connect a Gmail account</h3>
        <label className="block space-y-1"><span className="text-[11px] text-text-secondary">Gmail address (optional, pre-selects the account on Google)</span><input className={field} value={hint} onChange={(e) => setHint(e.target.value)} placeholder="kineticbay@gmail.com" /></label>
        <div className="flex flex-wrap gap-3 text-[11px] text-text-secondary">
          Who can see it:
          {Object.entries(ROLE_LABEL).map(([r, label]) => (
            <label key={r} className="flex items-center gap-1">
              <input type="checkbox" disabled={r === 'super_admin'} checked={roles.includes(r)} onChange={(e) => setRoles(e.target.checked ? [...roles, r] : roles.filter((x) => x !== r))} />{label}
            </label>
          ))}
        </div>
        <p className="text-[11px] text-text-secondary">You’ll be taken to Google to sign in and allow access, then brought back here. The CMS stores an encrypted access key, never the password.</p>
        <button disabled={busy || !status.oauth_configured} onClick={connect} className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold disabled:opacity-50">Continue to Google</button>
      </div>
    </Drawer>
  );
}
