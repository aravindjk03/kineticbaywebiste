import { Link } from 'react-router-dom';
import { ArrowRight, Globe, HeartPulse, Leaf, Package, Building2, TrendingUp, Zap } from 'lucide-react';
import DecryptedText from '../components/DecryptedText';
import ScrollFloat from '../components/ScrollFloat';
import Reveal from '../components/Reveal';
import PageHero3D from '../components/PageHero3D';

const products = [
  {
    icon: Globe,
    name: 'EduReach',
    subtitle: 'Adaptive Learning Platform',
    sdg: 'SDG 4',
    phase: '1',
    description: 'A mobile-first, AI-powered adaptive learning platform for underserved communities. Curriculum-aligned content, skill certifications, and vocational training in multiple languages — offline-capable.',
  },
  {
    icon: HeartPulse,
    name: 'HealthBridge',
    subtitle: 'Telemedicine & Rural Health Platform',
    sdg: 'SDG 3',
    phase: '1',
    description: 'AI-assisted triage and remote consultations for rural and underserved communities, with offline health records and a companion app for community health workers.',
  },
  {
    icon: Leaf,
    name: 'CarbonLens',
    subtitle: 'Carbon Footprint & Climate Analytics',
    sdg: 'SDG 13',
    phase: '1',
    description: 'Automated carbon footprint calculation, Scope 1–3 emissions reporting, and regulatory compliance tracking for individuals, SMBs, and enterprises.',
  },
  {
    icon: Package,
    name: 'GreenChain',
    subtitle: 'Circular Supply Chain & ESG Platform',
    sdg: 'SDG 12',
    phase: '2',
    description: 'End-to-end supply chain transparency — product lifecycle tracking, automated ESG reporting, and supplier sustainability scoring.',
  },
  {
    icon: Building2,
    name: 'CityPulse',
    subtitle: 'Smart Cities & Civic Engagement Platform',
    sdg: 'SDG 11',
    phase: '2',
    description: 'Real-time urban dashboards and a citizen engagement portal for local governments, powered by IoT sensor data and predictive maintenance.',
  },
  {
    icon: TrendingUp,
    name: 'GrowthLink',
    subtitle: 'MSME Fintech & Digital Economy Platform',
    sdg: 'SDG 8',
    phase: '2',
    description: 'Digital invoicing, cash-flow forecasting, and ML-based credit scoring for micro, small, and medium enterprises in emerging markets.',
  },
  {
    icon: Zap,
    name: 'InnoGrid',
    subtitle: 'AI Infrastructure & Innovation Suite',
    sdg: 'SDG 9',
    phase: '3',
    description: 'A cloud-agnostic AI/ML platform providing affordable infrastructure tools and one-click model deployment for startups, SMBs, and governments in emerging markets.',
  },
];

export default function Solutions() {
  return (
    <div className="overflow-hidden bg-bg">

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative min-h-[50vh] flex items-end pb-16 pt-32 border-b border-border overflow-hidden">
        <div className="glow-orb w-[500px] h-[400px] bg-primary/10 top-1/2 right-0 -translate-y-1/2" />
        <PageHero3D shape="octahedron" />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 w-full">
          <Reveal>
            <p className="eyebrow mb-4">Our Solutions</p>
            <h1
              className="font-heading font-bold text-ink leading-[1.05] tracking-[-0.02em] mb-5 max-w-2xl"
              style={{ fontSize: 'clamp(34px, 5vw, 64px)' }}
            >
              <DecryptedText
                text="Seven products. "
                animateOn="view"
                sequential
                revealDirection="start"
                speed={35}
                encryptedClassName="decrypt-encrypted"
              />
              <span className="text-gradient-primary">
                <DecryptedText
                  text="Seven SDGs."
                  animateOn="view"
                  sequential
                  revealDirection="start"
                  speed={35}
                  encryptedClassName="decrypt-encrypted"
                />
              </span>
            </h1>
            <p className="text-text-secondary leading-relaxed max-w-xl text-base sm:text-lg md:text-xl">
              Not a single app — a product ecosystem where each tool addresses a real gap in education, health, infrastructure, and sustainability.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── PRODUCT GRID ─────────────────────────── */}
      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.name} delay={i * 60}>
                  <div className="kb-card p-6 h-full flex flex-col group">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[12px] font-bold text-primary uppercase tracking-wider">{p.sdg}</span>
                        <span className={`phase-badge phase-${p.phase}`}>Phase {p.phase}</span>
                      </div>
                    </div>

                    <h2 className="font-heading font-bold text-ink text-xl sm:text-2xl leading-[1.2] mb-1">
                      {p.name}
                    </h2>
                    <p className="text-text-secondary text-[13px] mb-3">{p.subtitle}</p>

                    <div className="h-px bg-border mb-4" />
                    <p className="text-text-secondary text-[14px] leading-relaxed flex-1">{p.description}</p>
                  </div>
                </Reveal>
              );
            })}
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
              We work with NGOs, government agencies, and academic institutions to deploy and test our SDG-aligned products in real communities.
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
