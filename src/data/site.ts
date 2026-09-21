/**
 * Single source of truth for public website copy.
 * Aligned with the "Kinetic Bay Website Content Blueprint" v1.0 (September 2026).
 */
import {
  BrainCircuit, Code2, ShieldCheck, Network,
  Users, DoorOpen, KanbanSquare, Handshake, Fingerprint,
  Factory, HeartPulse, GraduationCap, ShoppingBag, Truck, Building2, Landmark, Briefcase, Globe2,
  type LucideIcon,
} from 'lucide-react';

export const brand = {
  name: 'Kinetic Bay',
  tagline: 'Building Machines. Shaping Humans.',
  email: 'Kineticbay@gmail.com',
  linkedin: 'https://linkedin.com/company/kineticbay',
  city: 'Chennai, Tamil Nadu, India',
};

/* ─── HERO ─────────────────────────────────────────────── */

export const hero = {
  eyebrow: 'Kinetic Bay · Technology for Industry & Humanity',
  headline: ['Building Machines.', 'Shaping Humans.'],
  sub: 'We engineer custom software, AI, cloud and IoT systems that take the heavy lifting off your business — so your people can focus on the work that truly moves you forward.',
  primary: 'Start Your Project',
  secondary: 'Explore Our Products',
  trust: ['40+ projects delivered', '99% success rate', 'Headquartered in Chennai, serving clients across India and the world'],
};

/* ─── PHILOSOPHY ───────────────────────────────────────── */

export const philosophy = {
  eyebrow: 'Our Philosophy',
  title: 'Two halves of one promise.',
  intro: 'Most technology companies stop at the software. We believe that is only half the job. Every system we build has two outcomes: a machine that works flawlessly, and a human whose work becomes lighter, smarter and more meaningful.',
  machines: {
    title: 'Building Machines',
    body: "We design and engineer custom software, AI agents, cloud platforms and connected IoT systems tailored to the way your industry really works. No bloated templates. No forcing your process into someone else's product. Just intelligent systems that remove friction, cut manual effort and deliver impact you can measure.",
    micro: ['Custom software', 'AI & automation', 'Cloud', 'IoT'],
  },
  humans: {
    title: 'Shaping Humans',
    body: 'When the repetitive work disappears, people get their time back. Teams make better decisions with better data. Employees are managed fairly and transparently. And through our Kinetic Catalysts programme, we mentor the next generation of engineers who will build tomorrow\'s solutions. Technology is our tool. People are our purpose.',
    micro: ['Empowered teams', 'Fair workplaces', 'Future-ready talent'],
  },
};

/* ─── SDG MISSION ──────────────────────────────────────── */

export const sdgIntro = {
  eyebrow: 'Impact Beyond Code',
  title: 'Every project moves the world forward.',
  body: 'The United Nations set 17 Sustainable Development Goals for a better planet by 2030. We asked a simple question: how can a technology company contribute, not with slogans, but with the actual systems we build? The answer shapes every project we take on. Here are the goals our work advances.',
  closer: "We don't just build technology that works. We build technology that matters.",
};

// Official UN SDG palette colours
export const sdgs = [
  { num: 9, title: 'Industry, Innovation & Infrastructure', color: '#FD6925', body: 'We modernise industries with custom software, AI and IoT, helping traditional businesses become digital, efficient and competitive.' },
  { num: 8, title: 'Decent Work & Economic Growth', color: '#A21942', body: 'Our HRMS and attendance platforms create fair, transparent workplaces, while automation lifts productivity so businesses can grow and hire.' },
  { num: 4, title: 'Quality Education', color: '#C5192D', body: "Through Kinetic Catalysts, we train and mentor young engineers in real-world technology, building India's future-ready talent." },
  { num: 11, title: 'Sustainable Cities & Communities', color: '#FD9D24', body: 'Our IoT solutions power smarter buildings, safer campuses and connected infrastructure.' },
  { num: 12, title: 'Responsible Consumption & Production', color: '#BF8B2E', body: 'Paperless workflows and real-time monitoring reduce waste, energy use and resource loss across operations.' },
  { num: 17, title: 'Partnerships for the Goals', color: '#19486A', body: 'We work alongside businesses, institutions and communities, because lasting change is always a shared effort.' },
];

