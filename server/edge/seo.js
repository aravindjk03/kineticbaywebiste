/**
 * Per-route metadata and structured data, injected into the HTML at the edge.
 *
 * The site is a single-page app: every route is served the same index.html, so
 * without this a crawler sees one title, one canonical and one schema block for
 * every page. Injecting here means search engines and answer engines (ChatGPT,
 * Perplexity, Google AI Overviews) read correct, page-specific markup without
 * having to execute the app's JavaScript.
 */

export const SITE_ORIGIN = 'https://kineticbay.in';
const ORG_ID = `${SITE_ORIGIN}/#organization`;

/* ─── Page metadata ───────────────────────────────────────
   Titles target 50–60 characters, descriptions 150–160, so neither is
   truncated in results, and each leads with the term people search for. */

const PAGES = {
  '/': [
    'Kinetic Bay | Custom Software & AI Solutions, Chennai',
    'Custom software, AI, cloud and IoT solutions that make work easier and create impact. 40+ projects, 99% success. Chennai-based, serving India and the world.',
  ],
  '/about': [
    'About Kinetic Bay | AI & Software Company in Chennai',
    'Chennai-born technology company that finds the friction in how organisations work and engineers it away. Human-centred software, aligned with the UN SDGs.',
  ],
  '/services': [
    'AI, Software, Cloud & IoT Services in Chennai | Kinetic Bay',
    'AI and automation, digital engineering, cybersecurity and cloud, and industrial IoT. Four engineering pillars combined into solutions that work end to end.',
  ],
  '/services/ai-automation': [
    'AI Chatbots, AI Agents & Automation Services | Kinetic Bay',
    'AI chatbots, autonomous agents, LLM fine-tuning and workflow automation built around your own data. Cut manual work, decide faster. Free discovery call.',
  ],
  '/services/digital-engineering': [
    'Custom Software & App Development Company | Kinetic Bay',
    'Web apps, mobile apps, SaaS products and enterprise integrations designed around how you actually work. Fast, scalable and beautifully built in Chennai.',
  ],
  '/services/cybersecurity-cloud': [
    'Cloud Migration & Cybersecurity Services | Kinetic Bay',
    'Azure and AWS cloud-native apps, migration, DevSecOps and VAPT penetration testing. Secure, compliant foundations that scale with your growing business.',
  ],
  '/services/iot': [
    'Industrial IoT & Smart Factory Solutions | Kinetic Bay',
    'IoT for predictive maintenance, asset tracking, energy monitoring and smart buildings. Real-time visibility and fewer breakdowns across every site you operate.',
  ],
  '/products': [
    'HRMS, VMS, PMS, CRM & Attendance Software | Kinetic Bay',
    'Ready-to-deploy HRMS, visitor management, project management, CRM and smart attendance platforms, customised to your industry, workflows and branding.',
  ],
  '/products/hrms': [
    'HRMS Software with Payroll for India | Kinetic HRMS',
    'All-in-one HRMS with payroll, statutory compliance, leave and performance management, customisable for your industry. Book a free demo with our Chennai team.',
  ],
  '/products/vms': [
    'Visitor Management System Software in India | Kinetic VMS',
    'Digital visitor management with QR pre-registration, ID verification, badge printing and instant host alerts. Secure every entry across every location.',
  ],
  '/products/pms': [
    'Project Management Software for Teams | Kinetic PMS',
    'Plan, track and deliver projects with task boards, Gantt charts, timesheets and live dashboards, customised to the way your own teams already prefer to work.',
  ],
  '/products/crm': [
    'CRM Software for Growing Businesses | Kinetic Bay CRM',
    'Capture leads, automate follow-ups and close more deals with a CRM tailored to your sales process. WhatsApp-ready and built for Indian businesses of every size.',
  ],
  '/products/attendance': [
    'Biometric & Face Attendance System | Kinetic Attendance',
    'Face recognition, biometric, RFID and GPS attendance that syncs straight into payroll. Accurate, dispute-free time tracking for every location you run.',
  ],
  '/solutions': [
    'How We Work: Our Software Delivery Process | Kinetic Bay',
    'A clear five-step journey: Discover, Design, Build, Deploy and Evolve, plus flexible engagement models and a technology partner that stays after launch.',
  ],
  '/team': [
    'Meet the Team Behind Kinetic Bay Software | Chennai',
    'A cross-functional collective of engineers, designers and strategists, mentored by experience and driven by a sustainable, safer, hands-on digital future.',
  ],
  '/contact': [
    'Contact Kinetic Bay | Book a Free Consultation Today',
    'Tell us about your challenge. Free discovery call, NDA on request and a reply within 24 hours from the Kinetic Bay team in Chennai, serving all of India.',
  ],
};

