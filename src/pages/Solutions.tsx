import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import { ArrowRight, GraduationCap, HeartPulse, Leaf, Package, Building2, TrendingUp, Zap, Wrench, ShieldAlert, Code2 } from 'lucide-react';
import DecryptedText from '../components/DecryptedText';
import ScrollFloat from '../components/ScrollFloat';
import Reveal from '../components/Reveal';
import PageHero3D from '../components/PageHero3D';
import TiltCard from '../components/TiltCard';

const products = [
  {
    icon: GraduationCap,
    name: 'EduReach',
    subtitle: 'Adaptive Learning Platform',
    sdg: 'SDG 4',
    phase: '1',
    description: 'A mobile-first, AI-powered learning platform engineered for underserved communities. Curriculum-aligned content, verifiable skill certifications, and vocational training across multiple languages — designed to work fully offline.',
  },
  {
    icon: HeartPulse,
    name: 'HealthBridge',
    subtitle: 'Telemedicine & Rural Health Platform',
    sdg: 'SDG 3',
    phase: '1',
    description: 'AI-assisted triage and remote consultations bringing quality healthcare to rural and underserved regions, backed by offline-capable health records and a companion app for community health workers.',
  },
  {
    icon: Leaf,
    name: 'CarbonLens',
    subtitle: 'Carbon Footprint & Climate Analytics',
    sdg: 'SDG 13',
    phase: '1',
    description: 'Automated carbon accounting across Scope 1–3 emissions, with built-in regulatory compliance tracking — engineered for individuals, SMBs, and enterprises navigating a net-zero future.',
  },
  {
    icon: Package,
    name: 'GreenChain',
    subtitle: 'Circular Supply Chain & ESG Platform',
    sdg: 'SDG 12',
    phase: '2',
    description: 'Full supply chain transparency from raw material to retail — product lifecycle tracking, automated ESG reporting, and supplier sustainability scoring in a single intelligent platform.',
  },
  {
    icon: Building2,
    name: 'CityPulse',
    subtitle: 'Smart Cities & Civic Engagement Platform',
    sdg: 'SDG 11',
    phase: '2',
    description: 'Real-time urban intelligence dashboards paired with a citizen engagement portal — powered by IoT sensor data and predictive maintenance for the cities of tomorrow.',
  },
  {
    icon: TrendingUp,
    name: 'GrowthLink',
    subtitle: 'MSME Fintech & Digital Economy Platform',
    sdg: 'SDG 8',
    phase: '2',
    description: 'Digital invoicing, cash-flow forecasting, and ML-driven credit scoring — unlocking financial access for micro, small, and medium enterprises across emerging markets.',
  },
  {
    icon: Zap,
    name: 'InnoGrid',
    subtitle: 'AI Infrastructure & Innovation Suite',
    sdg: 'SDG 9',
    phase: '3',
    description: 'A cloud-agnostic AI/ML platform delivering affordable infrastructure and one-click model deployment — putting enterprise-grade AI within reach of startups, SMBs, and governments in emerging markets.',
  },
];

function TimelineCard({ p, Icon }: { p: any; Icon: any }) {
  return (
    <TiltCard className="kb-card p-6 flex flex-col group relative overflow-hidden" maxTilt={4}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-[12px] font-bold text-primary uppercase tracking-wider">{p.sdg}</span>
          <span className={`phase-badge phase-${p.phase}`}>Phase {p.phase}</span>
        </div>
      </div>

      <h3 className="font-heading font-bold text-ink text-xl sm:text-2xl leading-[1.2] mb-1 group-hover:text-primary transition-colors">
        {p.name}
      </h3>
      <p className="text-text-secondary text-[13px] mb-3">{p.subtitle}</p>

      <div className="h-px bg-border mb-4" />
      <p className="text-text-secondary text-[14px] leading-relaxed flex-1">{p.description}</p>
    </TiltCard>
  );
}