/* ─── IMPACT BOARD ─────────────────────────────────────── */

export const impact = {
  eyebrow: 'Our Track Record',
  title: 'Results that speak before we do.',
  stats: [
    { value: 40, suffix: '+', label: 'Projects Delivered', sub: 'Across industries & continents' },
    { value: 99, suffix: '%', label: 'Success Rate', sub: 'Delivered on scope, on quality' },
    { word: 'Pan-India', label: 'Presence', sub: 'Headquartered in Chennai' },
    { word: 'Global', label: 'Clients', sub: 'Happily serving around the world' },
  ] as { value?: number; suffix?: string; word?: string; label: string; sub: string }[],
  closer: 'From growing start-ups to established enterprises, businesses trust Kinetic Bay to turn complex challenges into systems that simply work.',
};

/* ─── PILLARS ──────────────────────────────────────────── */

export interface Pillar {
  slug: string;
  icon: LucideIcon;
  name: string;
  tagline: string;
  intro: string;
  services: { name: string; body: string }[];
  outcome: string;
  cta: string;
  seoTitle: string;
  seoDescription: string;
}

export const pillarsIntro = {
  eyebrow: 'What We Do',
  title: 'Four pillars. One goal: your success.',
  body: 'Whatever your challenge, it almost always sits in one of four places: intelligence, engineering, security or connectivity. We have built deep expertise in each, and we know how to combine them into a single solution that works end to end.',
};

