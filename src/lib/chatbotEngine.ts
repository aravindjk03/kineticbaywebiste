import { getChatbotConfig } from './cmsStore';

export interface ActionButton {
  label: string;
  action: string;
  payload?: string;
}

export interface BotResponse {
  text: string;
  triggerCard?: 'lead' | 'ticket' | 'track' | 'services_tech' | 'services_training';
  suggestedPrompts?: string[];
  actionButtons?: ActionButton[];
  isConfidentialWarning?: boolean;
}

/**
 * Deterministic rule-based conversational processor.
 * Zero-AI / Zero-LLM architecture.
 * Strictly enforces confidentiality, predefined intents, and controlled response generation.
 */
export async function processChatQuery(
  userQuery: string,
  _history: { sender: string; text: string }[] = []
): Promise<BotResponse> {
  const config = getChatbotConfig();
  const q = userQuery.toLowerCase().trim();

  /* ─── 1. STRICT CONFIDENTIALITY GUARDRAILS CHECK ────────────── */
  // Intercept any attempts to probe internal secrets, passwords, employee salaries, private keys, or CMS routes
  const confidentialPatterns = [
    'salary',
    'salaries',
    'compensation',
    'payroll',
    'password',
    'secret',
    'credential',
    'database password',
    'api key',
    'private key',
    'token',
    'cms route',
    'internal route',
    'admin path',
    'admin link',
    'nda',
    'confidential contract',
    'source code leak',
    'root password',
  ];

  const hasConfidentialKeyword =
    confidentialPatterns.some((pattern) => q.includes(pattern)) ||
    config.guardrails.some(
      (rule) =>
        rule.enabled &&
        rule.keywords.some((kw) => q.includes(kw.toLowerCase().trim()))
    );

  if (hasConfidentialKeyword) {
    return {
      text: '🛡️ **Confidentiality Notice:**\nThat information is proprietary and confidential to Kinetic Bay under our enterprise security and data privacy policies. I cannot disclose internal credentials, compensation, system configurations, or private client contracts.\n\nHow can I assist you with our public service catalogue, project proposals, or support ticketing?',
      isConfidentialWarning: true,
      suggestedPrompts: [
        'Explore Services',
        'Request 24h Proposal',
        'Raise a Support Ticket',
        'Track Existing Ticket',
      ],
      actionButtons: [
        { label: '🚀 Explore Services', action: 'services' },
        { label: '📋 Request Proposal', action: 'proposal' },
        { label: '🎫 Support Ticket', action: 'ticket' },
      ],
    };
  }

  /* ─── 2. TICKET TRACKING INTENT ─────────────────────────────── */
  if (
    q.includes('track') ||
    q.includes('ticket status') ||
    q.includes('check ticket') ||
    q.includes('ticket update') ||
    q.includes('my ticket') ||
    q.startsWith('kb-')
  ) {
    return {
      text: '🔍 **Ticket Status Tracking:**\nYou can check the live progress of any support or project ticket raised with Kinetic Bay. Enter your Ticket Reference ID (e.g. `KB-XXXXXXXX`) and the requester email address below to securely view your status.',
      triggerCard: 'track',
      suggestedPrompts: [
        'Raise a new ticket',
        'Request a project proposal',
        'Browse our services',
      ],
      actionButtons: [
        { label: '🎫 Raise New Ticket', action: 'ticket' },
        { label: '🚀 Explore Services', action: 'services' },
      ],
    };
  }

  /* ─── 3. TICKET CREATION / SUPPORT INTENT ───────────────────── */
  if (
    q.includes('raise ticket') ||
    q.includes('open ticket') ||
    q.includes('support ticket') ||
    q.includes('helpdesk') ||
    q.includes('technical issue') ||
    q.includes('bug report') ||
    q.includes('submit ticket') ||
    q.includes('need support') ||
    q.includes('problem')
  ) {
    return {
      text: '🎫 **Raise a Support or Service Ticket:**\nOur engineering team triages all incoming tickets within 2 hours during active business cycles. Please provide your ticket details below to receive a secure, high-entropy Ticket Reference ID for tracking:',
      triggerCard: 'ticket',
      suggestedPrompts: [
        'Track existing ticket',
        'What are your support categories?',
        'Talk to sales instead',
      ],
      actionButtons: [
        { label: '🔍 Track Ticket', action: 'track' },
        { label: '📋 Request Proposal', action: 'proposal' },
      ],
    };
  }

  /* ─── 4. PROPOSAL & QUOTE REQUEST INTENT ────────────────────── */
  const leadIntents = [
    'proposal',
    'quote',
    'hire',
    'start a project',
    'contact',
    'schedule a call',
    'talk to human',
    'work with you',
    'get started',
    'pricing quote',
    'book',
  ];

  if (leadIntents.some((intent) => q.includes(intent))) {
    return {
      text: '📋 **Complimentary 24-Hour Scoped Proposal:**\nWe would love to engineer your next digital product! Our software architects will formulate a tailored Architecture Roadmap, Tech Stack Analysis, and Milestone Budget within 24 hours — 100% free of charge.\n\nPlease share your project specifications below:',
      triggerCard: 'lead',
      suggestedPrompts: [
        'Tell me about SaaS Platforms',
        'What is your delivery timeline?',
        'How do you integrate with our team?',
      ],
      actionButtons: [
        { label: '🚀 Explore Services', action: 'services' },
        { label: '⚡ How We Integrate', action: 'integration' },
      ],
    };
  }

  /* ─── 5. TECHNOLOGY SERVICES EXPLORATION ─────────────────────── */
  if (
    q.includes('tech service') ||
    q.includes('it service') ||
    q.includes('software') ||
    q.includes('saas') ||
    q.includes('custom code') ||
    q.includes('agent')
  ) {
    return {
      text: `💻 **Kinetic Bay — Technology & Engineering Solutions:**

1. **SaaS Platforms (from $12K):** Multi-tenant architectures, subscription billing (Stripe), RBAC, real-time telemetry, and modern cloud deployment in 4–8 weeks.
2. **Custom Enterprise Software:** Tailored ERP, CRM, and internal workflows engineered to replace fragmented legacy tools.
3. **Brand Making & Visual Systems (from $5K):** High-conversion digital identities, design tokens, and pitch decks.
4. **SEO & AI Citation Optimization (AIO, from $2K/mo):** Dual optimization for Google organic ranking and modern AI citation engines (ChatGPT, Gemini, Perplexity).
5. **PaaS & Operations Management Software:** Scalable operations platforms, telemetry dashboards, and fleet scheduling.
6. **Autonomous AI Agents (Azure AI Foundry, from $8K):** Autonomous agent workflows with human-in-the-loop oversight and zero data leaks.`,
      triggerCard: 'services_tech',
      suggestedPrompts: [
        'How do you integrate with our project?',
        'What about Human & Training Services?',
        'Request a 24-hour proposal',
      ],
      actionButtons: [
        { label: '📋 Request 24h Proposal', action: 'proposal' },
        { label: '⚡ Training Programs', action: 'services_training' },
        { label: '🎫 Open Support Ticket', action: 'ticket' },
      ],
    };
  }

  /* ─── 6. TRAINING SERVICES EXPLORATION ───────────────────────── */
  if (
    q.includes('training') ||
    q.includes('coaching') ||
    q.includes('productivity') ||
    q.includes('leadership') ||
    q.includes('mindset') ||
    q.includes('human')
  ) {
    return {
      text: `⚡ **Kinetic Bay — Human & Organizational Training:**

1. **Productivity Systems & Deep Work (from $1.5K/squad):** Async-first operating models, tool mastery, and focus architecture that eliminate meeting drag and reclaim 15+ hours/week per engineer.
2. **IT Startup Mindset & MVP Execution (from $2K/workshop):** Founder frameworks, rapid prototyping, Lean discovery, and metrics-first iteration loops.
3. **Engineering Leadership Coaching (from $3K/track):** Hands-on mentorship turning senior technical contributors into confident, empathetic engineering managers.`,
      triggerCard: 'services_training',
      suggestedPrompts: [
        'What technology services do you offer?',
        'How do you integrate with our team?',
        'Request a training proposal',
      ],
      actionButtons: [
        { label: '📋 Request Proposal', action: 'proposal' },
        { label: '💻 Technology Services', action: 'services_tech' },
      ],
    };
  }

  /* ─── 7. GENERAL SERVICE CATALOGUE OVERVIEW ──────────────────── */
  if (
    q.includes('service') ||
    q.includes('what do you do') ||
    q.includes('what can you do') ||
    q.includes('capabilities') ||
    q.includes('offer')
  ) {
    return {
      text: `Kinetic Bay is a premier product engineering and organizational design studio. Our expertise spans two high-impact pillars:

💻 **1. IT & Engineering Solutions:**
• SaaS Platforms & Cloud Architecture
• Custom Software & Enterprise ERP/CRM
• Brand Making & Design Systems
• SEO & AI Citation Optimization (AIO)
• PaaS & Operations Management Software
• Autonomous AI Agents (Azure AI Foundry)

⚡ **2. Human & Organizational Training:**
• Team Productivity Systems & Deep Work
• IT Startup Mindset & Rapid MVP Prototyping
• Engineering Leadership Mentorship

Which area would you like to explore for your team?`,
      suggestedPrompts: [
        'Explore Technology Services',
        'Explore Training Programs',
        'Request a 24-hour proposal',
        'Raise a Support Ticket',
      ],
      actionButtons: [
        { label: '💻 Tech Solutions', action: 'services_tech' },
        { label: '⚡ Training Programs', action: 'services_training' },
        { label: '📋 Request Proposal', action: 'proposal' },
      ],
    };
  }

  /* ─── 8. INTEGRATION PLAYBOOK & WORKOUT MODELS ──────────────── */
  if (
    q.includes('integrate') ||
    q.includes('work out') ||
    q.includes('workout') ||
    q.includes('how do you work') ||
    q.includes('process') ||
    q.includes('collaboration') ||
    q.includes('engagement') ||
    q.includes('sprint') ||
    q.includes('workflow')
  ) {
    return {
      text: `🚀 **How Kinetic Bay Integrates With Your Project:**

• **1. Turnkey Product Squads:** We own the complete product lifecycle from UX and systems design to automated CI/CD deployment and launch.
• **2. Embedded Engineering Pods:** Senior Kinetic Bay engineers plug directly into your GitHub repository, Jira/Linear backlog, and sprint cycles as high-velocity contributors.
• **3. Legacy Modernization:** We decouple monolithic applications into maintainable microservices without taking down production systems.
• **4. Rapid 4–8 Week Shipping:** Battle-tested architectures shipped rapidly with full automated test coverage.
• **5. Cloud Stack Alignment:** Seamless deployment into Microsoft Azure, AWS, GCP, Cloudflare Workers, or Supabase.

Would you like us to review your technical architecture?`,
      suggestedPrompts: [
        'Request a 24-hour proposal',
        'What is your tech stack?',
        'What are your pricing terms?',
      ],
      actionButtons: [
        { label: '📋 Request Scoped Proposal', action: 'proposal' },
        { label: '💻 Tech Services', action: 'services_tech' },
      ],
    };
  }

  /* ─── 9. TECH STACK SPECIFICATIONS ─────────────────────────── */
  if (
    q.includes('tech stack') ||
    q.includes('technolog') ||
    q.includes('stack') ||
    q.includes('framework') ||
    q.includes('react') ||
    q.includes('node') ||
    q.includes('azure')
  ) {
    return {
      text: `🛠️ **Kinetic Bay Production Technology Stack:**

• **Frontend:** React 18, Next.js, TypeScript, Tailwind CSS, Three.js / WebGL, Framer Motion.
• **Backend & APIs:** Node.js (Express), Python (FastAPI), REST, GraphQL, WebSocket event streaming.
• **Cloud & Infrastructure:** Microsoft Azure, Azure AI Foundry, Docker, Kubernetes, Cloudflare, Supabase (PostgreSQL), Redis.
• **Security & Testing:** End-to-end type safety, scrypt password hashing, TOTP MFA, automated penetration test suites.`,
      suggestedPrompts: [
        'How do you integrate with our project?',
        'What services do you offer?',
        'Request a 24-hour proposal',
      ],
      actionButtons: [
        { label: '📋 Request Proposal', action: 'proposal' },
        { label: '🚀 Explore Services', action: 'services' },
      ],
    };
  }

  /* ─── 10. PRICING & TIMELINE TRANSPARENCY ──────────────────── */
  if (
    q.includes('price') ||
    q.includes('pricing') ||
    q.includes('cost') ||
    q.includes('budget') ||
    q.includes('rate') ||
    q.includes('timeline') ||
    q.includes('how long')
  ) {
    return {
      text: `💎 **Transparent, Milestone-Driven Pricing:**

• **SaaS Products & Full Platforms:** Starting from $12K (typical delivery 4–8 weeks).
• **Brand Making & Visual Identity:** Starting from $5K (typical delivery 2–3 weeks).
• **SEO & AI Citation Engine (AIO):** Starting from $2K/month retainer.
• **Custom Software & ERP/CRM:** Scoped per roadmap milestones.
• **Productivity & Leadership Training:** Starting from $1.5K per squad program.

Every engagement begins with a **Free 24-Hour Scoped Proposal** with exact milestones and timelines before any commitment is made.`,
      triggerCard: 'lead',
      suggestedPrompts: [
        'Request a 24-hour proposal',
        'Tell me about SaaS Platforms',
        'Raise a Support Ticket',
      ],
      actionButtons: [
        { label: '📋 Request 24h Proposal', action: 'proposal' },
        { label: '🎫 Support Ticket', action: 'ticket' },
      ],
    };
  }

  /* ─── 11. COMPANY BACKGROUND & LEADERSHIP ──────────────────── */
  if (
    q.includes('who are you') ||
    q.includes('company') ||
    q.includes('kinetic bay') ||
    q.includes('team') ||
    q.includes('founder') ||
    q.includes('about')
  ) {
    return {
      text: `🏢 **About Kinetic Bay:**
Founded by ex-Google engineering leadership, Kinetic Bay combines veteran software architects, design thinkers, and organizational psychologists who have delivered 180+ successful digital products globally.

We are committed to building resilient software and organizational systems that align with modern engineering excellence and the United Nations Sustainable Development Goals (SDGs).`,
      suggestedPrompts: [
        'What services do you offer?',
        'How do you integrate with our project?',
        'Request a 24-hour proposal',
      ],
      actionButtons: [
        { label: '🚀 Explore Services', action: 'services' },
        { label: '📋 Request Proposal', action: 'proposal' },
      ],
    };
  }

  /* ─── 12. FAQ MATCHING (FALLBACK PRESET) ─────────────────────── */
  for (const faq of config.faqs) {
    const faqQ = faq.question.toLowerCase();
    const faqWords = faqQ.split(' ').filter((w) => w.length > 3);
    const matches = faqWords.filter((w) => q.includes(w)).length;
    if (q.includes(faqQ) || matches >= 3) {
      return {
        text: faq.answer,
        suggestedPrompts: [
          'How do you integrate with our project?',
          'Request a 24-hour proposal',
          'Raise a Support Ticket',
        ],
        actionButtons: [
          { label: '📋 Request Proposal', action: 'proposal' },
          { label: '🎫 Support Ticket', action: 'ticket' },
        ],
      };
    }
  }

  /* ─── 13. DETERMINISTIC HELPFUL FALLBACK ─────────────────────── */
  return {
    text: `I'm here to assist you with Kinetic Bay's services and technical dispatch. Here are the most common things I can help you with immediately:`,
    suggestedPrompts: [
      'Explore Technology Services',
      'Request 24h Proposal',
      'Raise a Support Ticket',
      'Track Existing Ticket',
    ],
    actionButtons: [
      { label: '🚀 Explore Services', action: 'services' },
      { label: '📋 Request Proposal', action: 'proposal' },
      { label: '🎫 Raise Ticket', action: 'ticket' },
      { label: '🔍 Track Ticket', action: 'track' },
    ],
  };
}
