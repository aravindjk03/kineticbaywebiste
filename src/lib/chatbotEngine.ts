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

  /* ─── 2. TICKET SUBMISSION INQUIRY & STATUS CHECK ─────────── */
  let storedTickets: any[] = [];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('kb_user_tickets');
      if (raw) storedTickets = JSON.parse(raw);
    }
  } catch {}

  const isSubmissionInquiry =
    /\b(is|was|did|has|show|check|view|get|see|my)\b.*?\b(submitted|logged|created|received|filed|registered|saved|confirmed)\b/i.test(q) ||
    /\b(ticket|tickets|issue)\b.*?\b(submitted|status|update|progress|reference|id|exist|saved)\b/i.test(q) ||
    /\b(is it submitted|did it submit|is my ticket submitted|ticket submitted|submitted ticket|my ticket|where is my ticket|ticket id)\b/i.test(q) ||
    q.includes('is it submitted') ||
    q.includes('ticket is submitted') ||
    q.includes('did it submit') ||
    q.includes('submitted ticket') ||
    q.includes('ticket submitted');

  if (isSubmissionInquiry) {
    if (storedTickets.length > 0) {
      const latest = storedTickets[0];
      return {
        text: `✅ **Yes! Your ticket is successfully submitted and queued in our system.**\n\nHere are the details on file:\n• **Ticket Reference ID:** \`${latest.public_id}\`\n• **Subject:** ${latest.subject}\n• **Status:** \`${latest.status || 'NEW'}\` (Queued in Dispatch Queue)\n• **Registered Email:** \`${latest.email}\`\n• **Submitted:** ${new Date(latest.created_at || Date.now()).toLocaleString()}\n\nOur engineering team triages all queued tickets within our guaranteed 24-hour SLA. You can inspect live progress, logs, or agent responses right below:`,
        triggerCard: 'track',
        suggestedPrompts: [
          `Track ticket ${latest.public_id}`,
          'Raise another ticket',
          'Explore our services',
        ],
        actionButtons: [
          { label: `🔍 Track Ticket ${latest.public_id}`, action: 'track', payload: latest.public_id },
          { label: '🎫 Raise Another Ticket', action: 'ticket' },
          { label: '🚀 Explore Services', action: 'services' },
        ],
      };
    } else {
      return {
        text: `🔍 **Ticket Verification & Status Lookup:**\nIf you recently submitted a ticket, you can verify and track its live status below by entering your **Ticket Reference ID** (format \`KB-XXXXXXXX\`) and email.\n\nIf you haven't raised one yet, click **Raise Support Ticket** below:`,
        triggerCard: 'track',
        suggestedPrompts: [
          'Raise a new ticket',
          'Request a project proposal',
          'Browse our services',
        ],
        actionButtons: [
          { label: '🎫 Raise Support Ticket', action: 'ticket' },
          { label: '📋 Request Proposal', action: 'proposal' },
        ],
      };
    }
  }

  /* ─── 2.5 TICKET TRACKING INTENT ────────────────────────────── */
  const isTrackingIntent =
    q.startsWith('kb-') ||
    /\bkb-[a-z0-9]{4,12}\b/i.test(q) ||
    (/\b(track|tracking|status|lookup|check status)\b/i.test(q) && /\b(ticket|tickets|issue|ref)\b/i.test(q)) ||
    q.includes('ticket status') ||
    q.includes('check ticket') ||
    q.includes('ticket update') ||
    q.includes('my ticket') ||
    q.includes('track');

  if (isTrackingIntent) {
    if (storedTickets.length > 0) {
      const latest = storedTickets[0];
      return {
        text: `🔍 **Ticket Status Tracking:**\nYou can check the live progress of any support or project ticket raised with Kinetic Bay.\n\n📌 **Your Active Ticket:** \`${latest.public_id}\` (${latest.subject})\n• Status: \`${latest.status || 'NEW'}\`\n• Registered Email: \`${latest.email}\`\n\nClick below to track this ticket or enter another reference ID:`,
        triggerCard: 'track',
        suggestedPrompts: [
          `Track ticket ${latest.public_id}`,
          'Raise a new ticket',
          'Browse our services',
        ],
        actionButtons: [
          { label: `🔍 Track Ticket ${latest.public_id}`, action: 'track', payload: latest.public_id },
          { label: '🎫 Raise New Ticket', action: 'ticket' },
          { label: '🚀 Explore Services', action: 'services' },
        ],
      };
    } else {
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
  }

  /* ─── 3. TICKET CREATION / SUPPORT INTENT ───────────────────── */
  const isTicketCreationIntent =
    !isSubmissionInquiry &&
    !isTrackingIntent &&
    (/\b(raise|open|create|submit|log|file|new|need|want|make)\b.*?\b(ticket|tickets)\b/i.test(q) ||
    /\b(ticket|tickets)\b/i.test(q) ||
    /\b(helpdesk|support ticket|tech support|technical support|bug report|customer support|issue report)\b/i.test(q) ||
    q.includes('raise ticket') ||
    q.includes('open ticket') ||
    q.includes('support ticket') ||
    q.includes('technical issue') ||
    q.includes('bug report') ||
    q.includes('need support') ||
    q.includes('problem') ||
    q.includes('help'));

  if (isTicketCreationIntent) {
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
      text: "📋 **Let's build the machine that fixes it.**\nTell us about your challenge. In one free, no-obligation conversation we will help you see what's possible, and exactly how to get there.\n\nFree discovery call · NDA on request · Response within 24 hours. Share a few details below:",
      triggerCard: 'lead',
      suggestedPrompts: [
        'Tell me about your products',
        'How long does a project take?',
        'How do you work?',
      ],
      actionButtons: [
        { label: '🚀 Explore Services', action: 'services' },
        { label: '⚡ How We Integrate', action: 'integration' },
      ],
    };
  }

  /* ─── 5. FOUR PILLARS OF CAPABILITY ──────────────────────────── */
  if (
    q.includes('tech service') ||
    q.includes('it service') ||
    q.includes('software') ||
    q.includes('saas') ||
    q.includes(' ai') ||
    q.startsWith('ai') ||
    q.includes('agent') ||
    q.includes('chatbot') ||
    q.includes('cloud') ||
    q.includes('security') ||
    q.includes('iot') ||
    q.includes('app development')
  ) {
    return {
      text: `💻 **Kinetic Bay — Four Pillars of Capability:**

1. **AI & Automation** — Intelligence that works while you sleep. Chatbots, autonomous AI agents, LLM fine-tuning, RAG knowledge assistants, RPA, document intelligence, predictive analytics, computer vision and voice AI.
2. **Digital Engineering** — Software built for the way you work. Custom software, web apps & SPAs, mobile apps, SaaS products, UI/UX, brand identity, integrations, legacy modernisation and QA.
3. **Cybersecurity & Cloud** — Secure foundations. Limitless scale. Cloud-native builds on Azure, AWS and Google Cloud, migration, DevSecOps, VAPT, IAM, DPDP-aligned data protection, managed cloud and disaster recovery.
4. **IoT Projects** — Connecting the physical world to intelligent decisions. Smart factory, predictive maintenance, asset & fleet tracking, energy monitoring, smart campuses and IoT dashboards.

Every quotation is fixed-scope, agreed after a free discovery session.`,
      triggerCard: 'services_tech',
      suggestedPrompts: [
        'Tell me about your products',
        'How do you work?',
        'Book a free consultation',
      ],
      actionButtons: [
        { label: '📋 Book Free Consultation', action: 'proposal' },
        { label: '📦 Our Products', action: 'services_training' },
        { label: '🎫 Open Support Ticket', action: 'ticket' },
      ],
    };
  }

  /* ─── 6. READY-TO-DEPLOY PRODUCTS ───────────────────────────── */
  if (
    q.includes('product') ||
    q.includes('hrms') ||
    q.includes('hr ') ||
    q.includes('vms') ||
    q.includes('visitor') ||
    q.includes('pms') ||
    q.includes('project management') ||
    q.includes('crm') ||
    q.includes('attendance') ||
    q.includes('biometric') ||
    q.includes('demo')
  ) {
    return {
      text: `📦 **Kinetic Bay Products — proven platforms, customised for you:**

• **Kinetic HRMS** — Your people, managed with care and clarity. Records, payroll with PF/ESI/TDS compliance, leave, performance and self-service.
• **Kinetic VMS** — Know who's in. Every time. QR pre-registration, host alerts, ID checks, badges and evacuation lists.
• **Kinetic PMS** — Every project. Every task. Total clarity. Task boards, Gantt charts, timesheets and client portals.
• **Kinetic CRM** — Turn every lead into a lasting relationship. WhatsApp lead capture, pipelines, follow-ups and forecasting.
• **Kinetic Attendance** — Accurate attendance. Zero disputes. Face, biometric, RFID and GPS check-in that flows into payroll.

Every product can be white-labelled, integrated with your existing systems and hosted on the cloud or on your own servers.`,
      triggerCard: 'services_training',
      suggestedPrompts: [
        'Request a product demo',
        'Can products be customised?',
        'What services do you offer?',
      ],
      actionButtons: [
        { label: '📋 Request a Demo', action: 'proposal' },
        { label: '💻 Our Services', action: 'services_tech' },
      ],
    };
  }

  /* ─── 7. GENERAL OVERVIEW ───────────────────────────────────── */
  if (
    q.includes('service') ||
    q.includes('what do you do') ||
    q.includes('what can you do') ||
    q.includes('capabilities') ||
    q.includes('offer')
  ) {
    return {
      text: `**Kinetic Bay — Building Machines. Shaping Humans.**
We engineer custom software, AI, cloud and IoT systems that take the heavy lifting off your business, so your people can focus on the work that truly moves you forward.

💻 **Four pillars:** AI & Automation · Digital Engineering · Cybersecurity & Cloud · IoT Projects
📦 **Five products:** Kinetic HRMS · VMS · PMS · CRM · Attendance

Which would you like to explore?`,
      suggestedPrompts: [
        'Explore our services',
        'Tell me about your products',
        'Book a free consultation',
        'Raise a Support Ticket',
      ],
      actionButtons: [
        { label: '💻 Services', action: 'services_tech' },
        { label: '📦 Products', action: 'services_training' },
        { label: '📋 Free Consultation', action: 'proposal' },
      ],
    };
  }

  /* ─── 8. HOW WE WORK ────────────────────────────────────────── */
  if (
    q.includes('integrate') ||
    q.includes('how do you work') ||
    q.includes('process') ||
    q.includes('collaboration') ||
    q.includes('engagement') ||
    q.includes('sprint') ||
    q.includes('workflow')
  ) {
    return {
      text: `🚀 **How we work — five steps from first conversation to lasting impact:**

1. **Discover** — workshops uncover goals, pain points, users and constraints.
2. **Design** — workflows, architecture and clickable prototypes before any code is written.
3. **Build** — agile sprints with a demo every week.
4. **Deploy** — secure launch, data migration and hands-on training.
5. **Evolve** — monitoring, support and new features as you grow.

**Ways to work with us:** Fixed-Scope Project · Dedicated Team · Product + Customisation · Support & Maintenance Retainer · Proof of Concept / MVP.

We also integrate with the ERPs, accounting tools, payment gateways, biometric devices and APIs you already use.`,
      suggestedPrompts: [
        'Book a free consultation',
        'How long does a project take?',
        'Will I own the source code?',
      ],
      actionButtons: [
        { label: '📋 Book Free Consultation', action: 'proposal' },
        { label: '💻 Services', action: 'services_tech' },
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
      text: `🛠️ **Technology we build with:**

• **Frontend & mobile:** React, TypeScript, modern web frameworks, Android, iOS and cross-platform apps.
• **Backend & APIs:** Node.js, Python, REST and GraphQL integrations.
• **Cloud:** Microsoft Azure, AWS and Google Cloud, with DevOps and DevSecOps pipelines.
• **AI & IoT:** LLMs, RAG, computer vision, sensors, edge computing and real-time dashboards.

We choose the stack that fits your business, not the other way round.`,
      suggestedPrompts: [
        'How do you work?',
        'What services do you offer?',
        'Book a free consultation',
      ],
      actionButtons: [
        { label: '📋 Book Free Consultation', action: 'proposal' },
        { label: '💻 Services', action: 'services_tech' },
      ],
    };
  }

  /* ─── 10. PRICING & TIMELINES ───────────────────────────────── */
  if (
    q.includes('price') ||
    q.includes('pricing') ||
    q.includes('cost') ||
    q.includes('budget') ||
    q.includes('timeline') ||
    q.includes('how long')
  ) {
    return {
      text: `💎 **Clear, fixed-scope pricing:**
Every project is different, so we give you a clear, fixed-scope quotation after a free discovery session. You will know the full cost upfront, with no hidden charges.

⏱️ **Typical timelines:** a proof of concept in 2–4 weeks, most custom applications in 2–6 months depending on scope, and our ready-made products deployed and customised in a matter of weeks.`,
      triggerCard: 'lead',
      suggestedPrompts: [
        'Book a free consultation',
        'Tell me about your products',
        'Raise a Support Ticket',
      ],
      actionButtons: [
        { label: '📋 Book Free Consultation', action: 'proposal' },
        { label: '🎫 Support Ticket', action: 'ticket' },
      ],
    };
  }

  /* ─── 11. COMPANY BACKGROUND ────────────────────────────────── */
  if (
    q.includes('who are you') ||
    q.includes('company') ||
    q.includes('kinetic bay') ||
    q.includes('team') ||
    q.includes('founder') ||
    q.includes('about') ||
    q.includes('sdg')
  ) {
    return {
      text: `🏢 **About Kinetic Bay — Born by the Bay. Built for the world.**
Headquartered in Chennai, Kinetic Bay builds custom software, AI, cloud and IoT systems for clients across India and around the world. We have delivered 40+ projects with a 99% success rate.

Our belief: the best technology doesn't replace people — it frees them. Every project is aligned with the UN Sustainable Development Goals, and through our Kinetic Catalysts programme we mentor the next generation of engineers.`,
      suggestedPrompts: [
        'What services do you offer?',
        'How do you work?',
        'Book a free consultation',
      ],
      actionButtons: [
        { label: '💻 Services', action: 'services_tech' },
        { label: '📋 Free Consultation', action: 'proposal' },
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
      'Explore our services',
      'Book a free consultation',
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