export const pillars: Pillar[] = [
  {
    slug: 'ai-automation',
    icon: BrainCircuit,
    name: 'AI & Automation',
    tagline: 'Intelligence that works while you sleep.',
    intro: 'Artificial intelligence is no longer a future bet. It is the fastest way to cut costs, speed up decisions and deliver better customer experiences. We design AI that fits your data, your workflows and your goals, and we make sure it is secure, explainable and actually used.',
    services: [
      { name: 'AI Chatbots & Virtual Assistants', body: '24/7 customer and employee support on your website, WhatsApp or internal tools, answering questions in multiple languages, including Indian languages.' },
      { name: 'Autonomous AI Agents', body: 'Digital workers that complete multi-step tasks on their own: qualifying leads, processing orders, scheduling, updating records and reporting back.' },
      { name: 'LLM Training & Fine-Tuning', body: "Large language models trained on your domain data so they speak your industry's language accurately and securely." },
      { name: 'RAG Knowledge Assistants', body: 'Ask a question, get an instant answer from your own documents, policies and manuals, with sources cited.' },
      { name: 'Workflow & Process Automation (RPA)', body: 'Eliminate repetitive data entry, approvals and report generation across departments.' },
      { name: 'Document Intelligence', body: 'Extract, classify and validate data from invoices, forms, IDs and contracts automatically.' },
      { name: 'Predictive Analytics', body: 'Forecast demand, spot risks and uncover trends before they affect your business.' },
      { name: 'Computer Vision', body: 'Visual inspection, quality control, safety monitoring and object recognition for factories and facilities.' },
      { name: 'Voice AI', body: 'Speech-to-text, call analytics and voice-driven assistants for contact centres and field teams.' },
    ],
    outcome: 'Fewer manual hours, faster decisions and customer experiences that feel personal at scale.',
    cta: 'Discuss Your AI Project',
    seoTitle: 'AI Chatbots, AI Agents & Automation | Kinetic Bay',
    seoDescription: 'AI chatbots, autonomous agents, LLM fine-tuning and workflow automation built around your data. Cut manual work and decide faster.',
  },
  {
    slug: 'digital-engineering',
    icon: Code2,
    name: 'Digital Engineering',
    tagline: 'Software built for the way you work.',
    intro: 'Off-the-shelf software makes you adapt to it. We do the opposite. Our engineers study your processes, then design and build digital products that fit like they were always meant to be there: fast, scalable, beautifully designed and easy to use.',
    services: [
      { name: 'Custom Software Development', body: 'End-to-end software tailored to your exact business requirements, from idea to launch and beyond.' },
      { name: 'Web Applications & SPAs', body: 'High-performance single-page applications and portals that load instantly and feel effortless.' },
      { name: 'Mobile App Development', body: 'Android, iOS and cross-platform apps that your customers and teams will love to use.' },
      { name: 'SaaS Product Engineering', body: 'We help founders turn ideas into scalable, subscription-ready products.' },
      { name: 'UI/UX Design', body: 'Research-led, human-centred interfaces that reduce training time and increase adoption.' },
      { name: 'Brand Building & Digital Identity', body: 'Logos, brand systems and websites that make your business look as good as it performs.' },
      { name: 'Enterprise Integration & APIs', body: 'Connect ERP, CRM, payment gateways and third-party tools into one seamless flow.' },
      { name: 'Legacy Modernisation', body: 'Upgrade outdated systems to modern, cloud-ready architecture without disrupting operations.' },
      { name: 'Quality Assurance & Testing', body: 'Manual and automated testing so every release is stable, fast and bug-free.' },
    ],
    outcome: 'Software your team actually enjoys using, delivered on time and built to grow with you.',
    cta: 'Discuss Your Digital Project',
    seoTitle: 'Custom Software & App Development | Kinetic Bay',
    seoDescription: 'Web apps, mobile apps, SaaS products and enterprise integrations designed around how you work. Fast, scalable, beautifully built.',
  },
  {
    slug: 'cybersecurity-cloud',
    icon: ShieldCheck,
    name: 'Cybersecurity & Cloud',
    tagline: 'Secure foundations. Limitless scale.',
    intro: 'Your data is your most valuable asset, and your infrastructure is what keeps the lights on. We build cloud environments that scale with demand and security practices that protect you from day one, not as an afterthought.',
    services: [
      { name: 'Cloud-Native Development', body: 'Applications designed for Microsoft Azure, AWS and Google Cloud that scale automatically and cost less to run.' },
      { name: 'Cloud Migration', body: 'Move from on-premise servers to the cloud with a clear plan, zero data loss and minimal downtime.' },
      { name: 'DevOps & DevSecOps', body: 'Automated build, test and deployment pipelines with security checks built into every step.' },
      { name: 'Vulnerability Assessment & Penetration Testing (VAPT)', body: 'We find the weaknesses in your apps and networks before attackers do.' },
      { name: 'Identity & Access Management', body: 'Single sign-on, multi-factor authentication and role-based access that keeps the right people in and everyone else out.' },
      { name: 'Data Protection & Compliance', body: "Security controls and processes aligned with India's Digital Personal Data Protection Act and global standards your clients expect." },
      { name: 'Managed Cloud & Monitoring', body: '24/7 monitoring, cost optimisation and performance tuning, so you never worry about uptime.' },
      { name: 'Backup & Disaster Recovery', body: 'Business continuity plans that get you back online fast when the unexpected happens.' },
    ],
    outcome: 'Peace of mind: infrastructure that scales on demand and data that stays protected.',
    cta: 'Discuss Your Cybersecurity Project',
    seoTitle: 'Cloud & Cybersecurity Services | Kinetic Bay',
    seoDescription: 'Azure & AWS cloud-native apps, migration, DevSecOps and VAPT. Secure foundations that scale with your business.',
  },
  {
    slug: 'iot',
    icon: Network,
    name: 'IoT Projects',
    tagline: 'Connecting the physical world to intelligent decisions.',
    intro: 'Machines, buildings and assets generate valuable data every second. Most of it is never captured. We design IoT solutions, from sensors to dashboards, that turn that data into real-time visibility and smarter action.',
    services: [
      { name: 'Industry 4.0 & Smart Factory', body: 'Monitor machine health, output and downtime in real time across your shop floor.' },
      { name: 'Predictive Maintenance', body: 'Sensors and AI detect wear before breakdowns happen, saving repair costs and lost production.' },
      { name: 'Asset & Fleet Tracking', body: 'Know where your vehicles, equipment and inventory are, always.' },
      { name: 'Energy Monitoring', body: 'Track and reduce power, water and fuel consumption to cut costs and emissions.' },
      { name: 'Smart Buildings & Campuses', body: 'Automated access, lighting, climate and safety systems for offices, schools and facilities.' },
      { name: 'Environmental & Safety Sensing', body: 'Air quality, temperature, gas and occupancy monitoring with instant alerts.' },
      { name: 'IoT Dashboards & Edge Computing', body: 'Custom dashboards and on-site processing that turn raw sensor data into clear decisions.' },
    ],
    outcome: 'Complete visibility of your operations, fewer breakdowns and a measurable drop in waste.',
    cta: 'Discuss Your IoT Project',
    seoTitle: 'Industrial IoT & Smart Factory Solutions | Kinetic Bay',
    seoDescription: 'IoT for predictive maintenance, asset tracking, energy monitoring and smart buildings. Real-time visibility, fewer breakdowns.',
  },
];