const BREADCRUMB_LABELS = {
  '/about': 'About', '/services': 'Services', '/products': 'Products',
  '/solutions': 'Solutions', '/team': 'Team', '/contact': 'Contact',
  '/services/ai-automation': 'AI & Automation',
  '/services/digital-engineering': 'Digital Engineering',
  '/services/cybersecurity-cloud': 'Cybersecurity & Cloud',
  '/services/iot': 'Industrial IoT',
  '/products/hrms': 'Kinetic HRMS', '/products/vms': 'Kinetic VMS',
  '/products/pms': 'Kinetic PMS', '/products/crm': 'Kinetic CRM',
  '/products/attendance': 'Kinetic Attendance',
};

/* ─── Answer-engine content ───────────────────────────────
   Plain question-and-answer pairs. These are what AI assistants quote, so each
   answer is self-contained and factual rather than marketing copy. */

export const FAQS = [
  ['How much does a custom software project cost?', 'Every project is different, so Kinetic Bay gives a clear, fixed-scope quotation after a free discovery session. You know the full cost upfront, with no hidden charges.'],
  ['How long does it take to build a solution?', 'A proof of concept can be ready in 2 to 4 weeks. Most custom applications launch in 2 to 6 months depending on scope. Ready-made products can be deployed and customised in a matter of weeks.'],
  ['Will I own the source code?', 'Yes. On custom development projects, full ownership of the source code and intellectual property is transferred to the client.'],
  ['How do you keep our data secure?', 'Kinetic Bay signs an NDA before any engagement, follows secure coding standards, uses role-based access controls, and designs systems in line with India’s data protection law and global best practices.'],
  ['Can your products be customised for our industry?', 'Yes. HRMS, VMS, PMS, CRM and Attendance are built to be tailored: workflows, fields, reports, branding and integrations can all be adapted.'],
  ['Do you work with clients outside Chennai or India?', 'Yes. Kinetic Bay serves clients across India and around the world, working remotely with regular video meetings and on-site visits when needed.'],
  ['What happens after the project goes live?', 'Kinetic Bay offers ongoing support, maintenance and enhancement plans with defined response times, so the system keeps improving as the business grows.'],
  ['Can you integrate with the software we already use?', 'Yes. Kinetic Bay regularly integrates with ERPs, accounting tools, payment gateways, biometric devices and third-party APIs.'],
];

const SERVICE_TYPES = {
  '/services/ai-automation': 'Artificial Intelligence and Workflow Automation',
  '/services/digital-engineering': 'Custom Software and Application Development',
  '/services/cybersecurity-cloud': 'Cloud Migration and Cybersecurity',
  '/services/iot': 'Industrial Internet of Things',
};

const PRODUCT_CATEGORIES = {
  '/products/hrms': 'BusinessApplication',
  '/products/vms': 'SecurityApplication',
  '/products/pms': 'BusinessApplication',
  '/products/crm': 'BusinessApplication',
  '/products/attendance': 'BusinessApplication',
};

/* ─── Builders ────────────────────────────────────────── */

const normalise = (pathname) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/');

/* ─── Sitemap ─────────────────────────────────────────────
   Generated from PAGES so a new service or product appears in the sitemap the
   moment it has metadata, instead of being forgotten in a hand-edited file. */

// Bump when page content materially changes, so lastmod stays truthful.
export const CONTENT_UPDATED = '2026-10-22';

const SITEMAP_RULES = [
  [/^\/$/, '1.0', 'weekly'],
  [/^\/(services|products)$/, '0.9', 'monthly'],
  [/^\/contact$/, '0.9', 'monthly'],
  [/^\/(services|products)\/[^/]+$/, '0.8', 'monthly'],
  [/^\/(about|solutions)$/, '0.7', 'monthly'],
];

