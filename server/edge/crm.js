/**
 * CRM & service-desk logic: response-time targets (SLA), customer profiles,
 * notifications and dashboard metrics. Pure functions over plain records.
 */

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/* ─── Response-time targets ─────────────────────────────── */

// Hours to first customer-visible response, and to resolution, by priority.
export const SLA_TARGETS = {
  critical: { response: 4, resolution: 24 },
  urgent: { response: 4, resolution: 24 },
  high: { response: 8, resolution: 48 },
  medium: { response: 24, resolution: 72 },
  low: { response: 48, resolution: 120 },
};
export const LEAD_RESPONSE_HOURS = 24;

const CLOSED_TICKET = new Set(['RESOLVED', 'CLOSED']);
const CLOSED_LEAD = new Set(['WON', 'LOST']);

function clock(startIso, hours, metIso, now) {
  const start = Date.parse(startIso);
  const due = start + hours * HOUR;
  if (metIso) {
    const met = Date.parse(metIso);
    return { due: new Date(due).toISOString(), state: met <= due ? 'met' : 'missed', met_at: metIso, remaining_ms: 0 };
  }
  const remaining = due - now;
  const state = remaining < 0 ? 'breached' : remaining < hours * HOUR * 0.25 ? 'at_risk' : 'on_track';
  return { due: new Date(due).toISOString(), state, met_at: null, remaining_ms: remaining };
}

/** Attach live response/resolution clocks to a ticket (not persisted). */
export function withSla(t, now = Date.now()) {
  const target = SLA_TARGETS[t.priority] || SLA_TARGETS.medium;
  return {
    ...t,
    sla: {
      target_hours: target,
      response: clock(t.created_at, target.response, t.first_response_at, now),
      resolution: clock(t.created_at, target.resolution, CLOSED_TICKET.has(t.status) ? (t.resolved_at || t.updated_at) : null, now),
    },
  };
}

/** First-contact clock for a lead. */
export function leadClock(e, now = Date.now()) {
  return clock(e.created_at, LEAD_RESPONSE_HOURS, e.first_response_at || null, now);
}

/* ─── Leads ─────────────────────────────────────────────── */

export function leadSource(e) {
  if (e.source) return e.source;
  const m = /Source:\s*([a-z_]+)/i.exec(e.message || '');
  return (m ? m[1] : 'website').toLowerCase();
}