/* ─── PRODUCTS ─────────────────────────────────────────── */

export interface Product {
  slug: string;
  icon: LucideIcon;
  short: string;
  name: string;
  full: string;
  tagline: string;
  body: string;
  features: string[];
  ideal: string;
  seoTitle: string;
  seoDescription: string;
}

export const productsIntro = {
  eyebrow: 'Our Products',
  title: 'Proven platforms. Customised for you.',
  body: 'Why build from zero when you can start from strength? Our ready-to-deploy products solve the everyday challenges every organisation faces, and because we built them ourselves, we can tailor every one to your industry, your workflows and your brand.',
  closer: 'Every product can be white-labelled, integrated with your existing systems and hosted on the cloud or on your own servers.',
  cta: 'Book a Free Product Walkthrough',
};

export const products: Product[] = [
  {
    slug: 'hrms',
    icon: Users,
    short: 'HRMS',
    name: 'Kinetic HRMS',
    full: 'Human Resource Management System',
    tagline: 'Your people, managed with care and clarity.',
    body: 'Everything HR in one place, from hiring to retiring. Kinetic HRMS automates the paperwork so your HR team can focus on what matters most: your people.',
    features: [
      'Employee records, onboarding and exit management',
      'Payroll processing with statutory compliance (PF, ESI, TDS, professional tax)',
      'Leave, holiday and shift management',
      'Performance reviews and goal tracking',
      'Employee self-service portal and mobile app',
      'Analytics dashboard for headcount, attrition and costs',
    ],
    ideal: 'Growing businesses, manufacturers, hospitals, schools and multi-location enterprises.',
    seoTitle: 'HRMS Software with Payroll India | Kinetic HRMS',
    seoDescription: 'All-in-one HRMS with payroll, statutory compliance, leave and performance management. Customisable for your industry. Book a demo.',
  },
  {
    slug: 'vms',
    icon: DoorOpen,
    short: 'VMS',
    name: 'Kinetic VMS',
    full: 'Visitor Management System',
    tagline: "Know who's in. Every time.",
    body: 'Replace paper registers with a secure, professional digital front desk. Every visitor is registered, verified and tracked in seconds, strengthening security and creating a great first impression.',
    features: [
      'Pre-registration with QR code invites',
      'Instant host notifications by SMS, email or WhatsApp',
      'Photo capture, ID verification and badge printing',
      'Blacklist and watchlist alerts',
      'Real-time visitor logs and emergency evacuation lists',
      'Multi-gate and multi-site support',
    ],
    ideal: 'Corporate offices, factories, tech parks, hospitals, schools and residential communities.',
    seoTitle: 'Visitor Management System Software | Kinetic VMS',
    seoDescription: 'Digital visitor management with QR pre-registration, ID verification, badges and instant host alerts. Secure every entry.',
  },
  {
    slug: 'pms',
    icon: KanbanSquare,
    short: 'PMS',
    name: 'Kinetic PMS',
    full: 'Project Management System',
    tagline: 'Every project. Every task. Total clarity.',
    body: 'Plan, track and deliver projects with complete visibility. Kinetic PMS keeps teams aligned, deadlines on track and stakeholders informed, without endless follow-up calls.',
    features: [
      'Task boards, Gantt charts and milestone tracking',
      'Resource allocation and workload balancing',
      'Timesheets and budget tracking',
      'Client portals and automated status reports',
      'Document sharing and team collaboration',
      'Real-time project health dashboards',
    ],
    ideal: 'IT and service firms, construction, agencies, consultancies and internal project teams.',
    seoTitle: 'Project Management Software | Kinetic PMS',
    seoDescription: 'Plan, track and deliver projects with task boards, Gantt charts, timesheets and live dashboards. Customisable to your workflow.',
  },
  {
    slug: 'crm',
    icon: Handshake,
    short: 'CRM',
    name: 'Kinetic CRM',
    full: 'Customer Relationship Management',
    tagline: 'Turn every lead into a lasting relationship.',
    body: 'Capture every lead, follow up at the right moment and never lose a deal to a forgotten spreadsheet again. Kinetic CRM gives your sales team a single, clear view of every customer.',
    features: [
      'Lead capture from website, social media and WhatsApp',
      'Visual sales pipeline and deal tracking',
      'Automated follow-ups and reminders',
      'Quotations, invoices and payment tracking',
      'Customer support ticketing',
      'Sales forecasting and performance analytics',
    ],
    ideal: 'Sales teams, real estate, education, healthcare, B2B services and retail.',
    seoTitle: 'CRM Software for Growing Businesses | Kinetic CRM',
    seoDescription: 'Capture leads, automate follow-ups and close more deals with a CRM tailored to your sales process. WhatsApp-ready.',
  },
  {
    slug: 'attendance',
    icon: Fingerprint,
    short: 'Attendance',
    name: 'Kinetic Attendance',
    full: 'Smart Attendance System',
    tagline: 'Accurate attendance. Zero disputes.',
    body: 'Say goodbye to buddy punching and manual registers. Kinetic Attendance captures time accurately using the method that suits your workplace, and flows directly into payroll.',
    features: [
      'Biometric, face recognition, RFID and mobile check-in',
      'GPS geofencing for field and remote staff',
      'Shift, overtime and late-arrival tracking',
      'Seamless integration with Kinetic HRMS and payroll',
      'Real-time attendance dashboards and alerts',
      'Works across multiple branches and locations',
    ],
    ideal: 'Factories, retail chains, hospitals, schools, security agencies and field-force teams.',
    seoTitle: 'Biometric & Face Attendance System | Kinetic Attendance',
    seoDescription: 'Face, biometric, RFID and GPS attendance that syncs with payroll. Accurate, dispute-free time tracking for every location.',
  },
];

