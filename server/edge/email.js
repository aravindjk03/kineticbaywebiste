/**
 * Transactional email via Brevo (https://developers.brevo.com/reference/sendtransacemail).
 *
 * Environment:
 *   BREVO_API_KEY   (secret)  — Brevo API v3 key
 *   MAIL_FROM       (var)     — verified Brevo sender address
 *   MAIL_NOTIFY_TO  (var)     — inbox that receives staff alerts (comma-separated allowed)
 *   SITE_URL        (var)     — public site origin, used in links
 *
 * Every send resolves to { ok, status, error? } and never throws, so a mail
 * outage can never block a ticket or enquiry from being saved.
 */

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function mailConfigured(env) {
  return Boolean(env && env.BREVO_API_KEY && env.MAIL_FROM);
}

async function send(env, { to, subject, html, text, replyTo }) {
  if (!mailConfigured(env)) return { ok: false, status: 0, error: 'Email not configured (BREVO_API_KEY / MAIL_FROM missing).' };
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean).map((email) => ({ email }));
  if (!recipients.length) return { ok: false, status: 0, error: 'No recipient.' };
  // keys pasted into a terminal can pick up invisible characters (BOM, CR/LF, spaces)
  const rawKey = String(env.BREVO_API_KEY);
  const apiKey = rawKey.replace(/[^!-~]/g, '');
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Kinetic Bay', email: env.MAIL_FROM },
        to: recipients,
        subject,
        htmlContent: html,
        textContent: text,
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      }),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text().catch((e) => `unreadable body: ${e}`);
    const hdrs = ['content-type', 'x-sib-server', 'server', 'cf-ray'].map((h) => `${h}=${res.headers.get(h)}`).join(' ');
    const keyShape = `key: len=${apiKey.length} raw=${rawKey.length} prefix_ok=${apiKey.startsWith('xkeysib-')}`;
    return { ok: false, status: res.status, error: `${res.statusText} ${hdrs} ${keyShape} body=${body.slice(0, 300) || '(empty)'}` };
  } catch (err) {
    return { ok: false, status: 0, error: String(err && err.message || err) };
  }
}

