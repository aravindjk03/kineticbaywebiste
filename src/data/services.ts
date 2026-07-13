import {
  Cloud, Code2, Palette, Search, Brain, Users, Target, Zap, Shield, Layers, Workflow, Rocket,
} from 'lucide-react';

export interface Service {
  slug: string;
  category: 'it' | 'human';
  icon: typeof Cloud;
  name: string;
  short: string;
  description: string;
  features: string[];
  outcome: string;
  price: string;
}

export const itServices: Service[] = [
  {
    slug: 'saas-platforms',
    category: 'it',
    icon: Cloud,
    name: 'SaaS Platforms',
    short: 'Scalable, multi-tenant software products built for growth.',
    description:
      'We design, architect, and ship full SaaS platforms — from subscription billing to dashboards, role-based access, and API integrations. Built on modern stacks that scale from first user to millionth.',
    features: [
      'Multi-tenant architecture',
      'Subscription billing & invoicing',
      'Role-based access control',
      'Real-time analytics dashboards',
      'REST & GraphQL API design',
      'CI/CD pipeline setup',
    ],
    outcome: 'Launch your SaaS in weeks, not quarters.',
    price: 'From $12K',
  },
  {
    slug: 'custom-software',
    category: 'it',
    icon: Code2,
    name: 'Custom Software',
    short: 'Tailored enterprise software that fits your exact workflow.',
    description:
      'When off-the-shelf doesn\'t cut it, we build software that maps precisely to your operations — ERP, CRM, internal tools, and automation systems designed around how your team actually works.',
    features: [
      'ERP & CRM systems',
      'Internal tooling & admin panels',
      'Process automation',
      'Legacy system modernization',
      'Third-party API integration',
      'Cloud migration & DevOps',
    ],
    outcome: 'Replace 5 tools with 1 that just works.',
    price: 'Custom quote',
  },
  {
    slug: 'brand-identity',
    category: 'it',
    icon: Palette,
    name: 'Brand Making',
    short: 'Identity systems that make tech companies unforgettable.',
    description:
      'We craft brand identities from logo to launch — visual systems, voice, messaging, and digital presence that position your startup as the obvious choice in a crowded market.',
    features: [
      'Logo & visual identity system',
      'Brand guidelines & style guide',
      'Messaging & positioning',
      'Website & landing page design',
      'Social media kit',
      'Pitch deck design',
    ],
    outcome: 'Look like a Series B company from day one.',
    price: 'From $5K',
  },
  {
    slug: 'seo-aio',
    category: 'it',
    icon: Search,
    name: 'SEO & AIO',
    short: 'Rank on Google and AI engines with optimization that lasts.',
    description:
      'Search engine optimization meets AI optimization. We help your brand show up in Google results, ChatGPT answers, and AI-powered search — because the future of discovery is hybrid.',
    features: [
      'Technical SEO audit & fixes',
      'AI Optimization (AIO) for LLMs',
      'Content strategy & creation',
      'Keyword & competitor research',
      'Local SEO & Google Business',
      'Monthly performance reporting',
    ],
    outcome: 'Be the answer, not just a result.',
    price: 'From $2K/mo',
  },
  {
    slug: 'management-software',
    category: 'it',
    icon: Layers,
    name: 'Management Software (SaaS & PaaS)',
    short: 'Operations software delivered as SaaS or platform-as-a-service.',
    description:
      'From project management to HR, inventory to finance — we deliver management software as SaaS or PaaS so your team can configure, extend, and scale without rebuilding from scratch.',
    features: [
      'Project & task management',
      'HR & payroll modules',
      'Inventory & supply chain',
      'Finance & reporting',
      'PaaS extension marketplace',
      'White-label options',
    ],
    outcome: 'One platform for every department.',
    price: 'From $3K/mo',
  },
];