/* ─── INDUSTRIES ───────────────────────────────────────── */

export const industriesIntro = {
  eyebrow: 'Industries',
  title: 'Built for your industry. Not just any industry.',
  body: 'Every sector has its own rules, rhythms and pressures. Our solutions scale across industries because we take the time to understand each one.',
};

export const industries: { icon: LucideIcon; name: string; body: string }[] = [
  { icon: Factory, name: 'Manufacturing', body: 'Smart factories, predictive maintenance, workforce management and quality control powered by IoT and AI.' },
  { icon: HeartPulse, name: 'Healthcare', body: 'Secure patient-facing apps, staff scheduling, visitor control and data protection you can rely on.' },
  { icon: GraduationCap, name: 'Education', body: 'Campus management, attendance, visitor security and learning platforms for schools and universities.' },
  { icon: ShoppingBag, name: 'Retail & E-commerce', body: 'Customer engagement, inventory visibility and AI-powered sales assistants.' },
  { icon: Truck, name: 'Logistics & Supply Chain', body: 'Fleet tracking, route visibility, warehouse automation and real-time reporting.' },
  { icon: Building2, name: 'Real Estate & Facilities', body: 'Smart buildings, visitor management and CRM tailored to property sales and operations.' },
  { icon: Landmark, name: 'BFSI', body: 'Secure applications, document automation and compliance-ready cloud infrastructure.' },
  { icon: Briefcase, name: 'IT & Professional Services', body: 'Project management, CRM and HR platforms that keep delivery teams productive.' },
  { icon: Globe2, name: 'Government, NGOs & Social Enterprises', body: 'Scalable, affordable technology that delivers public and social impact aligned with the SDGs.' },
];