const staffInbox = (env) => String(env.MAIL_NOTIFY_TO || env.MAIL_FROM || '').split(',').map((s) => s.trim()).filter(Boolean);
const site = (env) => (env.SITE_URL || 'https://kineticbay.kineticbay.workers.dev').replace(/\/$/, '');

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f6f3ef;font-family:Segoe UI,Arial,sans-serif;color:#1b1c20">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #eadfd4">
<tr><td style="background:#101114;padding:20px 26px"><span style="color:#ffffff;font-weight:700;font-size:18px">Kinetic <span style="color:#F08A4B">Bay</span></span>
<div style="color:#a9a39c;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-top:4px">Building Machines · Shaping Humans</div></td></tr>
<tr><td style="padding:26px"><h1 style="margin:0 0 14px;font-size:20px;color:#101114">${esc(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:16px 26px;background:#faf7f3;color:#8a837b;font-size:12px">Kinetic Bay · Chennai, India · This is an automated message.</td></tr>
</table></td></tr></table></body></html>`;
}

const row = (k, v) => `<tr><td style="padding:6px 0;color:#8a837b;font-size:13px;width:120px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-size:14px">${esc(v)}</td></tr>`;
const table = (rows) => `<table role="presentation" style="width:100%;border-collapse:collapse;margin:6px 0 16px">${rows.join('')}</table>`;
const para = (t) => `<p style="font-size:14px;line-height:1.6;margin:0 0 14px">${t}</p>`;
const quote = (t) => `<div style="white-space:pre-wrap;background:#faf7f3;border-left:3px solid #F08A4B;padding:12px 14px;font-size:14px;line-height:1.55;margin:0 0 16px">${esc(t)}</div>`;
const human = (s) => String(s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/* ─── Tickets ─────────────────────────────────────────── */

export function notifyStaffNewTicket(env, t, source = 'Website chatbot') {
  const subject = `New ticket ${t.public_id} · ${human(t.priority)} · ${t.subject}`;
  const html = layout('A new support ticket was raised', table([
    row('Ticket', t.public_id), row('From', `${t.requester_name} <${t.requester_email}>`), row('Category', human(t.category)),
    row('Priority', human(t.priority)), row('Source', source), row('Subject', t.subject),
  ]) + quote(t.description) + para('Open the CMS Service Desk to triage and reply.'));
  const text = `New ticket ${t.public_id}\nFrom: ${t.requester_name} <${t.requester_email}>\nCategory: ${human(t.category)}\nPriority: ${human(t.priority)}\nSource: ${source}\nSubject: ${t.subject}\n\n${t.description}`;
  return send(env, { to: staffInbox(env), subject, html, text, replyTo: t.requester_email });
}

export function notifyCustomerTicketReceived(env, t) {
  const subject = `We've received your request — ${t.public_id}`;
  const html = layout('Thanks — your ticket is in our queue', para(`Hi ${esc(t.requester_name)},`)
    + para('Our team has received your request and will reply within 24 hours, usually much sooner.')
    + table([row('Reference', t.public_id), row('Subject', t.subject), row('Priority', human(t.priority))])
    + para(`You can check progress any time from the chat assistant on <a href="${site(env)}" style="color:#D9733A">our website</a> — choose <b>Track Ticket</b> and enter your reference and this email address.`)
    + para('— The Kinetic Bay team'));
  const text = `Hi ${t.requester_name},\n\nWe've received your request and will reply within 24 hours.\nReference: ${t.public_id}\nSubject: ${t.subject}\n\nTrack it any time via the chat assistant on ${site(env)} (Track Ticket).\n\n— The Kinetic Bay team`;
  return send(env, { to: t.requester_email, subject, html, text, replyTo: staffInbox(env)[0] });
}

export function notifyCustomerTicketUpdate(env, t, message) {
  const subject = `Update on your ticket ${t.public_id}`;
  const html = layout('There\'s an update on your ticket', para(`Hi ${esc(t.requester_name)},`)
    + quote(message)
    + table([row('Reference', t.public_id), row('Subject', t.subject), row('Status', human(t.status))])
    + para('Just reply to this email if you have anything to add.') + para('— The Kinetic Bay team'));
  const text = `Hi ${t.requester_name},\n\n${message}\n\nReference: ${t.public_id}\nStatus: ${human(t.status)}\n\n— The Kinetic Bay team`;
  return send(env, { to: t.requester_email, subject, html, text, replyTo: staffInbox(env)[0] });
}

export function notifyCustomerTicketStatus(env, t) {
  const done = t.status === 'RESOLVED' || t.status === 'CLOSED';
  const subject = done ? `Your ticket ${t.public_id} has been ${human(t.status).toLowerCase()}` : `Ticket ${t.public_id} is now ${human(t.status)}`;
  const html = layout(subject, para(`Hi ${esc(t.requester_name)},`)
    + para(done ? 'We\'ve marked your request as complete. If anything still isn\'t right, just reply to this email and we\'ll reopen it.' : `Your ticket status changed to <b>${esc(human(t.status))}</b>.`)
    + table([row('Reference', t.public_id), row('Subject', t.subject)]) + para('— The Kinetic Bay team'));
  const text = `Hi ${t.requester_name},\n\n${done ? 'We have marked your request as complete. Reply to this email to reopen it.' : `Your ticket status changed to ${human(t.status)}.`}\nReference: ${t.public_id}\n\n— The Kinetic Bay team`;
  return send(env, { to: t.requester_email, subject, html, text, replyTo: staffInbox(env)[0] });
}

/* ─── Enquiries ───────────────────────────────────────── */

export function notifyStaffNewEnquiry(env, e) {
  const subject = `New enquiry ${e.reference_id} · ${e.service_name} · ${e.name}`;
  const html = layout('A new enquiry came in', table([
    row('Reference', e.reference_id), row('Name', e.name), row('Email', e.email), row('Company', e.company || '—'),
    row('Interested in', e.service_name),
  ]) + quote(e.message) + para('Reply directly to this email to respond to the sender.'));
  const text = `New enquiry ${e.reference_id}\n${e.name} <${e.email}>\nCompany: ${e.company || '-'}\nInterested in: ${e.service_name}\n\n${e.message}`;
  return send(env, { to: staffInbox(env), subject, html, text, replyTo: e.email });
}

/* ─── Diagnostics ─────────────────────────────────────── */

export function sendTestEmail(env, to) {
  return send(env, {
    to: to || staffInbox(env),
    subject: 'Kinetic Bay CMS · test email',
    html: layout('Email delivery is working', para('This test was sent from the KB NEXUS CMS. Ticket and enquiry notifications will arrive at this inbox.')),
    text: 'Email delivery is working. Ticket and enquiry notifications will arrive at this inbox.',
  });
}

export const internalAddress = (email) => /@kineticbay\.internal$/i.test(email || '');
