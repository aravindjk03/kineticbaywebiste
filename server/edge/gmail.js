/**
 * Gmail inside the CMS (Gmail API over OAuth 2.0).
 *
 * Environment:
 *   GOOGLE_CLIENT_ID      (var)    — OAuth client (type: Web application)
 *   GOOGLE_CLIENT_SECRET  (secret)
 * Redirect URI to register in Google Cloud:  <SITE_URL>/api/mail/oauth/callback
 *
 * Refresh tokens are encrypted (AES-GCM, key derived from SESSION_SECRET)
 * before they are written to the database.
 */
import { b64url, fromB64url } from './crypto.js';

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'openid', 'email',
];
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const enc = new TextEncoder();
const dec = new TextDecoder();

export const mailOauthConfigured = (env) => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const redirectUri = (env, origin) => `${(env.SITE_URL || origin).replace(/\/$/, '')}/api/mail/oauth/callback`;

/* ─── token encryption ─── */

async function key(env) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`${env.SESSION_SECRET}|gmail-refresh-token`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(env, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(env), enc.encode(text));
  return `${b64url(iv)}.${b64url(ct)}`;
}
export async function unseal(env, sealed) {
  const [iv, ct] = String(sealed).split('.');
  return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64url(iv) }, await key(env), fromB64url(ct)));
}

/* ─── OAuth ─── */

export function authUrl(env, origin, state, loginHint) {
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri(env, origin), response_type: 'code',
    scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state,
  });
  if (loginHint) q.set('login_hint', loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function tokenCall(params) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.error || `Google token error ${res.status}`);
  return data;
}

export const exchangeCode = (env, origin, code) => tokenCall({
  client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, code, grant_type: 'authorization_code', redirect_uri: redirectUri(env, origin),
});

export async function revoke(token) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => undefined);
}

const accessCache = new Map(); // email -> { token, exp }
export async function accessToken(env, account) {
  const hit = accessCache.get(account.email);
  if (hit && hit.exp > Date.now() + 60000) return hit.token;
  const data = await tokenCall({
    client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, grant_type: 'refresh_token',
    refresh_token: await unseal(env, account.refresh),
  });
  accessCache.set(account.email, { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 });
  return data.access_token;
}

export async function gmail(env, account, path, init = {}) {
  const token = await accessToken(env, account);
  const res = await fetch(`${API}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers || {}) } });
  if (res.status === 401) accessCache.delete(account.email);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error?.message || `Gmail error ${res.status}`), { status: res.status });
  return data;
}

export async function profileWithToken(accessTokenValue) {
  const res = await fetch(`${API}/profile`, { headers: { authorization: `Bearer ${accessTokenValue}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || 'Could not read the Gmail profile.');
  return data; // { emailAddress, messagesTotal, threadsTotal }
}

/* ─── message parsing ─── */

const header = (headers, name) => (headers || []).find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
const b64text = (data) => { try { return dec.decode(fromB64url(data)); } catch { return ''; } };

function walk(part, out) {
  if (!part) return;
  const mime = part.mimeType || '';
  if (part.filename && part.body?.attachmentId) {
    out.attachments.push({ id: part.body.attachmentId, name: part.filename, mime, size: part.body.size || 0 });
  } else if (mime === 'text/plain' && part.body?.data && !out.text) out.text = b64text(part.body.data);
  else if (mime === 'text/html' && part.body?.data && !out.html) out.html = b64text(part.body.data);
  for (const p of part.parts || []) walk(p, out);
}

export function parseAddress(v) {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(v || '');
  return m ? { name: m[1].trim() || m[2], email: m[2].trim().toLowerCase() } : { name: (v || '').trim(), email: (v || '').trim().toLowerCase() };
}

export function summarizeThread(t) {
  const msgs = t.messages || [];
  const first = msgs[0] || {}, last = msgs[msgs.length - 1] || {};
  const labels = new Set(msgs.flatMap((m) => m.labelIds || []));
  return {
    id: t.id,
    subject: header(first.payload?.headers, 'Subject') || '(no subject)',
    from: parseAddress(header(last.payload?.headers, 'From')),
    participants: [...new Set(msgs.map((m) => parseAddress(header(m.payload?.headers, 'From')).name))].slice(0, 3),
    snippet: last.snippet || '',
    date: new Date(Number(last.internalDate || 0)).toISOString(),
    count: msgs.length,
    unread: labels.has('UNREAD'),
    starred: labels.has('STARRED'),
    inbox: labels.has('INBOX'),
    has_attachments: msgs.some((m) => (m.payload?.parts || []).some((p) => p.filename)),
  };
}

export function parseThread(t) {
  return {
    ...summarizeThread(t),
    messages: (t.messages || []).map((m) => {
      const out = { text: '', html: '', attachments: [] };
      walk(m.payload, out);
      const h = m.payload?.headers;
      return {
        id: m.id,
        from: parseAddress(header(h, 'From')), to: header(h, 'To'), cc: header(h, 'Cc'),
        subject: header(h, 'Subject'), date: new Date(Number(m.internalDate || 0)).toISOString(),
        message_id: header(h, 'Message-ID') || header(h, 'Message-Id'), references: header(h, 'References'),
        unread: (m.labelIds || []).includes('UNREAD'),
        text: out.text, html: out.html, attachments: out.attachments, snippet: m.snippet,
      };
    }),
  };
}

/* ─── sending ─── */

// String.fromCharCode(...bigArray) overflows the stack on long emails, so convert in chunks
const bin = (bytes) => { let out = ''; for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192)); return out; };
const clean = (v) => String(v || '').replace(/[\r\n]+/g, ' ').trim();
const encWord = (v) => (/^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${btoa(bin(enc.encode(v)))}?=`);
const wrap76 = (s) => s.replace(/.{1,76}/g, '$&\r\n');

export function buildRaw({ from, fromName, to, cc, subject, body, inReplyTo, references }) {
  const lines = [
    `From: ${fromName ? `${encWord(clean(fromName))} <${clean(from)}>` : clean(from)}`,
    `To: ${clean(to)}`,
    cc ? `Cc: ${clean(cc)}` : null,
    `Subject: ${encWord(clean(subject))}`,
    inReplyTo ? `In-Reply-To: ${clean(inReplyTo)}` : null,
    inReplyTo ? `References: ${clean(`${references || ''} ${inReplyTo}`)}` : null,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(btoa(bin(enc.encode(body)))),
  ].filter((x) => x !== null);
  return b64url(enc.encode(lines.join('\r\n')));
}