/* ─── WHY KINETIC BAY ──────────────────────────────────── */

export const whyIntro = {
  eyebrow: 'Why Kinetic Bay',
  title: "Choosing a technology partner is a leap of trust. Here's why ours is a safe one.",
  body: 'Anyone can promise great software. We back our promise with how we work, what we guarantee and the results we have already delivered.',
};

export const promises = [
  { title: 'Built Around You, Not a Template', body: 'We start by understanding your business, not by selling you a product. Every solution is shaped to your processes, your people and your goals.' },
  { title: 'Your Code. Your IP. Always.', body: 'On custom projects, you own what we build. Full source code, documentation and intellectual property are handed over to you, with no lock-in and no hidden dependencies.' },
  { title: 'Security from Day One', body: 'We sign an NDA before we see your data. Secure coding practices, access controls and data protection are built into every project, never bolted on later.' },
  { title: 'Radical Transparency', body: 'Weekly demos, shared progress boards and clear, fixed-scope quotations. You always know what is being built, what it costs and when it arrives.' },
  { title: 'A Proven Delivery Record', body: '40+ projects delivered with a 99% success rate. Our process is tested, refined and built to get it right the first time.' },
  { title: 'Partners Long After Launch', body: 'Go-live is the beginning, not the end. We provide ongoing support, maintenance and upgrades with clear response times.' },
  { title: 'Purpose You Can Be Proud Of', body: 'When you work with us, your project contributes to the UN Sustainable Development Goals. Technology that grows your business and does good.' },
];

/* ─── SOLUTIONS ────────────────────────────────────────── */

export const solutionsIntro = {
  eyebrow: 'How We Work',
  title: 'From first conversation to lasting impact.',
  body: 'Great outcomes are never accidental. They come from a clear, collaborative process that keeps you involved and in control at every step.',
};

export const journey = [
  { num: '01', title: 'Discover', body: 'We listen first. Workshops with your team uncover goals, pain points, users and constraints.', get: 'A clear problem statement and success metrics' },
  { num: '02', title: 'Design', body: 'We map workflows, architecture and user experience, then show you clickable prototypes before any code is written.', get: 'Approved prototype, scope, timeline and fixed quotation' },
  { num: '03', title: 'Build', body: 'Agile sprints with a demo every week, so you see progress and give feedback as we go.', get: 'Working software, tested at every stage' },
  { num: '04', title: 'Deploy', body: 'Secure launch, data migration and hands-on training so your team is confident from day one.', get: 'A live system and a trained team' },
  { num: '05', title: 'Evolve', body: 'We monitor, support and improve, adding features as your business grows.', get: 'Ongoing support, updates and performance reports' },
];

export const engagementModels = [
  { name: 'Fixed-Scope Project', body: 'Clearly defined requirements with a fixed budget and timeline.' },
  { name: 'Dedicated Team', body: 'Long-term product development with a team that works as an extension of yours.' },
  { name: 'Product + Customisation', body: 'Deploy one of our platforms (HRMS, VMS, PMS, CRM, Attendance) tailored to your needs, fast.' },
  { name: 'Support & Maintenance Retainer', body: 'Keep existing systems secure, updated and running smoothly.' },
  { name: 'Proof of Concept / MVP', body: 'Test an AI, IoT or product idea quickly before committing to full scale.' },
];

