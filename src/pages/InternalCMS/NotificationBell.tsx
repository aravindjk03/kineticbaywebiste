import { useEffect, useRef, useState } from 'react';
import { Bell, AlertTriangle, XCircle, Info } from 'lucide-react';
import { api } from '../../lib/api';
import { Notification, ago } from './crmShared';

const SEVERITY = {
  critical: { icon: XCircle, cls: 'text-red-300', label: 'Overdue' },
  warning: { icon: AlertTriangle, cls: 'text-amber-300', label: 'Needs attention' },
  info: { icon: Info, cls: 'text-text-secondary', label: 'New' },
};

/** Header bell: polls every minute, marks everything seen when opened. */
export default function NotificationBell({ onNavigate }: { onNavigate: (tab: string, id?: string) => void }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await api.getNotifications();
      setItems(res.items || []);
      setUnread(res.unread || 0);
      setSeenAt(res.seen_at || null);
    } catch { /* session expiry is handled by the main CMS */ }
  };

  useEffect(() => {
    load();
    const t = window.setInterval(() => { if (!document.hidden) load(); }, 60000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread) {
      setUnread(0);
      try { await api.markNotificationsSeen(); } catch { /* retried next time */ }
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-surface-raised hover:bg-surface border border-border text-text-secondary hover:text-ink"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-ink text-[10px] font-bold flex items-center justify-center tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-[#0e1015] shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Needs your attention</span>
            <span className="text-[11px] text-text-secondary tabular-nums">{items.length}</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/60">
            {items.length === 0 && <div className="p-6 text-center text-xs text-text-secondary">You're all caught up.</div>}
            {items.map((n) => {
              const s = SEVERITY[n.severity];
              const Icon = s.icon;
              const isNew = !seenAt || n.at > seenAt;
              return (
                <button
                  key={n.id}
                  onClick={() => { setOpen(false); onNavigate(n.link.tab, n.link.id); }}
                  className="w-full text-left px-4 py-3 hover:bg-surface-raised/60 flex gap-3"
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.cls}`} aria-label={s.label} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-ink font-medium leading-snug">{n.title}</div>
                    <div className="text-[11px] text-text-secondary truncate">{n.detail}</div>
                    <div className="text-[10px] text-text-secondary/70 mt-0.5">{s.label} · {ago(n.at)}</div>
                  </div>
                  {isNew && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" aria-label="unread" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