export function activity(type, text, author, extra = {}) {
  return { id: `act_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, type, text, author_id: author?.id || null, author_name: author?.name || 'System', at: new Date().toISOString(), ...extra };
}

/* ─── Customers ─────────────────────────────────────────── */

const internal = (email) => /@kineticbay\.internal$/i.test(email || '');

/** Group enquiries and tickets into one profile per email address. */
export function buildCustomers(enquiries, tickets) {
  const map = new Map();
  const get = (email) => {
    const key = (email || '').toLowerCase();
    if (!map.has(key)) map.set(key, { email: key, name: '', company: '', enquiries: [], tickets: [] });
    return map.get(key);
  };
  for (const e of enquiries) {
    if (e.deleted_at || !e.email || internal(e.email)) continue;
    const c = get(e.email);
    c.enquiries.push(e);
  }
  for (const t of tickets) {
    if (t.deleted_at || !t.requester_email || internal(t.requester_email)) continue;
    const c = get(t.requester_email);
    c.tickets.push(t);
  }
  return [...map.values()].map((c) => {
    const all = [...c.enquiries.map((e) => ({ at: e.updated_at || e.created_at, name: e.name, company: e.company })), ...c.tickets.map((t) => ({ at: t.updated_at || t.created_at, name: t.requester_name }))]
      .sort((a, b) => b.at.localeCompare(a.at));
    const latestLead = [...c.enquiries].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const firstSeen = [...c.enquiries, ...c.tickets].map((x) => x.created_at).sort()[0];
    return {
      email: c.email,
      name: all.find((x) => x.name)?.name || c.email,
      company: all.find((x) => x.company)?.company || '',
      enquiry_count: c.enquiries.length,
      ticket_count: c.tickets.length,
      open_tickets: c.tickets.filter((t) => !CLOSED_TICKET.has(t.status)).length,
      lead_status: latestLead?.status || null,
      owner_id: latestLead?.owner_id || null,
      first_seen: firstSeen,
      last_activity: all[0]?.at || firstSeen,
    };
  }).sort((a, b) => (b.last_activity || '').localeCompare(a.last_activity || ''));
}

/** Full profile with a merged timeline for one customer. */
export function customerProfile(email, enquiries, tickets) {
  const key = email.toLowerCase();
  const es = enquiries.filter((e) => !e.deleted_at && (e.email || '').toLowerCase() === key);
  const ts = tickets.filter((t) => !t.deleted_at && (t.requester_email || '').toLowerCase() === key);
  if (!es.length && !ts.length) return null;
  const summary = buildCustomers(es, ts)[0];
  const timeline = [];
  for (const e of es) {
    timeline.push({ at: e.created_at, kind: 'enquiry', ref: e.reference_id, id: e.id, title: `Enquiry about ${e.service_name}`, text: e.message });
    for (const a of e.activities || []) timeline.push({ at: a.at, kind: `lead_${a.type}`, ref: e.reference_id, id: e.id, title: a.type === 'email' ? `Email sent: ${a.subject || ''}` : a.type === 'status' ? a.text : `${a.type[0].toUpperCase()}${a.type.slice(1)} logged`, text: a.type === 'status' ? '' : a.text, author: a.author_name });
  }
  for (const t of ts) {
    timeline.push({ at: t.created_at, kind: 'ticket', ref: t.public_id, id: t.id, title: `Ticket raised: ${t.subject}`, text: t.description });
    for (const u of (t.customer_updates || []).slice(1)) timeline.push({ at: u.created_at, kind: 'ticket_update', ref: t.public_id, id: t.id, title: 'Update sent to customer', text: u.message });
    if (t.resolved_at) timeline.push({ at: t.resolved_at, kind: 'ticket_resolved', ref: t.public_id, id: t.id, title: `Ticket ${t.status.toLowerCase()}`, text: '' });
  }
  timeline.sort((a, b) => b.at.localeCompare(a.at));
  return { ...summary, enquiries: es, tickets: ts.map((t) => withSla(t)), timeline };
}

/* ─── Notifications ─────────────────────────────────────── */

/**
 * Everything that needs someone's attention, filtered to what this user can act on.
 * Severity: critical (breached) > warning (at risk / overdue) > info (new / assigned).
 */
export function notificationsFor(user, perms, { tickets, enquiries, content, audit }, now = Date.now()) {
  const out = [];
  const add = (n) => out.push(n);
  const isAdmin = perms.includes('users:read');

  if (perms.includes('tickets:read')) {
    for (const raw of tickets) {
      if (raw.deleted_at || CLOSED_TICKET.has(raw.status)) continue;
      const t = withSla(raw, now);
      const mine = t.assigned_to === user.id;
      const relevant = mine || !t.assigned_to || isAdmin;
      if (!relevant) continue;
      const r = t.sla.response, s = t.sla.resolution;
      if (r.state === 'breached' || s.state === 'breached') {
        add({ id: `sla-breach-${t.id}`, kind: 'ticket_sla', severity: 'critical', at: r.state === 'breached' ? r.due : s.due, title: `${t.public_id} missed its ${r.state === 'breached' ? 'response' : 'resolution'} target`, detail: t.subject, link: { tab: 'tickets', id: t.id } });
      } else if (r.state === 'at_risk' || s.state === 'at_risk') {
        add({ id: `sla-risk-${t.id}`, kind: 'ticket_sla', severity: 'warning', at: new Date(now).toISOString(), title: `${t.public_id} is close to its ${r.state === 'at_risk' ? 'response' : 'resolution'} target`, detail: t.subject, link: { tab: 'tickets', id: t.id } });
      }
      if (t.status === 'NEW' && !t.assigned_to) {
        add({ id: `ticket-new-${t.id}`, kind: 'ticket_new', severity: 'info', at: t.created_at, title: `New ticket ${t.public_id} needs an owner`, detail: `${t.requester_name} · ${t.subject}`, link: { tab: 'tickets', id: t.id } });
      } else if (mine && t.status === 'ASSIGNED') {
        add({ id: `ticket-mine-${t.id}`, kind: 'ticket_assigned', severity: 'info', at: t.updated_at, title: `${t.public_id} is assigned to you`, detail: t.subject, link: { tab: 'tickets', id: t.id } });
      }
    }
  }

  if (perms.includes('enquiries:read')) {
    for (const e of enquiries) {
      if (e.deleted_at || CLOSED_LEAD.has(e.status)) continue;
      const mine = e.owner_id === user.id;
      if (!(mine || !e.owner_id || isAdmin)) continue;
      if (e.follow_up_at && Date.parse(e.follow_up_at) < now) {
        add({ id: `lead-follow-${e.id}`, kind: 'lead_followup', severity: 'warning', at: e.follow_up_at, title: `Follow-up overdue: ${e.name}`, detail: `${e.company || e.email} · ${e.service_name}`, link: { tab: 'crm', id: e.id } });
      }
      const c = leadClock(e, now);
      if (!e.first_response_at && c.state === 'breached') {
        add({ id: `lead-uncontacted-${e.id}`, kind: 'lead_uncontacted', severity: 'warning', at: c.due, title: `${e.name} has not been contacted for ${Math.floor((now - Date.parse(e.created_at)) / HOUR)}h`, detail: e.service_name, link: { tab: 'crm', id: e.id } });
      } else if (!e.owner_id && now - Date.parse(e.created_at) < DAY) {
        add({ id: `lead-new-${e.id}`, kind: 'lead_new', severity: 'info', at: e.created_at, title: `New lead: ${e.name}`, detail: `${e.company || e.email} · ${e.service_name}`, link: { tab: 'crm', id: e.id } });
      }
    }
  }

  if (perms.includes('content:publish')) {
    for (const i of content) {
      if (!i.deleted_at && (i.status === 'submitted' || i.status === 'review')) {
        add({ id: `content-${i.id}-${i.status}`, kind: 'content_review', severity: 'info', at: i.updated_at, title: `“${i.title}” is waiting for ${i.status === 'submitted' ? 'review' : 'approval'}`, detail: i.slug, link: { tab: 'content', id: i.id } });
      }
    }
  }

  if (perms.includes('settings:update')) {
    const failed = audit.filter((a) => a.type === 'EMAIL_FAILED' && now - Date.parse(a.timestamp) < DAY);
    if (failed.length) add({ id: `email-failed-${failed[0].id}`, kind: 'system', severity: 'warning', at: failed[0].timestamp, title: `${failed.length} email${failed.length > 1 ? 's' : ''} failed to send in the last 24h`, detail: 'See Audit Logs for details', link: { tab: 'audit' } });
  }

  const rank = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.at.localeCompare(a.at));
}

/* ─── Dashboard ─────────────────────────────────────────── */

const dayKey = (iso) => iso.slice(0, 10);

function dailySeries(items, field, days, now) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push({ date: dayKey(new Date(now - i * DAY).toISOString()), count: 0 });
  const idx = new Map(out.map((d, i) => [d.date, i]));
  for (const it of items) {
    const k = it[field] && idx.get(dayKey(it[field]));
    if (k !== undefined) out[k].count += 1;
  }
  return out;
}

const tally = (items, fn) => {
  const m = {};
  for (const it of items) { const k = fn(it) || 'unknown'; m[k] = (m[k] || 0) + 1; }
  return Object.entries(m).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
};

const hoursBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / HOUR;
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export function dashboard({ user, perms, users, tickets, enquiries, content, audit, analytics, notifications }, now = Date.now()) {
  const since = (ms) => (iso) => iso && now - Date.parse(iso) <= ms;
  const leads = enquiries.filter((e) => !e.deleted_at);
  const openLeads = leads.filter((e) => !CLOSED_LEAD.has(e.status));
  const live = tickets.filter((t) => !t.deleted_at).map((t) => withSla(t, now));
  const openTickets = live.filter((t) => !CLOSED_TICKET.has(t.status));
  const last30 = since(30 * DAY);
  const prev30 = (iso) => iso && now - Date.parse(iso) > 30 * DAY && now - Date.parse(iso) <= 60 * DAY;

  const funnelOrder = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON'];
  const reached = (e, stage) => {
    if (e.status === 'LOST') return funnelOrder.indexOf(stage) <= funnelOrder.indexOf(e.lost_from || 'NEW');
    return funnelOrder.indexOf(e.status) >= funnelOrder.indexOf(stage);
  };
  const leads30 = leads.filter((e) => last30(e.created_at));

  const visits30 = (analytics?.dailyVisits || []).filter((d) => now - Date.parse(d.date) <= 30 * DAY).reduce((s, d) => s + d.count, 0);
  const responded30 = live.filter((t) => t.first_response_at && last30(t.created_at));
  const leadResponded30 = leads30.filter((e) => e.first_response_at);

  const out = {
    generated_at: new Date(now).toISOString(),
    leads: {
      today: leads.filter((e) => dayKey(e.created_at) === dayKey(new Date(now).toISOString())).length,
      last7: leads.filter((e) => since(7 * DAY)(e.created_at)).length,
      last30: leads30.length,
      prev30: leads.filter((e) => prev30(e.created_at)).length,
      open: openLeads.length,
      won30: leads.filter((e) => e.status === 'WON' && last30(e.won_at || e.updated_at)).length,
      uncontacted: openLeads.filter((e) => !e.first_response_at).length,
      overdue_followups: openLeads.filter((e) => e.follow_up_at && Date.parse(e.follow_up_at) < now).length,
      avg_first_contact_hours: avg(leadResponded30.map((e) => hoursBetween(e.created_at, e.first_response_at))),
      funnel: funnelOrder.map((stage) => ({ key: stage, count: leads30.filter((e) => reached(e, stage)).length })),
      by_status: tally(openLeads, (e) => e.status),
      by_source: tally(leads30, leadSource),
      by_service: tally(leads30, (e) => e.service_name),
      daily: dailySeries(leads, 'created_at', 30, now),
    },
    tickets: {
      open: openTickets.length,
      breached: openTickets.filter((t) => t.sla.response.state === 'breached' || t.sla.resolution.state === 'breached').length,
      at_risk: openTickets.filter((t) => t.sla.response.state === 'at_risk' || t.sla.resolution.state === 'at_risk').length,
      unassigned: openTickets.filter((t) => !t.assigned_to).length,
      created30: live.filter((t) => last30(t.created_at)).length,
      resolved30: live.filter((t) => t.resolved_at && last30(t.resolved_at)).length,
      avg_first_response_hours: avg(responded30.map((t) => hoursBetween(t.created_at, t.first_response_at))),
      response_target_met_pct: responded30.length ? Math.round((responded30.filter((t) => t.sla.response.state === 'met').length / responded30.length) * 100) : null,
      by_category: tally(openTickets, (t) => t.category),
      by_priority: tally(openTickets, (t) => t.priority),
      daily: dailySeries(live, 'created_at', 30, now),
    },
    website: {
      visits30,
      total_visits: analytics?.totalVisits || 0,
      unique_visitors: analytics?.uniqueVisitors || 0,
      conversion_pct: visits30 ? Math.round((leads30.length / visits30) * 1000) / 10 : null,
      top_pages: Object.entries(analytics?.pageViews || {}).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key, count]) => ({ key, count })),
    },
    content: {
      awaiting: content.filter((i) => !i.deleted_at && (i.status === 'submitted' || i.status === 'review')).length,
      published: content.filter((i) => !i.deleted_at && i.status === 'published').length,
    },
    actions: notifications.slice(0, 8),
  };

  if (perms.includes('users:read')) {
    out.team = users.filter((u) => u.status === 'active').map((u) => {
      const owned = openLeads.filter((e) => e.owner_id === u.id);
      const contacted30 = leads.flatMap((e) => (e.activities || []).filter((a) => a.author_id === u.id && ['email', 'call', 'meeting', 'whatsapp'].includes(a.type) && last30(a.at)));
      const assigned = openTickets.filter((t) => t.assigned_to === u.id);
      const resolved = live.filter((t) => t.assigned_to === u.id && t.resolved_at && last30(t.resolved_at));
      const theirResponses = live.filter((t) => t.first_responder_id === u.id && last30(t.created_at));
      return {
        id: u.id, name: u.name, role: u.role,
        leads_open: owned.length,
        overdue_followups: owned.filter((e) => e.follow_up_at && Date.parse(e.follow_up_at) < now).length,
        contacts30: contacted30.length,
        tickets_open: assigned.length,
        tickets_resolved30: resolved.length,
        avg_first_response_hours: avg(theirResponses.map((t) => hoursBetween(t.created_at, t.first_response_at))),
        last_login: u.lastLoginAt || null,
      };
    });
  }

  if (perms.includes('security:read')) {
    const in7 = (a) => now - Date.parse(a.timestamp) <= 7 * DAY;
    const in24 = (a) => now - Date.parse(a.timestamp) <= DAY;
    out.health = {
      emails_sent7: audit.filter((a) => a.type === 'EMAIL_SENT' && in7(a)).length,
      emails_failed7: audit.filter((a) => a.type === 'EMAIL_FAILED' && in7(a)).length,
      failed_logins24: audit.filter((a) => (a.type === 'LOGIN_FAILED' || a.type === 'MFA_FAILED') && in24(a)).length,
      access_denied24: audit.filter((a) => a.type === 'ACCESS_DENIED' && in24(a)).length,
      logins7: audit.filter((a) => a.type === 'LOGIN_SUCCESS' && in7(a)).length,
      active_users: users.filter((u) => u.status === 'active').length,
    };
  }

  return out;
}