export const comparison = {
  intro: 'Plenty of companies write code. Here is what you get with Kinetic Bay that you will not find everywhere else.',
  rows: [
    { aspect: 'Approach', typical: 'Sells what they already have', kb: 'Builds what you actually need' },
    { aspect: 'Visibility', typical: 'Updates when you chase them', kb: 'Weekly demos and shared progress boards' },
    { aspect: 'Ownership', typical: 'Vendor lock-in', kb: 'You own the code and IP on custom builds' },
    { aspect: 'Capability', typical: 'One specialism', kb: 'AI, engineering, cloud security and IoT under one roof' },
    { aspect: 'Speed to value', typical: 'Everything built from scratch', kb: 'Proven product platforms we customise' },
    { aspect: 'After launch', typical: 'Hand-over and goodbye', kb: 'Long-term support and continuous improvement' },
    { aspect: 'Purpose', typical: 'Profit only', kb: 'Every project aligned with the SDGs' },
  ],
  closer: 'One partner. Four capabilities. Zero compromise.',
  cta: "Let's Talk About Your Challenge",
};

/* ─── ABOUT ────────────────────────────────────────────── */

export const story = {
  eyebrow: 'Our Story',
  title: 'Born by the Bay. Built for the world.',
  paragraphs: [
    'Kinetic Bay began with a simple frustration. Everywhere we looked, in factories, offices, hospitals and schools, talented people were buried under paperwork, spreadsheets and systems that made their work harder instead of easier. Hours were lost to manual attendance registers. Visitors were signed in on paper. Sales leads disappeared into forgotten notebooks. Brilliant minds spent their days doing work a machine could do in seconds.',
    'We knew technology could change that. But we also saw that most software was built for the machine, not the person using it. So we set out to do things differently.',
    'On the shores of the Bay of Bengal in Chennai, Kinetic Bay was founded on one belief: the best technology doesn\'t replace people — it frees them. "Kinetic" is energy in motion: the force that moves businesses forward. "Bay" is our home, and a harbour where ideas are shaped before they set sail to the world.',
    'Today, that belief drives everything we build: custom software, AI, cloud and IoT systems that make work easier and impact greater. And it drives who we are, a company that measures success not just in projects delivered, but in lives made better along the way.',
  ],
  mission: 'To build intelligent, human-centred technology that simplifies work for industries, empowers the people behind them and contributes meaningfully to the UN Sustainable Development Goals.',
  vision: 'A world where every organisation, from the smallest workshop to the largest enterprise, has access to technology that makes work effortless, fair and purposeful.',
  values: [
    { name: 'People First', body: 'We design for the humans who use our systems every day.' },
    { name: 'Integrity Always', body: 'We say what we will do, then we do it. No hidden costs, no surprises.' },
    { name: 'Relentless Curiosity', body: 'We keep learning, because technology never stands still.' },
    { name: 'Craft & Quality', body: 'We sweat the details, because small things decide whether software is loved or tolerated.' },
    { name: 'Impact Over Output', body: 'We measure success by the difference we make, not the lines of code we write.' },
  ],
  presenceTitle: 'Headquartered in Chennai. Present across India. Serving the world.',
  presenceBody: 'From our home base in Chennai, Tamil Nadu, we partner with clients in every corner of India, from metro enterprises to growing businesses in tier-2 and tier-3 cities, and deliver projects for clients across the globe. Wherever you are, we work in your time zone and speak your business language.',
};