export default function Solutions() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ['start end', 'end center'],
  });

  return (
    <div className="overflow-hidden bg-bg">

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative min-h-[55vh] flex items-end pb-16 pt-32 border-b border-border overflow-hidden">
        <div className="glow-orb w-[500px] h-[400px] bg-primary/10 top-1/2 right-0 -translate-y-1/2" />
        <PageHero3D shape="octahedron" />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 w-full">
          <Reveal>
            <p className="eyebrow mb-4">Our Solutions</p>
            <h1
              className="font-heading font-bold text-ink leading-[1.05] tracking-[-0.02em] mb-6 max-w-3xl"
              style={{ fontSize: 'clamp(34px, 5vw, 64px)' }}
            >
              <DecryptedText
                text="Seven Products. "
                animateOn="view"
                sequential
                revealDirection="start"
                speed={35}
                encryptedClassName="decrypt-encrypted"
              />
              <span className="text-primary">
                <DecryptedText
                  text="Seven SDGs. "
                  animateOn="view"
                  sequential
                  revealDirection="start"
                  speed={35}
                  encryptedClassName="decrypt-encrypted"
                />
              </span>
              <DecryptedText
                text="One Mission."
                animateOn="view"
                sequential
                revealDirection="start"
                speed={35}
                encryptedClassName="decrypt-encrypted"
              />
            </h1>
            <p className="text-text-secondary font-medium text-lg leading-relaxed max-w-2xl mb-4">
              We don't build apps. We engineer ecosystems.
            </p>
            <p className="text-text-secondary text-[15px] sm:text-base leading-relaxed max-w-2xl">
              Every solution in our portfolio is designed to close a real-world gap — in education, healthcare, infrastructure, and sustainability — using AI-native architecture built for scale from day one. This isn't software for software's sake. It's technology engineered against the UN Sustainable Development Goals, purpose-built for the communities and industries that need it most.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── PROVEN IN THE FIELD ─────────────────── */}
      <section className="section-py border-b border-border bg-surface/20 relative">
        <div className="glow-orb w-[400px] h-[400px] bg-primary/5 -left-48 top-1/4" />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <Reveal>
            <p className="eyebrow mb-3">Proven in the Field</p>
            <h2 className="font-heading font-bold text-ink leading-[1.1] tracking-[-0.02em] mb-4 text-3xl md:text-5xl">
              Real Technology, Real Impact
            </h2>
            <p className="text-text-secondary text-sm sm:text-base leading-relaxed max-w-2xl">
              Before the roadmap, there's the record. Kinetic Bay has already delivered AI-powered systems that are live, working, and driving measurable impact today:
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              {
                icon: Wrench,
                title: 'Predictive & Preventive Maintenance Intelligence',
                desc: 'AI-driven monitoring that anticipates equipment failure before it happens — cutting downtime, extending asset life, and turning maintenance from a cost center into a competitive edge.'
              },
              {
                icon: ShieldAlert,
                title: 'AI-Powered PPE Compliance Monitoring',
                desc: "Real-time, vision-based safety monitoring that flags PPE non-compliance instantly — protecting workers and giving safety teams the visibility they've never had before."
              },
              {
                icon: Code2,
                title: 'Custom Web Platforms & Internal Software Systems',
                desc: 'End-to-end digital builds — from public-facing websites to internal operational tools — engineered to be fast, scalable, and built around how your business actually works.'
              }
            ].map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 80}>
                <TiltCard className="kb-card p-6 h-full flex flex-col" maxTilt={4}>
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-ink text-[17px] leading-[1.3] mb-3">{title}</h3>
                  <p className="text-text-secondary text-[14px] leading-relaxed flex-1">{desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <p className="text-text-secondary text-sm text-center mt-10 leading-relaxed max-w-2xl mx-auto">
              This is the engineering discipline behind everything else we build. It's why our roadmap isn't a pitch deck — it's a pipeline built on a proven foundation.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── THE ROADMAP (TIMELINE EFFECT) ───────── */}
      <section className="section-py relative bg-[#060709]" ref={timelineRef}>
        <div className="glow-orb w-[600px] h-[300px] bg-primary/5 -right-48 bottom-1/4" />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <Reveal>
            <p className="eyebrow mb-3 font-semibold">The Roadmap</p>
            <h2 className="font-heading font-bold text-ink leading-[1.1] tracking-[-0.02em] mb-4 text-3xl md:text-5xl">
              Engineering Tomorrow's Impact
            </h2>
            <p className="text-text-secondary text-sm sm:text-base leading-relaxed max-w-2xl mb-16">
              Seven flagship products, each mapped to a UN SDG, each in active development. This is where Kinetic Bay's proven AI capability is being directed next — toward the world's hardest problems.
            </p>
          </Reveal>

          {/* Timeline Wrapper */}
          <div className="relative mt-24">
            {/* Background Base Line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2" />

            {/* Glowing Scroll Progress Line */}
            <motion.div
              style={{ scaleY: scrollYProgress }}
              className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-orange-light to-primary-dark origin-top -translate-x-1/2 shadow-[0_0_10px_#F97316]"
            />

            {/* Timeline Nodes & Cards */}
            <div className="space-y-12 md:space-y-20 relative">
              {products.map((p, i) => {
                const Icon = p.icon;
                const isEven = i % 2 === 0;

                return (
                  <div
                    key={p.name}
                    className={`relative flex flex-col md:flex-row items-stretch gap-6 md:gap-0 ${
                      isEven ? 'md:flex-row-reverse' : ''
                    }`}
                  >
                    {/* Timeline Node Dot */}
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 top-10 z-20 w-8 h-8 rounded-full border-4 border-bg bg-surface flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.3)]">
                      <span className="text-[10px] font-bold text-primary">P{p.phase}</span>
                    </div>

                    {/* Left Column (Desktop Spacer / Content) */}
                    <div className="w-full md:w-1/2 flex md:justify-end px-4 pl-16 md:pl-0 md:px-12">
                      {isEven ? (
                        <div className="w-full max-w-md hidden md:block" />
                      ) : (
                        <Reveal delay={100} className="w-full max-w-md">
                          <TimelineCard p={p} Icon={Icon} />
                        </Reveal>
                      )}
                    </div>

                    {/* Right Column (Desktop Content / Spacer) */}
                    <div className="w-full md:w-1/2 flex justify-start px-4 pl-16 md:pl-0 md:px-12">
                      {isEven ? (
                        <Reveal delay={100} className="w-full max-w-md">
                          <TimelineCard p={p} Icon={Icon} />
                        </Reveal>
                      ) : (
                        <div className="w-full max-w-md hidden md:block" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BAND ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#050607] border-t border-border">
        <div className="glow-orb w-[600px] h-[350px] bg-primary/10 bottom-0 left-1/2 -translate-x-1/2" />
        <div className="max-w-[1200px] mx-auto px-6 py-20 sm:py-24 text-center relative z-10">
          <Reveal>
            <h2
              className="font-heading font-semibold text-ink leading-[1.15] tracking-[-0.01em] mb-5"
              style={{ fontSize: 'clamp(24px, 3.5vw, 40px)' }}
            >
              <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.03}>Want to pilot one of these with us?</ScrollFloat>
            </h2>
            <p className="text-text-secondary text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-8">
              We partner with NGOs, government agencies, and academic institutions to deploy and test SDG-aligned solutions in real communities — turning proven technology into measurable impact.
            </p>
            <Link to="/contact" className="btn-accent inline-flex items-center gap-2 rounded-lg">
              Start a Conversation <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
