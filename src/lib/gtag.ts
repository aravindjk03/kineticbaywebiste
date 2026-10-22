/**
 * Google Analytics 4 helpers.
 *
 * The tag is loaded in index.html with Consent Mode v2 set to "denied", so
 * nothing is stored on a visitor's device until they accept analytics cookies.
 * These helpers keep that consent in step with the site's cookie banner and
 * report page views for a single-page app, where the browser never reloads.
 */

export const GA_MEASUREMENT_ID = 'G-V6CVF15TCH';

type GtagArgs = [command: string, ...rest: unknown[]];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: GtagArgs) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag(...args);
}

/** Mirror the cookie banner's analytics choice into Google's consent state. */
export function syncGaConsent(analyticsAllowed: boolean) {
  gtag('consent', 'update', {
    analytics_storage: analyticsAllowed ? 'granted' : 'denied',
  });
}

/** Report a page view. Called on every public route change. */
export function trackPageView(path: string) {
  gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** Report a meaningful action, e.g. an enquiry or a ticket being submitted. */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  gtag('event', name, params);
}