export const humanServices: Service[] = [
  {
    slug: 'productivity-training',
    category: 'human',
    icon: Zap,
    name: 'Productivity Training',
    short: 'Systems and frameworks that make teams measurably faster.',
    description:
      'We train teams on productivity systems that stick — deep work protocols, async communication, time-blocking, and tool mastery. Not theory — practical workflows your team uses Monday morning.',
    features: [
      'Deep work & focus protocols',
      'Async communication systems',
      'Time-blocking & priority frameworks',
      'Tool mastery (Notion, Linear, Slack)',
      'Meeting reduction strategies',
      'Personal energy management',
    ],
    outcome: 'Reclaim 10+ hours per person, per week.',
    price: 'From $1.5K',
  },
  {
    slug: 'team-building',
    category: 'human',
    icon: Users,
    name: 'Team Building',
    short: 'Build teams that trust, communicate, and execute together.',
    description:
      'Structured team-building programs that go beyond trust falls. We use behavioral frameworks, collaborative challenges, and feedback systems to create teams that actually like working together.',
    features: [
      'Behavioral profiling (DiSC, etc.)',
      'Collaborative challenge workshops',
      'Feedback & conflict resolution',
      'Remote team cohesion protocols',
      'Team charter & operating rhythms',
      'Quarterly offsite facilitation',
    ],
    outcome: 'Turn a group of people into a real team.',
    price: 'From $2K',
  },
  {
    slug: 'startup-mindset',
    category: 'human',
    icon: Brain,
    name: 'IT Startup Mindset',
    short: 'Founder training for the realities of building a tech company.',
    description:
      'Our flagship program for aspiring and early-stage IT founders. Covering everything from MVP thinking and pivot frameworks to investor communication and the mental models behind successful startups.',
    features: [
      'MVP & lean startup methodology',
      'Pivot & perseverance frameworks',
      'Investor pitch & communication',
      'Product-market fit testing',
      'Mental models for founders',
      '1-on-1 founder mentoring',
    ],
    outcome: 'Think like a founder who actually ships.',
    price: 'From $3K',
  },
  {
    slug: 'leadership-development',
    category: 'human',
    icon: Target,
    name: 'Leadership Development',
    short: 'Grow technical leaders who can manage people, not just code.',
    description:
      'For senior engineers and tech leads stepping into management. We bridge the gap between technical excellence and people leadership — coaching, delegation, strategy, and team performance.',
    features: [
      'From IC to manager transition',
      'Coaching & delegation skills',
      'Strategic decision-making',
      'Performance & growth conversations',
      'Cross-functional leadership',
      'Executive presence coaching',
    ],
    outcome: 'Become the leader your team chooses to follow.',
    price: 'From $2.5K',
  },
  {
    slug: 'workflow-optimization',
    category: 'human',
    icon: Workflow,
    name: 'Workflow Optimization',
    short: 'Audit, redesign, and automate how your team gets work done.',
    description:
      'We map your team\'s actual workflows, find the bottlenecks, and redesign them — combining process improvement with automation so work flows faster with less friction.',
    features: [
      'Workflow audit & mapping',
      'Bottleneck identification',
      'Process redesign & documentation',
      'Automation opportunity analysis',
      'SOP creation & training',
      'Continuous improvement loops',
    ],
    outcome: 'Cut cycle times by 40% or more.',
    price: 'From $4K',
  },
];

export const allServices = [...itServices, ...humanServices];

export const stats = [
  { value: 180, suffix: '+', label: 'Projects Delivered' },
  { value: 120, suffix: '+', label: 'Satisfied Clients' },
  { value: 15, suffix: '', label: 'Countries Served' },
  { value: 98, suffix: '%', label: 'Client Retention' },
];

export const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'CEO, DataFlow Inc.',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',
    quote:
      'Nexora rebuilt our entire SaaS platform in 8 weeks. We went from struggling with legacy code to signing enterprise deals. The 3D dashboard they built still blows our clients away.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Founder, BrightPath AI',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200',
    quote:
      'The productivity training transformed how our remote team operates. We cut meetings by 60% and shipped our MVP a month early. Worth every penny.',
    rating: 5,
  },
  {
    name: 'Priya Patel',
    role: 'CTO, LendStack',
    image: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=200',
    quote:
      'Their custom software replaced six different tools we were paying for. The team understood our domain faster than any vendor we\'ve worked with.',
    rating: 5,
  },
  {
    name: 'David Kim',
    role: 'COO, MetricWorks',
    image: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=200',
    quote:
      'From brand identity to SEO to team training — Nexora handled everything. Our organic traffic is up 300% and our team finally operates like a real startup.',
    rating: 5,
  },
];

export const team = [
  {
    name: 'Arjun Mehta',
    role: 'Founder & CEO',
    image: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=600',
    bio: 'Ex-Google engineer turned founder. 12+ years building SaaS platforms and leading tech teams across three continents.',
    linkedin: '#',
  },
  {
    name: 'Sofia Ramirez',
    role: 'Head of Design',
    image: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=600',
    bio: 'Award-winning brand designer who has shaped identities for 40+ startups. Believes great design is invisible — until it isn\'t.',
    linkedin: '#',
  },
  {
    name: 'Kenji Tanaka',
    role: 'Lead Engineer',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=600',
    bio: 'Full-stack architect specializing in multi-tenant SaaS and PaaS. Has shipped products used by over 2M people.',
    linkedin: '#',
  },
  {
    name: 'Amara Okafor',
    role: 'Head of Human Training',
    image: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=600',
    bio: 'Organizational psychologist and ICF-certified coach. Has trained 500+ founders and teams on productivity and leadership.',
    linkedin: '#',
  },
  {
    name: 'Liam O\'Brien',
    role: 'SEO & AIO Strategist',
    image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=600',
    bio: 'Pioneered AI Optimization before it had a name. Has helped clients rank in both Google and ChatGPT results.',
    linkedin: '#',
  },
  {
    name: 'Yuki Watanabe',
    role: 'Product Manager',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=600',
    bio: 'Bridges the gap between human training and software. Turns team workflows into product features that scale.',
    linkedin: '#',
  },
];

export const values = [
  { icon: Shield, title: 'Build for Real', desc: 'We ship software that works in production, not just demos.' },
  { icon: Brain, title: 'Humans First', desc: 'Technology serves people — not the other way around.' },
  { icon: Rocket, title: 'Speed with Substance', desc: 'Fast delivery without cutting corners on quality.' },
  { icon: Target, title: 'Measure Everything', desc: 'If it can\'t be measured, it doesn\'t count as progress.' },
];
