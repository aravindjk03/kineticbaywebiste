/**
 * Per-route page metadata, injected into the HTML at the edge.
 *
 * The site is a single-page app: every route is served the same index.html, so
 * without this a crawler sees one title and a canonical pointing at the
 * homepage for every page — which reads as duplicate content and keeps the
 * inner pages out of the index. These values mirror the useSeo() calls in the
 * React pages, so what a crawler reads matches what a visitor sees.
 */

export const SITE_ORIGIN = 'https://kineticbay.in';

const PAGES = {
  '/': [
    'Kinetic Bay | Custom Software & AI Solutions, Chennai',
    'Custom software, AI, cloud & IoT solutions that make work easier and create impact. 40+ projects, 99% success. Chennai-based, serving India & the world.',
  ],
  '/about': [
    'About Kinetic Bay | Technology with SDG Purpose',
    'Chennai-born technology company that finds the friction in how organisations work and engineers it away — human-centred and aligned with the UN SDGs.',
  ],
  '/services': [
    'Services: AI, Software, Cloud & IoT | Kinetic Bay',
    'AI & automation, digital engineering, cybersecurity & cloud, and IoT projects — four pillars combined into solutions that work end to end.',
  ],
  '/services/ai-automation': [
    'AI Chatbots, AI Agents & Automation | Kinetic Bay',
    'AI chatbots, autonomous agents, LLM fine-tuning and workflow automation built around your data. Cut manual work and decide faster.',
  ],
  '/services/digital-engineering': [
    'Custom Software & App Development | Kinetic Bay',
    'Web apps, mobile apps, SaaS products and enterprise integrations designed around how you work. Fast, scalable, beautifully built.',
  ],
  '/services/cybersecurity-cloud': [
    'Cloud & Cybersecurity Services | Kinetic Bay',
    'Azure & AWS cloud-native apps, migration, DevSecOps and VAPT. Secure foundations that scale with your business.',
  ],
  '/services/iot': [
    'Industrial IoT & Smart Factory Solutions | Kinetic Bay',
    'IoT for predictive maintenance, asset tracking, energy monitoring and smart buildings. Real-time visibility, fewer breakdowns.',
  ],
  '/products': [
    'Products: HRMS, VMS, PMS, CRM & Attendance | Kinetic Bay',
    'Ready-to-deploy HRMS, visitor management, project management, CRM and smart attendance platforms — customised to your industry, workflows and brand.',
  ],
  '/products/hrms': [
    'HRMS Software with Payroll India | Kinetic HRMS',
    'All-in-one HRMS with payroll, statutory compliance, leave and performance management. Customisable for your industry. Book a demo.',
  ],
  '/products/vms': [
    'Visitor Management System Software | Kinetic VMS',
    'Digital visitor management with QR pre-registration, ID verification, badges and instant host alerts. Secure every entry.',
  ],
  '/products/pms': [
    'Project Management Software | Kinetic PMS',
    'Plan, track and deliver projects with task boards, Gantt charts, timesheets and live dashboards. Customisable to your workflow.',
  ],
  '/products/crm': [
    'CRM Software for Growing Businesses | Kinetic CRM',
    'Capture leads, automate follow-ups and close more deals with a CRM tailored to your sales process. WhatsApp-ready.',
  ],
  '/products/attendance': [
    'Biometric & Face Attendance System | Kinetic Attendance',
    'Face, biometric, RFID and GPS attendance that syncs with payroll. Accurate, dispute-free time tracking for every location.',
  ],
  '/solutions': [
    'Solutions: How We Work | Kinetic Bay',
    'A clear 5-step delivery journey — Discover, Design, Build, Deploy, Evolve — plus flexible engagement models and a partner that stays long after launch.',
  ],
  '/team': [
    'Meet the Team | Kinetic Bay',
    'A cross-functional collective of engineers, designers and strategists, mentored by experience and driven by a sustainable, safer, hands-on digital future.',
  ],
  '/contact': [
    'Contact Kinetic Bay | Book a Free Consultation',
    "Tell us about your challenge. Free discovery call, NDA on request, and a response within 24 hours from Kinetic Bay's Chennai team.",
  ],
};

/** Metadata for a path, or null when the path is not a known public page. */
export function pageMeta(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
  const entry = PAGES[path];
  if (!entry) return null;
  return { title: entry[0], description: entry[1], url: SITE_ORIGIN + (path === '/' ? '/' : path) };
}

/** Rewrites the title, description, canonical and social tags in the page head. */
export function injectMeta(response, meta) {
  const setContent = { element: (el) => el.setAttribute('content', meta.description) };
  const setUrl = { element: (el) => el.setAttribute('content', meta.url) };
  const setTitle = { element: (el) => el.setAttribute('content', meta.title) };
  return new HTMLRewriter()
    .on('title', { element: (el) => el.setInnerContent(meta.title) })
    .on('meta[name="description"]', setContent)
    .on('link[rel="canonical"]', { element: (el) => el.setAttribute('href', meta.url) })
    .on('meta[property="og:title"]', setTitle)
    .on('meta[property="og:description"]', setContent)
    .on('meta[property="og:url"]', setUrl)
    .on('meta[property="twitter:title"]', setTitle)
    .on('meta[property="twitter:description"]', setContent)
    .on('meta[property="twitter:url"]', setUrl)
    .transform(response);
}
