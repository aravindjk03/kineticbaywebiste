import { useEffect } from 'react';

const SITE_ORIGIN = 'https://kineticbay.kineticbay.workers.dev';

function setMeta(selector: string, attr: string, value: string) {
  const el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (el) el.setAttribute(attr, value);
}

/** Per-page title, description and canonical URL (blueprint section 16). */
export function useSeo(title: string, description: string, jsonLd?: object) {
  useEffect(() => {
    document.title = title;
    const url = SITE_ORIGIN + window.location.pathname;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[property="twitter:title"]', 'content', title);
    setMeta('meta[property="twitter:description"]', 'content', description);
    setMeta('link[rel="canonical"]', 'href', url);

    if (!jsonLd) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.page = 'true';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => script.remove();
  }, [title, description, jsonLd]);
}