export function sitemapXml() {
  const urls = Object.keys(PAGES).map((path) => {
    const rule = SITEMAP_RULES.find(([re]) => re.test(path));
    const [, priority, changefreq] = rule || [null, '0.6', 'yearly'];
    const loc = SITE_ORIGIN + (path === '/' ? '/' : path);
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${CONTENT_UPDATED}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** Metadata for a path, or null when the path is not a known public page. */
export function pageMeta(pathname) {
  const path = normalise(pathname);
  const entry = PAGES[path];
  if (!entry) return null;
  return { path, title: entry[0], description: entry[1], url: SITE_ORIGIN + (path === '/' ? '/' : path) };
}

function breadcrumb(path) {
  if (path === '/') return null;
  const parts = path.split('/').filter(Boolean);
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` }];
  let acc = '';
  parts.forEach((part, i) => {
    acc += `/${part}`;
    items.push({
      '@type': 'ListItem',
      position: i + 2,
      name: BREADCRUMB_LABELS[acc] || part.replace(/-/g, ' '),
      item: SITE_ORIGIN + acc,
    });
  });
  return { '@type': 'BreadcrumbList', itemListElement: items };
}

const faqSchema = () => ({
  '@type': 'FAQPage',
  mainEntity: FAQS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

/** The JSON-LD graph for a page: breadcrumbs, page type, and FAQs where useful. */
export function pageSchema(meta) {
  const { path, title, description, url } = meta;
  const graph = [];
  const crumbs = breadcrumb(path);
  if (crumbs) graph.push(crumbs);

  if (SERVICE_TYPES[path]) {
    graph.push({
      '@type': 'Service', name: title.split(' | ')[0], description,
      serviceType: SERVICE_TYPES[path], url,
      provider: { '@id': ORG_ID },
      areaServed: [{ '@type': 'Country', name: 'India' }, { '@type': 'Place', name: 'Worldwide' }],
    });
  } else if (PRODUCT_CATEGORIES[path]) {
    graph.push({
      '@type': 'SoftwareApplication', name: BREADCRUMB_LABELS[path], description, url,
      applicationCategory: PRODUCT_CATEGORIES[path],
      operatingSystem: 'Web, Android, iOS',
      publisher: { '@id': ORG_ID },
      offers: { '@type': 'Offer', priceCurrency: 'INR', price: '0', description: 'Custom quotation after a free discovery call' },
    });
  }

  // FAQs answer the questions buyers actually ask, so they feed both rich
  // results and AI answers. Kept on the pages where those questions arise.
  if (path === '/' || path === '/contact' || path === '/solutions') graph.push(faqSchema());

  if (path === '/contact') graph.push({ '@type': 'ContactPage', name: title, url });
  if (path === '/about') graph.push({ '@type': 'AboutPage', name: title, url });

  if (!graph.length) return null;
  return { '@context': 'https://schema.org', '@graph': graph.map((n) => ({ ...n, '@id': n['@id'] || `${url}#${n['@type'].toLowerCase()}` })) };
}

/** Rewrites title, description, canonical and social tags, and appends JSON-LD. */
export function injectMeta(response, meta) {
  const setContent = { element: (el) => el.setAttribute('content', meta.description) };
  const setUrl = { element: (el) => el.setAttribute('content', meta.url) };
  const setTitle = { element: (el) => el.setAttribute('content', meta.title) };
  const schema = pageSchema(meta);

  let rewriter = new HTMLRewriter()
    .on('title', { element: (el) => el.setInnerContent(meta.title) })
    .on('meta[name="description"]', setContent)
    .on('link[rel="canonical"]', { element: (el) => el.setAttribute('href', meta.url) })
    .on('meta[property="og:title"]', setTitle)
    .on('meta[property="og:description"]', setContent)
    .on('meta[property="og:url"]', setUrl)
    .on('meta[property="twitter:title"]', setTitle)
    .on('meta[property="twitter:description"]', setContent)
    .on('meta[property="twitter:url"]', setUrl);

  if (schema) {
    const json = JSON.stringify(schema).replace(/</g, '\\u003c');
    rewriter = rewriter.on('head', {
      element: (el) => el.append(`<script type="application/ld+json">${json}</script>`, { html: true }),
    });
  }
  return rewriter.transform(response);
}
