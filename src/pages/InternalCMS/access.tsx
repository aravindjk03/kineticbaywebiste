import { Fragment, useEffect, useState } from 'react';
import { CheckCircle, Minus, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';

/**
 * What each CMS module needs, and what can be done inside it. The server
 * enforces every permission; this map only decides what each role is shown.
 */
export const MODULES: { tab: string; label: string; any: string[]; abilities: { label: string; perm: string }[] }[] = [
  { tab: 'dashboard', label: 'Dashboard', any: ['analytics:read'], abilities: [{ label: 'Team performance', perm: 'users:read' }, { label: 'System health', perm: 'security:read' }] },
  { tab: 'analytics', label: 'Visits & telemetry', any: ['analytics:read'], abilities: [{ label: 'Reset counters', perm: 'settings:update' }] },
  { tab: 'content', label: 'Content workflow', any: ['content:read'], abilities: [{ label: 'Create & edit', perm: 'content:update' }, { label: 'Submit for review', perm: 'content:submit' }, { label: 'Review, approve & publish', perm: 'content:publish' }, { label: 'Delete & restore', perm: 'content:delete' }] },
  { tab: 'tickets', label: 'Service desk', any: ['tickets:read'], abilities: [{ label: 'Reply & update', perm: 'tickets:update' }, { label: 'Assign staff', perm: 'tickets:assign' }, { label: 'Archive & restore', perm: 'tickets:delete' }] },
  { tab: 'enquiries', label: 'Enquiries', any: ['enquiries:read'], abilities: [{ label: 'Update status & notes', perm: 'enquiries:update' }, { label: 'Delete', perm: 'enquiries:delete' }] },
  { tab: 'crm', label: 'Sales pipeline', any: ['enquiries:read'], abilities: [{ label: 'Move, assign, follow up & email leads', perm: 'enquiries:update' }] },
  { tab: 'customers', label: 'Customers', any: ['enquiries:read'], abilities: [] },
  { tab: 'mail', label: 'Inbox (Gmail)', any: ['mail:read'], abilities: [{ label: 'Reply & send email', perm: 'mail:send' }, { label: 'Connect & share mailboxes', perm: 'mail:manage' }] },
  { tab: 'projects', label: 'Projects & billing', any: ['projects:read'], abilities: [{ label: 'Create projects & send for approval', perm: 'projects:create' }, { label: 'Approve up to ₹50,000', perm: 'projects:approve' }, { label: 'Approve above ₹50,000', perm: 'projects:approve_above' }, { label: 'Record payments', perm: 'payments:record' }, { label: 'Archive projects, remove payments', perm: 'projects:delete' }] },
  { tab: 'clients', label: 'Client logos', any: ['clients:manage'], abilities: [] },
  { tab: 'team', label: 'Team roster', any: ['team:manage'], abilities: [] },
  { tab: 'chatbot', label: 'Chatbot settings', any: ['chatbot:manage'], abilities: [] },
  { tab: 'users', label: 'Users & roles', any: ['users:read'], abilities: [{ label: 'Create users', perm: 'users:create' }, { label: 'Change roles', perm: 'users:update' }, { label: 'Disable super admins', perm: 'users:disable' }] },
  { tab: 'audit', label: 'Audit logs', any: ['audit:read'], abilities: [] },
  { tab: 'security', label: 'Security & email', any: ['security:update', 'cms-route:update'], abilities: [{ label: 'Rotate CMS link', perm: 'cms-route:update' }] },
  { tab: 'cookies', label: 'Cookie consent', any: ['cookies:read'], abilities: [] },
];

export const ROLE_LABEL: Record<string, string> = { super_admin: 'Super Admin', admin: 'Admin', marketing: 'Marketing' };

export const canOpen = (tab: string, role: string, perms: string[]) =>
  role === 'super_admin' || Boolean(MODULES.find((m) => m.tab === tab)?.any.some((p) => perms.includes(p)));

/** Sidebar footer: the signed-in person's role and the modules it gives them. */
export function MyAccess({ role, permissions }: { role: string; permissions: string[] }) {
  const [open, setOpen] = useState(false);
  const mine = MODULES.filter((m) => canOpen(m.tab, role, permissions));
  const limits = mine.flatMap((m) => m.abilities.filter((a) => role !== 'super_admin' && !permissions.includes(a.perm)).map((a) => `${m.label}: ${a.label.toLowerCase()}`));
  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-surface/40 p-3 text-[11px]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left" aria-expanded={open}>
        <span className="flex items-center gap-1.5 text-text-secondary"><ShieldCheck className="w-3.5 h-3.5 text-primary" />Your access · <b className="text-ink">{ROLE_LABEL[role] || role}</b></span>
        <span className="text-text-secondary">{open ? 'Hide' : 'View'}</span>
      </button>
      {open && (
        <div className="mt-2.5 space-y-2">
          <div className="text-text-secondary">{role === 'super_admin' ? 'Full access to every module.' : `${mine.length} of ${MODULES.length} modules are allotted to your role.`}</div>
          {limits.length > 0 && (
            <div>
              <div className="text-text-secondary mb-1">Not included in your role:</div>
              <ul className="space-y-0.5 text-text-secondary/80">
                {limits.map((l) => <li key={l} className="flex gap-1.5"><Minus className="w-3 h-3 mt-0.5 shrink-0" />{l}</li>)}
              </ul>
            </div>
          )}
          {role !== 'super_admin' && <div className="text-text-secondary/70">Need more? Ask a Super Admin to change your role.</div>}
        </div>
      )}
    </div>
  );
}

/** Super admin view: which role gets which module and action, straight from the server's role table. */
export function RoleMatrix() {
  const [roles, setRoles] = useState<Record<string, string[]> | null>(null);
  useEffect(() => { api.getRoles().then((r: { roles: Record<string, string[]> }) => setRoles(r.roles)).catch(() => setRoles(null)); }, []);
  if (!roles) return null;
  const names = Object.keys(roles);
  const Cell = ({ ok }: { ok: boolean }) => (ok
    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 inline" aria-label="Allowed" />
    : <Minus className="w-3.5 h-3.5 text-text-secondary/40 inline" aria-label="Not allowed" />);
  return (
    <div className="rounded-2xl border border-border/80 bg-surface/70 overflow-x-auto">
      <div className="px-4 pt-4 pb-2">
        <h3 className="font-heading font-bold text-sm text-ink">Roles & access</h3>
        <p className="text-[11px] text-text-secondary">What each role can open and do. Staff only see the modules their role allows; the server blocks everything else.</p>
      </div>
      <table className="w-full text-xs min-w-[560px]">
        <thead className="text-[11px] text-text-secondary">
          <tr className="border-b border-border">
            <th className="text-left font-medium p-3">Module / action</th>
            {names.map((r) => <th key={r} className="font-medium p-3 text-center">{ROLE_LABEL[r] || r}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {MODULES.map((m) => (
            <Fragment key={m.tab}>
              <tr className="bg-surface-raised/30">
                <td className="p-3 text-ink font-semibold">{m.label}</td>
                {names.map((r) => <td key={r} className="p-3 text-center"><Cell ok={canOpen(m.tab, r, roles[r])} /></td>)}
              </tr>
              {m.abilities.map((a) => (
                <tr key={`${m.tab}-${a.perm}`}>
                  <td className="py-2 px-3 pl-7 text-text-secondary">{a.label}</td>
                  {names.map((r) => <td key={r} className="py-2 px-3 text-center"><Cell ok={r === 'super_admin' || roles[r].includes(a.perm)} /></td>)}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
