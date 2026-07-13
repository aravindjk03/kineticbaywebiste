import { useState } from 'react';
import { Link } from 'react-router-dom';
import DecryptedText from '../components/DecryptedText';
import ScrollFloat from '../components/ScrollFloat';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, MessageSquare, Globe, Server, Lock, Cloud, ChevronDown } from 'lucide-react';
import Reveal from '../components/Reveal';
import PageHero3D from '../components/PageHero3D';

const services = [
  {
    icon: Bot,
    title: 'AI & Agent-Based Solutions',
    hook: 'Autonomous workflows that think, decide, and act — not just automate.',
    stack: ['Azure AI Foundry', 'Python', 'Azure Functions', 'Durable Functions'],
    body: "We design and build AI-driven features — from single-purpose intelligent automations to coordinated multi-agent systems that handle classification, extraction, decision-making, and validation as part of a larger workflow.",
    bullets: [
      'Custom AI agents for document, data, or task automation',
      'Multi-agent orchestration using fan-out/fan-in and durable workflow patterns',
      'Integration of AI reasoning into existing business processes',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Chatbot & Conversational AI Integration',
    hook: "A conversational layer grounded in your own data — not generic answers.",
    stack: ['Azure AI Foundry', 'Node.js/Python', 'MongoDB Vector Search', 'Angular'],
    body: "We build and integrate chatbots — from simple FAQ/support bots to retrieval-augmented (RAG) assistants that answer questions grounded in your company's documents and data.",
    bullets: [
      'RAG-based assistants grounded in client documents/knowledge base',
      'Embeddable chat widgets for websites or internal tools',
      'Integration with existing backend systems and databases',
    ],
  },
  {
    icon: Globe,
    title: 'Single Page Applications & Web Apps',
    hook: 'Interfaces that feel instant, everywhere.',
    stack: ['Angular', 'HTML5', 'Tailwind CSS', 'Node.js'],
    body: 'We design and develop single-page applications and full front-end experiences — dashboards, admin panels, customer portals — with clean, responsive UI and solid backend integration.',
    bullets: [
      'Custom SPA development with Angular and Tailwind CSS',
      'Responsive, accessible UI across devices',
      'API integration with Node.js, Python, Java, or .NET backends',
    ],
  },
  {
    icon: Server,
    title: 'Backend & API Development',
    hook: "The infrastructure your product doesn't have to think about.",
    stack: ['Node.js', 'Python', 'Java', '.NET', 'MongoDB', 'SQL'],
    body: 'We build backend services and APIs across multiple language ecosystems, tailored to your existing stack or a fresh architecture, with clean data modeling in SQL and/or MongoDB.',
    bullets: [
      'REST API design and development in Node.js, Python, Java, or .NET',
      'Database design across SQL and MongoDB, including polyglot setups',
      'Secure, scalable backend architecture',
    ],
  },
  {
    icon: Lock,
    title: 'Access Control & Permission Systems',
    hook: 'Know exactly who can do what — and prove it.',
    stack: ['Node.js', 'MongoDB', 'Angular'],
    body: 'We implement resource-action based (ABAC) permission systems in place of rigid role flags, including an admin UI for managing roles and a migration path from legacy access models.',
    bullets: [
      'Centralized permission registry and enforcement middleware',
      'Migration tooling for adopting fine-grained access control in existing systems',
      'Admin UI for managing roles, resources, and permissions',
    ],
  },
  {
    icon: Cloud,
    title: 'Cloud Infrastructure & DevOps on Azure',
    hook: 'Deployments that just work, every time.',
    stack: ['Azure App Service', 'Function Apps', 'YAML', 'GitHub Actions / Azure DevOps'],
    body: 'We set up and troubleshoot Azure App Service and Function App environments, manage environment variables and configuration, and build CI/CD pipelines for automated deployment.',
    bullets: [
      'App Service & Function App configuration and environment variable management',
      'CI/CD pipeline setup with YAML for automated build-test-deploy',
      'Deployment troubleshooting and reliability improvements',
    ],
  },
];

const faqs = [
  { q: 'Do you work with startups or only larger organizations?', a: 'Both. Engagement scope adjusts to your stage — from a single AI feature to a full platform build.' },
  { q: 'What does a typical engagement look like?', a: 'Discover → Design → Build → Deploy & Measure. Most engagements start with a scoped discovery call.' },
  { q: 'Can you work within your existing tech stack?', a: 'Yes — our backend work spans Node.js, Python, Java, and .NET specifically so we can slot into what you already run.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = q.replace(/\s+/g, '-').slice(0, 30);
  return (
    <div className="faq-item">
      <button
        className="w-full flex items-start justify-between gap-4 text-left group"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
      >
        <span className="font-body font-semibold text-ink text-[16px] sm:text-[17px] leading-snug group-hover:text-primary transition-colors">{q}</span>
        <ChevronDown className={`w-5 h-5 text-primary shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <motion.p
          id={id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 text-text-secondary text-[15px] leading-relaxed"
        >
          {a}
        </motion.p>
      )}
    </div>
  );
}

export default function Services() {
  return (
    <div className="overflow-hidden bg-bg">

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative min-h-[50vh] flex items-end pb-16 pt-32 border-b border-border overflow-hidden">
        <div className="glow-orb w-[500px] h-[300px] bg-primary/10 top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2" />
        <PageHero3D shape="torus" />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 w-full">
          <Reveal>
            <p className="eyebrow mb-4">Services</p>
            <h1
              className="font-heading font-bold text-ink leading-[1.05] tracking-[-0.02em] mb-5 max-w-2xl"
              style={{ fontSize: 'clamp(34px, 5vw, 64px)' }}
            >
              <DecryptedText
                text="Technology, engineered "
                animateOn="view"
                sequential
                revealDirection="start"
                speed={35}
                encryptedClassName="decrypt-encrypted"
              />
              <span className="text-gradient-primary">
                <DecryptedText
                  text="with intent."
                  animateOn="view"
                  sequential
                  revealDirection="start"
                  speed={35}
                  encryptedClassName="decrypt-encrypted"
                />
              </span>
            </h1>
            <p className="text-text-secondary leading-relaxed max-w-xl text-base sm:text-lg md:text-xl">
              Six specializations, each backed by hands-on delivery experience — not a checklist of buzzwords.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── SERVICE BLOCKS ───────────────────────── */}
      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6 space-y-5">
          {services.map(({ icon: Icon, title, hook, stack, body, bullets }, i) => (
            <Reveal key={title} delay={i * 50}>
              <div className="kb-card p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-heading font-semibold text-ink text-xl sm:text-2xl leading-[1.25] mb-1">
                      <DecryptedText
                        text={title}
                        animateOn="view"
                        sequential
                        revealDirection="start"
                        speed={28}
                        encryptedClassName="decrypt-encrypted"
                      />
                    </h2>
                    <p className="text-primary font-medium text-[14px] sm:text-[15px] mb-3 italic">"{hook}"</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {stack.map((s) => <span key={s} className="stack-tag">{s}</span>)}
                    </div>
                    <p className="text-text-secondary text-[14px] sm:text-[15px] leading-relaxed mb-4">{body}</p>
                    <ul className="space-y-2">
                      {bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] text-text-secondary">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-6"><div className="current-mark" /></div>

      {/* ── FAQ ──────────────────────────────────── */}
      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <p className="eyebrow mb-3">FAQ</p>
            <h2 className="font-heading font-semibold text-ink leading-[1.15] tracking-[-0.01em] mb-10 text-2xl sm:text-3xl md:text-4xl">
              <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.04}>Before you reach out</ScrollFloat>
            </h2>
          </Reveal>
          <Reveal>
            <div className="max-w-2xl">
              {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA BAND ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#050607] border-t border-border">
        <div className="glow-orb w-[500px] h-[300px] bg-primary/10 bottom-0 left-1/2 -translate-x-1/2" />
        <div className="max-w-[1200px] mx-auto px-6 py-20 sm:py-24 text-center relative z-10">
          <Reveal>
            <h2 className="font-heading font-semibold text-ink leading-[1.15] tracking-[-0.01em] mb-5 text-2xl sm:text-3xl md:text-4xl">
              <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.03}>Ready to scope your project?</ScrollFloat>
            </h2>
            <p className="text-text-secondary text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-8">
              Book a scoped discovery call — no commitment, just clarity.
            </p>
            <Link to="/contact" className="btn-accent inline-flex items-center gap-2 rounded-lg">
              Start a Project <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