export const catalysts = {
  eyebrow: 'Kinetic Catalysts',
  title: 'Fresh thinking. Sharp skills. Serious results.',
  paragraphs: [
    "Technology moves fast, and so do the Kinetic Catalysts. This is our specialist innovation team: engineers, designers and AI practitioners trained on today's newest tools and frameworks, from large language models to cloud-native architecture.",
    'What makes them different is how they work. Every Catalyst operates inside a structured delivery framework, mentored by senior architects and held to the same quality standards as every Kinetic Bay project. You get the energy and modern skill-set of a new generation, with the discipline and reliability of an experienced firm.',
    'The result? Faster prototyping, bolder ideas and solutions built on technology that will still be relevant tomorrow.',
  ],
  highlights: [
    { name: 'Future-Ready Skills', body: 'Fluent in AI, LLMs, cloud-native development and modern frameworks from day one.' },
    { name: 'Mentored by Experts', body: 'Every project is guided and reviewed by senior engineers and architects.' },
    { name: 'Speed to Innovation', body: 'Rapid prototyping and proof-of-concepts, so your ideas become reality faster.' },
    { name: 'Shaping Humans, Live', body: 'The Catalyst programme is our "Shaping Humans" promise in action: growing India\'s next generation of tech leaders.' },
  ],
};

export const teamIntro = {
  eyebrow: 'Meet the Team',
  title: 'Behind every system is someone who cares.',
  paragraphs: [
    "Code doesn't build itself. Behind every dashboard that loads in a blink and every workflow that runs without a hitch, there is a person who stayed that extra hour to get the details right. Someone who thought about the factory supervisor who would use it at 6 a.m., or the HR manager who finally gets her weekends back.",
    "We are engineers, designers, strategists and problem-solvers. But above all, we are people who take your success personally. When you partner with Kinetic Bay, you don't get a vendor. You get a team that shows up for you.",
  ],
  closer: 'One team. One promise. Your success.',
};

/* ─── FAQ ──────────────────────────────────────────────── */

export const faqs = [
  { q: 'How much does a custom software project cost?', a: 'Every project is different, so we give you a clear, fixed-scope quotation after a free discovery session. You will know the full cost upfront, with no hidden charges.' },
  { q: 'How long does it take to build a solution?', a: 'A proof of concept can be ready in 2–4 weeks. Most custom applications launch in 2–6 months depending on scope. Our ready-made products can be deployed and customised in a matter of weeks.' },
  { q: 'Will I own the source code?', a: 'Yes. On custom development projects, full ownership of the source code and intellectual property is transferred to you.' },
  { q: 'How do you keep our data secure?', a: "We sign an NDA before any engagement, follow secure coding standards, use role-based access controls and design systems in line with India's data protection law and global best practices." },
  { q: 'Can your products be customised for our industry?', a: 'Absolutely. HRMS, VMS, PMS, CRM and Attendance are built to be tailored: workflows, fields, reports, branding and integrations can all be adapted to you.' },
  { q: 'Do you work with clients outside Chennai or India?', a: 'Yes. We serve clients across India and around the world, working remotely with regular video meetings and on-site visits when needed.' },
  { q: 'What happens after the project goes live?', a: 'We offer ongoing support, maintenance and enhancement plans with defined response times, so your system keeps improving as your business grows.' },
  { q: 'Can you integrate with the software we already use?', a: 'Yes. We regularly integrate with ERPs, accounting tools, payment gateways, biometric devices and third-party APIs.' },
];

/* ─── FINAL CTA / CONTACT ──────────────────────────────── */

export const finalCta = {
  eyebrow: "Let's Build Together",
  title: "Have a process that's slowing you down? Let's build the machine that fixes it.",
  body: "Tell us about your challenge. In one free, no-obligation conversation, we will help you see what's possible, and exactly how to get there.",
  primary: 'Book a Free Consultation',
  secondary: 'Request a Product Demo',
  reassurance: ['Free discovery call', 'NDA on request', 'Response within 24 hours'],
};

export const contactCopy = {
  headline: "Let's start a conversation.",
  helpOptions: ['AI & Automation', 'Digital Engineering', 'Cybersecurity & Cloud', 'IoT', 'Our Products', 'Something else'],
  success: 'Thank you! Your message is on its way to our team. We will get back to you within 24 hours, usually much sooner.',
};
