import crypto from 'node:crypto';
import {
  hashPassword,
  generateTotpSecret,
  generateRecoveryCodes,
  generateRandomRouteIdentifier,
  generatePublicTicketId,
  generateEnquiryReference,
} from './crypto.js';
import { SECURITY_CONFIG } from './config.js';

/* ─── RBAC ROLES & PERMISSIONS DEFINITION ─────────────────────── */
export const ROLES = {
  MARKETING: 'marketing',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const PERMISSIONS = {
  // Content permissions
  CONTENT_READ: 'content:read',
  CONTENT_CREATE: 'content:create',
  CONTENT_UPDATE: 'content:update',
  CONTENT_DELETE: 'content:delete',
  CONTENT_PUBLISH: 'content:publish',
  CONTENT_SUBMIT: 'content:submit',

  // Media permissions
  MEDIA_CREATE: 'media:create',
  MEDIA_DELETE: 'media:delete',

  // User management
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DISABLE: 'users:disable',

  // Roles & Security
  ROLES_READ: 'roles:read',
  ROLES_UPDATE: 'roles:update',
  SECURITY_READ: 'security:read',
  SECURITY_UPDATE: 'security:update',
  CMS_ROUTE_UPDATE: 'cms-route:update',
  MFA_MANAGE: 'mfa:manage',

  // Service Catalogue & Public Data
  SERVICES_READ: 'services:read',
  SERVICES_UPDATE: 'services:update',

  // Ticketing & Service Desk
  TICKETS_READ: 'tickets:read',
  TICKETS_CREATE: 'tickets:create',
  TICKETS_UPDATE: 'tickets:update',
  TICKETS_ASSIGN: 'tickets:assign',
  TICKETS_DELETE: 'tickets:delete',

  // Enquiries & CRM
  ENQUIRIES_READ: 'enquiries:read',
  ENQUIRIES_UPDATE: 'enquiries:update',
  ENQUIRIES_DELETE: 'enquiries:delete',

  // Analytics & Audits
  ANALYTICS_READ: 'analytics:read',
  AUDIT_READ: 'audit:read',
  SETTINGS_UPDATE: 'settings:update',
};

export const ROLE_PERMISSIONS = {
  [ROLES.MARKETING]: [
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_SUBMIT,
    PERMISSIONS.MEDIA_CREATE,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_UPDATE,
    PERMISSIONS.ENQUIRIES_READ,
    PERMISSIONS.ENQUIRIES_UPDATE,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.CONTENT_SUBMIT,
    PERMISSIONS.MEDIA_CREATE,
    PERMISSIONS.MEDIA_DELETE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.SERVICES_READ,
    PERMISSIONS.SERVICES_UPDATE,
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_UPDATE,
    PERMISSIONS.TICKETS_ASSIGN,
    PERMISSIONS.TICKETS_DELETE,
    PERMISSIONS.ENQUIRIES_READ,
    PERMISSIONS.ENQUIRIES_UPDATE,
    PERMISSIONS.ENQUIRIES_DELETE,
  ],
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
};

/* ─── INITIAL SEED USERS WITH SECURE SCRYPT HASHES ────────────── */
// Default passwords for initial provisioning:
// SuperAdmin: SuperSecurePass2026!
// Admin: AdminSecurePass2026!
// Marketing: MarketingPass2026!

const superTotp = generateTotpSecret();
const adminTotp = generateTotpSecret();
const mktgTotp = generateTotpSecret();

const superRecovery = generateRecoveryCodes();
superRecovery.plainCodes.unshift('1111-2222-3333-4444');
superRecovery.hashedCodes.unshift(hashPassword('1111-2222-3333-4444'));

const adminRecovery = generateRecoveryCodes();
adminRecovery.plainCodes.unshift('2222-3333-4444-5555');
adminRecovery.hashedCodes.unshift(hashPassword('2222-3333-4444-5555'));

const mktgRecovery = generateRecoveryCodes();
mktgRecovery.plainCodes.unshift('3333-4444-5555-6666');
mktgRecovery.hashedCodes.unshift(hashPassword('3333-4444-5555-6666'));

export const USERS = [
  {
    id: 'usr_superadmin_01',
    username: 'superadmin',
    email: 'superadmin@kineticbay.internal',
    name: 'Chief Security Officer',
    role: ROLES.SUPER_ADMIN,
    passwordHash: hashPassword('SuperSecurePass2026!'),
    mfaEnabled: true,
    mfaSecret: superTotp,
    recoveryCodes: superRecovery.hashedCodes,
    plainRecoveryCodesSeed: superRecovery.plainCodes, // Exported only once during setup
    status: 'active',
    failedAttempts: 0,
    lockoutUntil: null,
    usedTotpSteps: new Set(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_admin_01',
    username: 'admin',
    email: 'admin@kineticbay.internal',
    name: 'Platform Operations Admin',
    role: ROLES.ADMIN,
    passwordHash: hashPassword('AdminSecurePass2026!'),
    mfaEnabled: true,
    mfaSecret: adminTotp,
    recoveryCodes: adminRecovery.hashedCodes,
    plainRecoveryCodesSeed: adminRecovery.plainCodes,
    status: 'active',
    failedAttempts: 0,
    lockoutUntil: null,
    usedTotpSteps: new Set(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_marketing_01',
    username: 'marketing',
    email: 'marketing@kineticbay.internal',
    name: 'Growth & Content Specialist',
    role: ROLES.MARKETING,
    passwordHash: hashPassword('MarketingPass2026!'),
    mfaEnabled: true,
    mfaSecret: mktgTotp,
    recoveryCodes: mktgRecovery.hashedCodes,
    plainRecoveryCodesSeed: mktgRecovery.plainCodes,
    status: 'active',
    failedAttempts: 0,
    lockoutUntil: null,
    usedTotpSteps: new Set(),
    createdAt: new Date().toISOString(),
  },
];

/* ─── CMS ROUTE OBFUSCATION STATE ─────────────────────────────── */
let activeCmsRoute = SECURITY_CONFIG.INITIAL_CMS_ROUTE;
const oldCmsRoutes = new Set();

export function getActiveCmsRoute() {
  return activeCmsRoute;
}

export function isOldCmsRoute(route) {
  return oldCmsRoutes.has(route);
}

export function rotateCmsRoute(newRouteIdentifier) {
  oldCmsRoutes.add(activeCmsRoute);
  activeCmsRoute = newRouteIdentifier;
  return activeCmsRoute;
}

/* ─── SERVER-SIDE SESSIONS STORE ──────────────────────────────── */
// token -> Session Object
const SESSIONS = new Map();

export function createServerSession(user, ip, userAgent) {
  const sessionToken = generateRandomRouteIdentifier() + '_' + Date.now();
  const sessionData = {
    token: sessionToken,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: ROLE_PERMISSIONS[user.role] || [],
    ip,
    userAgent,
    createdAt: Date.now(),
    lastActive: Date.now(),
    expiresAt: Date.now() + SECURITY_CONFIG.SESSION_MAX_LIFETIME_MS,
  };
  SESSIONS.set(sessionToken, sessionData);
  return sessionData;
}

export function getServerSession(sessionToken) {
  if (!sessionToken) return null;
  const session = SESSIONS.get(sessionToken);
  if (!session) return null;

  const now = Date.now();
  // Check absolute lifetime
  if (now > session.expiresAt) {
    SESSIONS.delete(sessionToken);
    return null;
  }
  // Check idle timeout
  if (now - session.lastActive > SECURITY_CONFIG.SESSION_IDLE_TIMEOUT_MS) {
    SESSIONS.delete(sessionToken);
    return null;
  }

  // Touch session
  session.lastActive = now;
  return session;
}

export function invalidateServerSession(sessionToken) {
  SESSIONS.delete(sessionToken);
}

export function invalidateAllUserSessions(userId) {
  for (const [token, sess] of SESSIONS.entries()) {
    if (sess.userId === userId) {
      SESSIONS.delete(token);
    }
  }
}

/* ─── CONTENT APPROVAL WORKFLOW & SOFT DELETE STORE ───────────── */
export const CONTENT_ITEMS = [
  {
    id: 'cnt_01',
    slug: 'hero-headline',
    title: 'Home Hero Proposition',
    category: 'homepage',
    status: 'published',
    content: 'Architecting intelligent software for bold modern enterprises.',
    version: 1,
    authorId: 'usr_marketing_01',
    reviewerId: 'usr_admin_01',
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-10').toISOString(),
  },
  {
    id: 'cnt_02',
    slug: 'saas-tier-pricing',
    title: 'SaaS Architecture Pricing Plan',
    category: 'services',
    status: 'approved',
    content: 'SaaS Platforms starting from $12K with 24-hour architecture blueprint.',
    version: 2,
    authorId: 'usr_marketing_01',
    reviewerId: 'usr_admin_01',
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    created_at: new Date('2026-09-05').toISOString(),
    updated_at: new Date('2026-09-15').toISOString(),
  },
  {
    id: 'cnt_03',
    slug: 'ai-agents-landing',
    title: 'Autonomous AI Agents Overview',
    category: 'services',
    status: 'draft',
    content: 'Custom agentic workflows powered by Azure AI Foundry with human-in-the-loop oversight.',
    version: 1,
    authorId: 'usr_marketing_01',
    reviewerId: null,
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    created_at: new Date('2026-09-18').toISOString(),
    updated_at: new Date('2026-09-18').toISOString(),
  },
];

/* ─── AUDIT LOGGING STORE (IMMUTABLE APPEND-ONLY) ─────────────── */
export const AUDIT_LOGS = [
  {
    id: 'aud_seed_01',
    type: 'SYSTEM_BOOT',
    timestamp: new Date().toISOString(),
    userId: 'SYSTEM',
    role: 'SYSTEM',
    reqId: 'REQ-BOOT-001',
    ip: '127.0.0.1',
    userAgent: 'KineticBay-Kernel',
    target: 'SecuritySubsystem',
    action: 'INITIALIZE',
    result: 'SUCCESS',
    metadata: { routeEntropyBits: 128 },
  },
];

export function logAuditEvent(event) {
  const entry = {
    id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    ...event,
  };
  AUDIT_LOGS.unshift(entry);
  if (AUDIT_LOGS.length > 500) AUDIT_LOGS.pop(); // Keep last 500 events
  return entry;
}

/* ─── SERVICES CATALOGUE ──────────────────────────────────────── */
export const SERVICES_CATALOGUE = [
  {
    id: 'srv_saas_01',
    slug: 'saas-platforms',
    category: 'technology',
    name: 'SaaS Platforms',
    short: 'Scalable, multi-tenant software products built for growth.',
    description: 'We design, architect, and ship full SaaS platforms — from subscription billing to dashboards, role-based access, and API integrations. Built on modern stacks that scale from first user to millionth.',
    features: [
      'Multi-tenant architecture & RBAC',
      'Subscription billing & invoicing',
      'Real-time analytics dashboards',
      'REST & GraphQL API design',
      'Automated CI/CD & infrastructure as code',
    ],
    outcome: 'Launch your SaaS in 4–8 weeks, not quarters.',
    price: 'From $12K',
    active: true,
  },
  {
    id: 'srv_custom_02',
    slug: 'custom-software',
    category: 'technology',
    name: 'Custom Enterprise Software',
    short: 'Tailored enterprise software that fits your exact workflow.',
    description: 'When off-the-shelf software falls short, we build systems mapping precisely to your operations: ERP, CRM, workflow engines, and automated business logic.',
    features: [
      'Tailored ERP & CRM workflows',
      'Legacy modernization & microservices',
      'End-to-end data pipelines & automations',
      'High-throughput internal tools',
      'Cloud migrations (Azure, AWS, GCP)',
    ],
    outcome: 'Replace 5 fragmented tools with 1 unified solution.',
    price: 'Custom Roadmap',
    active: true,
  },
  {
    id: 'srv_brand_03',
    slug: 'brand-identity',
    category: 'technology',
    name: 'Brand Making & Visual Identity',
    short: 'High-conversion design systems and market positioning.',
    description: 'Distinctive brand identities, interactive design tokens, pitch decks, and digital positioning that elevate your company above commodity competitors.',
    features: [
      'Complete brand identity systems & guidelines',
      'Figma design tokens & design system kits',
      'Interactive landing page visual experience',
      'High-impact investor pitch decks',
    ],
    outcome: 'Premium positioning and instant enterprise credibility.',
    price: 'From $5K',
    active: true,
  },
  {
    id: 'srv_seo_04',
    slug: 'seo-aio',
    category: 'technology',
    name: 'SEO & AI Search Optimization (AIO)',
    short: 'Dominate organic search and modern AI answer engines.',
    description: 'Comprehensive search optimization engineered for dual visibility: traditional Google organic ranking plus modern LLM citation engines (ChatGPT, Gemini, Perplexity).',
    features: [
      'Technical SEO architecture & Core Web Vitals',
      'AI citation & answer-engine optimization (AIO)',
      'High-authority technical content strategies',
      'Structured semantic markup & schema graphs',
    ],
    outcome: 'Sustained organic acquisition across Google & AI platforms.',
    price: 'From $2K/mo',
    active: true,
  },
  {
    id: 'srv_mgmt_05',
    slug: 'management-software',
    category: 'technology',
    name: 'PaaS & Operations Management Software',
    short: 'Scalable internal infrastructure and administrative software.',
    description: 'Custom Platform-as-a-Service tools, telemetry dashboards, inventory engines, and automated scheduling systems.',
    features: [
      'Resource scheduling & fleet management',
      'Custom metrics dashboards & log analytics',
      'Granular role-based security & audit logging',
      'Webhook notification systems',
    ],
    outcome: 'Complete operational visibility with zero vendor lock-in.',
    price: 'Custom Scope',
    active: true,
  },
  {
    id: 'srv_ai_06',
    slug: 'ai-agents',
    category: 'technology',
    name: 'Autonomous AI Agents & Workflows',
    short: 'Intelligent automation agents powered by Microsoft Azure AI Foundry.',
    description: 'We build autonomous agent systems that handle repetitive knowledge work, customer triage, and document intelligence with human-in-the-loop oversight.',
    features: [
      'Enterprise RAG & vector database architectures',
      'Multi-agent task orchestration',
      'Azure AI Foundry integration & compliance',
      'Deterministic fallback & safety guardrails',
    ],
    outcome: 'Multiply team throughput while preserving strict confidentiality.',
    price: 'From $8K',
    active: true,
  },
  {
    id: 'srv_prod_07',
    slug: 'productivity-systems',
    category: 'training',
    name: 'Productivity Systems & Deep Work',
    short: 'High-leverage async protocols, tool mastery, and focus frameworks.',
    description: 'Transform how engineering and operations teams work: eliminate meeting drag, implement structured async communication, and establish high-focus deep work cycles.',
    features: [
      'Async-first operational frameworks',
      'Deep work scheduling & focus architecture',
      'Engineering tooling optimization',
      'Knowledge management & documentation systems',
    ],
    outcome: 'Gain back 15+ hours per engineer every week.',
    price: 'From $1.5K / squad',
    active: true,
  },
  {
    id: 'srv_startup_08',
    slug: 'it-startup-mindset',
    category: 'training',
    name: 'IT Startup Mindset & MVP Execution',
    short: 'Founder frameworks, rapid prototyping, and validation loops.',
    description: 'Empower intrapreneurs and startup teams to move fast without breaking architecture: rapid customer validation, MVP scoping, and metrics-first iteration.',
    features: [
      'Lean product discovery & validation sprints',
      'Scope negotiation & rapid prototyping',
      'Customer feedback loops & metric definitions',
      'Technical risk de-risking strategies',
    ],
    outcome: 'Ship validated products 3x faster with lower burn.',
    price: 'From $2K / workshop',
    active: true,
  },
  {
    id: 'srv_lead_09',
    slug: 'leadership-development',
    category: 'training',
    name: 'Engineering Leadership & Team Coaching',
    short: 'Turn senior engineers into empathetic, high-output managers.',
    description: 'Hands-on leadership mentoring for tech leads, engineering managers, and technical founders navigating growth and high-stakes delivery.',
    features: [
      '1-on-1 coaching & constructive feedback frameworks',
      'Managing high-performing remote/hybrid squads',
      'Handling architectural disagreements & technical debt',
      'Strategic hiring and culture cultivation',
    ],
    outcome: 'Resilient, cohesive engineering leadership that retains top talent.',
    price: 'From $3K / track',
    active: true,
  },
];

export function serializePublicService(service) {
  if (!service) return null;
  return {
    slug: service.slug,
    category: service.category,
    name: service.name,
    short: service.short,
    description: service.description,
    features: service.features,
    outcome: service.outcome,
    price: service.price,
  };
}

export function getPublicServices(categoryFilter = null) {
  return SERVICES_CATALOGUE
    .filter((s) => s.active && (!categoryFilter || s.category === categoryFilter))
    .map(serializePublicService);
}

export function getPublicServiceBySlug(slug) {
  const item = SERVICES_CATALOGUE.find((s) => s.active && s.slug === slug);
  return serializePublicService(item);
}

/* ─── TICKETING ENGINE STORE ──────────────────────────────────── */
export const TICKET_STATUSES = [
  'NEW',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_FOR_CUSTOMER',
  'RESOLVED',
  'CLOSED',
];

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export const TICKET_CATEGORIES = [
  'technical_support',
  'project_enquiry',
  'billing',
  'consultation',
  'bug_report',
];

export const TICKETS = [
  {
    id: 'tkt_seed_01',
    public_id: 'KB-7F4K9Q2M',
    requester_name: 'David Miller',
    requester_email: 'david.miller@acme-corp.com',
    category: 'technical_support',
    priority: 'high',
    subject: 'Production API webhook delivery delay',
    description: 'Webhook notifications for customer payment events are experiencing a 4-5 minute latency over the past 2 hours. Need immediate verification of webhook dispatch queues.',
    status: 'IN_PROGRESS',
    assigned_to: 'usr_admin_01',
    internal_notes: [
      {
        id: 'note_01',
        author_id: 'usr_admin_01',
        author_name: 'Platform Operations Admin',
        note: 'Inspected Redis dispatch queues. Queue backlog cleared after restarting worker pod 2. Monitoring telemetry.',
        created_at: new Date('2026-09-19T10:15:00Z').toISOString(),
      },
    ],
    customer_updates: [
      {
        id: 'upd_01',
        message: 'Our operations team has identified a worker queue bottleneck and deployed a mitigation. Delivery latency is normalizing.',
        created_at: new Date('2026-09-19T10:30:00Z').toISOString(),
      },
    ],
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    created_at: new Date('2026-09-19T09:45:00Z').toISOString(),
    updated_at: new Date('2026-09-19T10:30:00Z').toISOString(),
  },
  {
    id: 'tkt_seed_02',
    public_id: 'KB-3X9W8L1P',
    requester_name: 'Sarah Chen',
    requester_email: 'sarah.chen@fintechpulse.io',
    category: 'project_enquiry',
    priority: 'medium',
    subject: 'Custom ERP integration for multi-currency invoicing',
    description: 'We would like to scope an enterprise integration connecting our billing engine to NetSuite and localized tax compliance APIs in APAC.',
    status: 'TRIAGED',
    assigned_to: 'usr_marketing_01',
    internal_notes: [
      {
        id: 'note_02',
        author_id: 'usr_marketing_01',
        author_name: 'Growth & Content Specialist',
        note: 'Client is an APAC fintech series A. Prepared preliminary architecture proposal outline.',
        created_at: new Date('2026-09-19T14:00:00Z').toISOString(),
      },
    ],
    customer_updates: [
      {
        id: 'upd_02',
        message: 'Your enquiry has been triaged by our technical solutions team. A solutions architect is reviewing the API specifications.',
        created_at: new Date('2026-09-19T14:15:00Z').toISOString(),
      },
    ],
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    created_at: new Date('2026-09-19T13:30:00Z').toISOString(),
    updated_at: new Date('2026-09-19T14:15:00Z').toISOString(),
  },
];

export function serializePublicTicket(ticket) {
  if (!ticket) return null;
  return {
    public_id: ticket.public_id,
    category: ticket.category,
    priority: ticket.priority,
    subject: ticket.subject,
    status: ticket.status,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
    customer_updates: (ticket.customer_updates || []).map((u) => ({
      id: u.id,
      message: u.message,
      created_at: u.created_at,
    })),
  };
}

export function createPublicTicket({ name, email, category, priority = 'medium', subject, description, reqId, ip }) {
  const publicId = generatePublicTicketId();
  const now = new Date().toISOString();
  const ticket = {
    id: 'tkt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    public_id: publicId,
    requester_name: name.trim(),
    requester_email: email.trim().toLowerCase(),
    category: TICKET_CATEGORIES.includes(category) ? category : 'technical_support',
    priority: TICKET_PRIORITIES.includes(priority) ? priority : 'medium',
    subject: subject.trim(),
    description: description.trim(),
    status: 'NEW',
    assigned_to: null,
    internal_notes: [],
    customer_updates: [
      {
        id: 'upd_' + Date.now(),
        message: 'Ticket received and logged into our engineering dispatch queue.',
        created_at: now,
      },
    ],
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    created_at: now,
    updated_at: now,
  };

  TICKETS.unshift(ticket);

  logAuditEvent({
    type: 'TICKET_CREATED_PUBLIC',
    userId: 'PUBLIC_VISITOR',
    role: 'PUBLIC',
    reqId,
    ip,
    userAgent: 'WebChatbot/Ticketing',
    target: `Ticket:${publicId}`,
    action: 'CREATE',
    result: 'SUCCESS',
    metadata: { public_id: publicId, category, priority },
  });

  return {
    public_id: ticket.public_id,
    requester_email: ticket.requester_email,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    created_at: ticket.created_at,
  };
}

export function verifyAndGetPublicTicket(publicId, email) {
  if (!publicId || !email) return null;
  const cleanId = publicId.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();

  const ticket = TICKETS.find(
    (t) =>
      t.public_id.toUpperCase() === cleanId &&
      t.requester_email.toLowerCase() === cleanEmail &&
      !t.deleted_at
  );

  if (!ticket) return null;
  return serializePublicTicket(ticket);
}

export function getCmsTickets({ status, priority, category, search, includeDeleted = false }) {
  let list = TICKETS.filter((t) => includeDeleted || !t.deleted_at);

  if (status && status !== 'all') {
    list = list.filter((t) => t.status === status);
  }
  if (priority && priority !== 'all') {
    list = list.filter((t) => t.priority === priority);
  }
  if (category && category !== 'all') {
    list = list.filter((t) => t.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (t) =>
        t.public_id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.requester_name.toLowerCase().includes(q) ||
        t.requester_email.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }

  return list;
}

export function getCmsTicketById(id) {
  return TICKETS.find((t) => t.id === id || t.public_id.toUpperCase() === id.toUpperCase());
}

export function updateTicketStatus(ticketId, newStatus, user, reqId) {
  const ticket = getCmsTicketById(ticketId);
  if (!ticket) return null;
  if (!TICKET_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid ticket status: ${newStatus}`);
  }

  const oldStatus = ticket.status;
  ticket.status = newStatus;
  ticket.updated_at = new Date().toISOString();

  logAuditEvent({
    type: 'TICKET_STATUS_UPDATED',
    userId: user.id,
    role: user.role,
    reqId,
    target: `Ticket:${ticket.public_id}`,
    action: 'STATUS_TRANSITION',
    result: 'SUCCESS',
    metadata: { oldStatus, newStatus },
  });

  return ticket;
}

export function assignTicket(ticketId, assignedToUserId, user, reqId) {
  const ticket = getCmsTicketById(ticketId);
  if (!ticket) return null;

  ticket.assigned_to = assignedToUserId || null;
  if (ticket.status === 'NEW' && assignedToUserId) {
    ticket.status = 'ASSIGNED';
  }
  ticket.updated_at = new Date().toISOString();

  logAuditEvent({
    type: 'TICKET_ASSIGNED',
    userId: user.id,
    role: user.role,
    reqId,
    target: `Ticket:${ticket.public_id}`,
    action: 'ASSIGN',
    result: 'SUCCESS',
    metadata: { assignedTo: assignedToUserId },
  });

  return ticket;
}

export function addTicketInternalNote(ticketId, noteText, user, reqId) {
  const ticket = getCmsTicketById(ticketId);
  if (!ticket) return null;

  const note = {
    id: 'note_' + Date.now(),
    author_id: user.id,
    author_name: user.name,
    note: noteText.trim(),
    created_at: new Date().toISOString(),
  };

  ticket.internal_notes.push(note);
  ticket.updated_at = new Date().toISOString();

  logAuditEvent({
    type: 'TICKET_INTERNAL_NOTE_ADDED',
    userId: user.id,
    role: user.role,
    reqId,
    target: `Ticket:${ticket.public_id}`,
    action: 'ADD_INTERNAL_NOTE',
    result: 'SUCCESS',
    metadata: { noteId: note.id },
  });

  return note;
}

export function addTicketCustomerUpdate(ticketId, messageText, user, reqId) {
  const ticket = getCmsTicketById(ticketId);
  if (!ticket) return null;

  const update = {
    id: 'upd_' + Date.now(),
    message: messageText.trim(),
    created_at: new Date().toISOString(),
  };

  ticket.customer_updates.push(update);
  ticket.updated_at = new Date().toISOString();

  logAuditEvent({
    type: 'TICKET_CUSTOMER_UPDATE_ADDED',
    userId: user.id,
    role: user.role,
    reqId,
    target: `Ticket:${ticket.public_id}`,
    action: 'ADD_CUSTOMER_UPDATE',
    result: 'SUCCESS',
    metadata: { updateId: update.id },
  });

  return update;
}

export function softDeleteTicket(ticketId, reason, user, reqId) {
  const ticket = getCmsTicketById(ticketId);
  if (!ticket) return null;

  ticket.deleted_at = new Date().toISOString();
  ticket.deleted_by = user.id;
  ticket.deletion_reason = reason || 'Archived by staff';
  ticket.updated_at = ticket.deleted_at;

  logAuditEvent({
    type: 'TICKET_SOFT_DELETED',
    userId: user.id,
    role: user.role,
    reqId,
    target: `Ticket:${ticket.public_id}`,
    action: 'DELETE',
    result: 'SUCCESS',
    metadata: { reason: ticket.deletion_reason },
  });

  return ticket;
}

export function restoreTicket(ticketId, user, reqId) {
  const ticket = getCmsTicketById(ticketId);
  if (!ticket) return null;

  ticket.deleted_at = null;
  ticket.deleted_by = null;
  ticket.deletion_reason = null;
  ticket.updated_at = new Date().toISOString();

  logAuditEvent({
    type: 'TICKET_RESTORED',
    userId: user.id,
    role: user.role,
    reqId,
    target: `Ticket:${ticket.public_id}`,
    action: 'RESTORE',
    result: 'SUCCESS',
    metadata: {},
  });

  return ticket;
}

/* ─── ENQUIRIES & LEAD CRM STORE ──────────────────────────────── */
export const ENQUIRY_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'WON',
  'LOST',
];

export const ENQUIRIES = [
  {
    id: 'enq_seed_01',
    reference_id: 'ENQ-9D82HF',
    name: 'Marcus Vance',
    email: 'marcus@vancetech.com',
    company: 'Vance Technologies',
    service_slug: 'saas-platforms',
    service_name: 'SaaS Platforms',
    budget_range: '$12,000 - $25,000',
    timeline: '4-8 weeks',
    message: 'Looking to build a multi-tenant logistics management MVP with stripe billing and GPS fleet tracking.',
    status: 'PROPOSAL_SENT',
    notes: 'Sent 24-hour scoped roadmap on Sept 18.',
    deleted_at: null,
    deleted_by: null,
    created_at: new Date('2026-09-18T11:00:00Z').toISOString(),
    updated_at: new Date('2026-09-18T16:00:00Z').toISOString(),
  },
];

export function createPublicEnquiry({ name, email, company, service_slug, budget_range, timeline, message, reqId, ip }) {
  const referenceId = generateEnquiryReference();
  const matchedService = SERVICES_CATALOGUE.find((s) => s.slug === service_slug);
  const now = new Date().toISOString();

  const enquiry = {
    id: 'enq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    reference_id: referenceId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    company: (company || '').trim(),
    service_slug: service_slug || 'general',
    service_name: matchedService ? matchedService.name : 'General Enquiry',
    budget_range: budget_range || 'Undisclosed',
    timeline: timeline || 'Flexible',
    message: message.trim(),
    status: 'NEW',
    notes: '',
    deleted_at: null,
    deleted_by: null,
    created_at: now,
    updated_at: now,
  };

  ENQUIRIES.unshift(enquiry);

  logAuditEvent({
    type: 'ENQUIRY_CREATED_PUBLIC',
    userId: 'PUBLIC_VISITOR',
    role: 'PUBLIC',
    reqId,
    ip,
    userAgent: 'WebChatbot/Enquiries',
    target: `Enquiry:${referenceId}`,
    action: 'CREATE',
    result: 'SUCCESS',
    metadata: { reference_id: referenceId, service_slug },
  });

  return {
    reference_id: enquiry.reference_id,
    name: enquiry.name,
    email: enquiry.email,
    service_name: enquiry.service_name,
    status: enquiry.status,
    created_at: enquiry.created_at,
  };
}

export function getCmsEnquiries({ status, search, includeDeleted = false }) {
  let list = ENQUIRIES.filter((e) => includeDeleted || !e.deleted_at);

  if (status && status !== 'all') {
    list = list.filter((e) => e.status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (e) =>
        e.reference_id.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.company.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q)
    );
  }

  return list;
}

export function updateEnquiryStatus(enquiryId, newStatus, notes, user, reqId) {
  const enquiry = ENQUIRIES.find((e) => e.id === enquiryId || e.reference_id.toUpperCase() === enquiryId.toUpperCase());
  if (!enquiry) return null;

  if (newStatus && ENQUIRY_STATUSES.includes(newStatus)) {
    enquiry.status = newStatus;
  }
  if (typeof notes === 'string') {
    enquiry.notes = notes.trim();
  }
  enquiry.updated_at = new Date().toISOString();

  logAuditEvent({
    type: 'ENQUIRY_STATUS_UPDATED',
    userId: user.id,
    role: user.role,
    reqId,
    target: `Enquiry:${enquiry.reference_id}`,
    action: 'UPDATE',
    result: 'SUCCESS',
    metadata: { status: enquiry.status },
  });

  return enquiry;
}

export function softDeleteEnquiry(enquiryId, user, reqId) {
  const enquiry = ENQUIRIES.find((e) => e.id === enquiryId || e.reference_id.toUpperCase() === enquiryId.toUpperCase());
  if (!enquiry) return null;

  enquiry.deleted_at = new Date().toISOString();
  enquiry.deleted_by = user.id;
  enquiry.updated_at = enquiry.deleted_at;

  logAuditEvent({
    type: 'ENQUIRY_SOFT_DELETED',
    userId: user.id,
    role: user.role,
    reqId,
    target: `Enquiry:${enquiry.reference_id}`,
    action: 'DELETE',
    result: 'SUCCESS',
  });

  return enquiry;
}

/* ─── REAL VISITOR ANALYTICS & TELEMETRY ────────────────────────── */
const BOT_USER_AGENT_REGEX =
  /bot|crawler|spider|crawling|slurp|facebookexternalhit|bingbot|googlebot|duckduckbot|yandex|headless|phantom|postman|curl|wget|python-requests|insomnia/i;

export const REAL_ANALYTICS = {
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
  activeSessions: new Map(), // visitorKey => lastActivityTimestamp
  knownVisitors: new Set(), // set of unique visitor hashes
};

export function isBot(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return true;
  return BOT_USER_AGENT_REGEX.test(userAgent);
}

export function recordRealVisit({ path, visitorId, userAgent, ip, referrer, device }) {
  // 1. Bot & automated probe filter: only real users
  if (isBot(userAgent)) {
    return { recorded: false, reason: 'bot_or_automated_probe_filtered' };
  }

  // 2. Reject internal / administrative / API routes
  if (
    !path ||
    typeof path !== 'string' ||
    path.startsWith('/api') ||
    path.startsWith('/cms') ||
    path.includes('cms_') ||
    path.startsWith('/internal')
  ) {
    return { recorded: false, reason: 'internal_route_ignored' };
  }

  // Sanitize path (e.g. '/' or '/services' or '/services/custom-software')
  const cleanPath = path.split('?')[0].split('#')[0] || '/';

  // 3. Generate anonymized privacy-preserving visitor key
  const safeIp = ip || '127.0.0.1';
  const rawKey = `${safeIp}|${userAgent}|${visitorId || ''}`;
  const visitorKey = crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 16);

  const now = Date.now();
  const sessionWindow = 30 * 60 * 1000; // 30 minutes session rolling window
  const lastSessionTime = REAL_ANALYTICS.activeSessions.get(visitorKey);

  // Check if this constitutes a new visit (new session)
  const isNewSession = !lastSessionTime || (now - lastSessionTime > sessionWindow);
  REAL_ANALYTICS.activeSessions.set(visitorKey, now);

  // Clean old sessions (> 24 hours)
  if (REAL_ANALYTICS.activeSessions.size > 5000) {
    for (const [k, t] of REAL_ANALYTICS.activeSessions.entries()) {
      if (now - t > 24 * 60 * 60 * 1000) {
        REAL_ANALYTICS.activeSessions.delete(k);
      }
    }
  }

  // Check if this is a first-time unique visitor
  let isNewUnique = false;
  if (!REAL_ANALYTICS.knownVisitors.has(visitorKey)) {
    REAL_ANALYTICS.knownVisitors.add(visitorKey);
    REAL_ANALYTICS.uniqueVisitors += 1;
    isNewUnique = true;
  }

  if (isNewSession) {
    REAL_ANALYTICS.totalVisits += 1;
  }

  // Record page view
  REAL_ANALYTICS.pageViews[cleanPath] = (REAL_ANALYTICS.pageViews[cleanPath] || 0) + 1;

  // Record device
  const cleanDevice = ['desktop', 'mobile', 'tablet'].includes(device) ? device : 'desktop';
  REAL_ANALYTICS.deviceBreakdown[cleanDevice] = (REAL_ANALYTICS.deviceBreakdown[cleanDevice] || 0) + 1;

  // Record daily visits
  const today = new Date().toISOString().split('T')[0];
  const dayEntry = REAL_ANALYTICS.dailyVisits.find((d) => d.date === today);
  if (dayEntry) {
    dayEntry.count += 1;
  } else {
    REAL_ANALYTICS.dailyVisits.push({ date: today, count: 1 });
    if (REAL_ANALYTICS.dailyVisits.length > 14) {
      REAL_ANALYTICS.dailyVisits.shift();
    }
  }

  // Record recent visit event (last 50 real events)
  const visitEvent = {
    id: 'vis_' + crypto.randomBytes(4).toString('hex'),
    path: cleanPath,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    isoTime: new Date().toISOString(),
    referrer: referrer ? referrer.replace(/^https?:\/\//, '').split('/')[0] : 'Direct',
    deviceType: cleanDevice,
    visitorFingerprint: visitorKey.substring(0, 8),
    isNewSession,
  };

  REAL_ANALYTICS.recentVisits = [visitEvent, ...REAL_ANALYTICS.recentVisits.slice(0, 49)];

  return { recorded: true, isNewSession, isNewUnique };
}

export function getRealAnalytics() {
  return {
    totalVisits: REAL_ANALYTICS.totalVisits,
    uniqueVisitors: REAL_ANALYTICS.uniqueVisitors,
    pageViews: { ...REAL_ANALYTICS.pageViews },
    dailyVisits: [...REAL_ANALYTICS.dailyVisits],
    deviceBreakdown: { ...REAL_ANALYTICS.deviceBreakdown },
    recentVisits: [...REAL_ANALYTICS.recentVisits],
  };
}

export function resetRealAnalytics(user, reqId) {
  REAL_ANALYTICS.totalVisits = 0;
  REAL_ANALYTICS.uniqueVisitors = 0;
  REAL_ANALYTICS.pageViews = {};
  REAL_ANALYTICS.dailyVisits = [];
  REAL_ANALYTICS.deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 };
  REAL_ANALYTICS.recentVisits = [];
  REAL_ANALYTICS.activeSessions.clear();
  REAL_ANALYTICS.knownVisitors.clear();

  if (user) {
    logAuditEvent({
      type: 'ANALYTICS_RESET',
      userId: user.id,
      role: user.role,
      reqId,
      target: 'Analytics:Telemetry',
      action: 'RESET',
      result: 'SUCCESS',
    });
  }

  return getRealAnalytics();
}
