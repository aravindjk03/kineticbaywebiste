import { CookieConsentState, VisitAnalytics, VisitEvent } from '../types/cms';
import { api } from './api';

const COOKIE_KEY = 'kb_cookie_consent_v1';
const VISITOR_ID_KEY = 'kb_visitor_id';
const ANALYTICS_KEY = 'kb_real_analytics_v2';

// Clean slate default analytics: strictly REAL visits starting from 0
const CLEAN_ANALYTICS: VisitAnalytics = {
  totalVisits: 0,
  uniqueVisitors: 0,
  pageViews: {},
  dailyVisits: [],
  deviceBreakdown: {
    desktop: 0,
    mobile: 0,
    tablet: 0,
  },
  recentVisits: [],
};

// Purge any legacy seeded fake analytics from localStorage
try {
  const legacyData = localStorage.getItem('kb_visit_analytics_v1');
  if (legacyData && legacyData.includes('1420')) {
    localStorage.removeItem('kb_visit_analytics_v1');
  }
} catch {}

export function getCookieConsent(): CookieConsentState {
  try {
    const raw = localStorage.getItem(COOKIE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading cookie consent', err);
  }
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    status: 'pending',
  };
}

export function saveCookieConsent(consent: CookieConsentState): void {
  try {
    const data = {
      ...consent,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('kb:cookie_changed', { detail: data }));
  } catch (err) {
    console.error('Error saving cookie consent', err);
  }
}

function getVisitorId(): { id: string; isNew: boolean } {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = 'v_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    localStorage.setItem(VISITOR_ID_KEY, id);
    return { id, isNew: true };
  }
  return { id, isNew: false };
}

function detectDevice(): 'desktop' | 'mobile' | 'tablet' {
  const ua = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

export function getAnalytics(): VisitAnalytics {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Double check it's not old seeded data
      if (parsed.totalVisits !== 1420) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading analytics', err);
  }
  return { ...CLEAN_ANALYTICS };
}

let lastRecordedPath = '';
let lastRecordedTime = 0;

/**
 * Records real human visits.
 * Filters automated scrapers, headless browsers, duplicate renders, and admin pages.
 */
export function recordVisit(path: string): void {
  try {
    // 1. Strict Bot & Headless Filter
    if (navigator.webdriver) return; // Automated test runners
    if (/bot|crawler|spider|headless|lighthouse/i.test(navigator.userAgent)) return;

    // 2. Filter internal CMS and API paths
    if (
      !path ||
      path.startsWith('/api') ||
      path.startsWith('/cms') ||
      path.includes('cms_') ||
      path.startsWith('/internal')
    ) {
      return;
    }

    // 3. Debounce rapid duplicate invocations (e.g. React StrictMode or rapid double clicks within 2 seconds)
    const now = Date.now();
    if (path === lastRecordedPath && now - lastRecordedTime < 2000) {
      return;
    }
    lastRecordedPath = path;
    lastRecordedTime = now;

    // 4. Respect explicit cookie decline
    const consent = getCookieConsent();
    if (consent.status === 'declined' || (consent.status === 'custom' && !consent.analytics)) {
      return;
    }

    const visitor = getVisitorId();
    const device = detectDevice();
    const referrer = document.referrer ? new URL(document.referrer).hostname : 'Direct';

    // 5. Ingest to server-backed analytics API for real cross-user aggregation
    api.recordPublicVisit({
      path,
      visitorId: visitor.id,
      referrer,
      device,
    }).catch(() => {});

    // 6. Update local client mirror for zero-latency local feedback
    const current = getAnalytics();
    const today = new Date().toISOString().split('T')[0];

    current.totalVisits += 1;
    if (visitor.isNew) {
      current.uniqueVisitors += 1;
    }

    current.pageViews[path] = (current.pageViews[path] || 0) + 1;
    current.deviceBreakdown[device] = (current.deviceBreakdown[device] || 0) + 1;

    const dayIndex = current.dailyVisits.findIndex((d) => d.date === today);
    if (dayIndex >= 0) {
      current.dailyVisits[dayIndex].count += 1;
    } else {
      current.dailyVisits.push({ date: today, count: 1 });
      if (current.dailyVisits.length > 14) {
        current.dailyVisits.shift();
      }
    }

    const newEvent: VisitEvent = {
      id: Math.random().toString(36).substring(2, 9),
      path,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      referrer,
      deviceType: device,
    };

    current.recentVisits = [newEvent, ...(current.recentVisits || []).slice(0, 49)];

    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('kb:visit_recorded', { detail: current }));
  } catch (err) {
    console.error('Error recording real visit', err);
  }
}

export function resetAnalytics(): VisitAnalytics {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(CLEAN_ANALYTICS));
  return { ...CLEAN_ANALYTICS };
}
