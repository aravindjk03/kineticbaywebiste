import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { ParallaxHero } from '../components/fx/ParallaxLayers';
import Reveal from '../components/Reveal';
import TiltCard from '../components/TiltCard';
import { SectionHead, FinalCta } from '../components/ui';
import { pillars } from '../data/site';
import { useSeo } from '../lib/seo';

const WORDS: Record<string, string> = {
  'ai-automation': 'AI',
  'digital-engineering': 'BUILD',
  'cybersecurity-cloud': 'SECURE',
  iot: 'IoT',
};

export default function ServiceDetail() {
  const { slug } = useParams();
  const pillar = pillars.find((p) => p.slug === slug);
  useSeo(pillar?.seoTitle ?? 'Services | Kinetic Bay', pillar?.seoDescription ?? '');
  if (!pillar) return <Navigate to="/services" replace />;

  const others = pillars.filter((p) => p.slug !== pillar.slug);
  const Icon = pillar.icon;

  return (
    <div className="bg-bg">
      <ParallaxHero
        word={WORDS[pillar.slug]}
        eyebrow={`Services · ${pillar.name}`}
        title={pillar.name}
        highlight={pillar.tagline}
        body={pillar.intro}
        icons={[Icon, ...others.map((o) => o.icon), Icon]}
      >
        <div className="flex flex-wrap gap-3 mt-9">
          <Link to={`/contact?topic=${encodeURIComponent(pillar.name === 'IoT Projects' ? 'IoT' : pillar.name)}`} className="btn-accent">{pillar.cta} <ArrowRight className="w-4 h-4" /></Link>
          <Link to="/services" className="btn-ghost">All services</Link>
        </div>
      </ParallaxHero>

      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6">
          <SectionHead eyebrow="What it does for you" title={<>Every {pillar.name} service, <span className="text-gradient-primary">in plain words.</span></>} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillar.services.map((s, i) => (
              <Reveal key={s.name} delay={(i % 3) * 80}>
                <TiltCard className="kb-card glare p-7 h-full" maxTilt={8}>
                  <span className="text-primary/70 font-heading text-sm tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="font-heading font-semibold text-ink text-lg leading-snug mt-3 mb-3">{s.name}</h3>
                  <p className="text-text-secondary text-[14px] leading-relaxed">{s.body}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-y border-border bg-surface/40 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-40" />
        <Reveal className="relative max-w-[900px] mx-auto px-6 text-center">
          <p className="eyebrow mb-4">The outcome</p>
          <p className="font-heading font-bold text-ink text-2xl md:text-4xl leading-tight tracking-[-0.02em] mb-8">{pillar.outcome}</p>
          <Link to={`/contact?topic=${encodeURIComponent(pillar.name === 'IoT Projects' ? 'IoT' : pillar.name)}`} className="btn-accent">{pillar.cta} <ArrowRight className="w-4 h-4" /></Link>
        </Reveal>
      </section>

      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="eyebrow mb-6">Combine with</p>
          <div className="grid md:grid-cols-3 gap-4">
            {others.map((o) => (
              <Link key={o.slug} to={`/services/${o.slug}`} className="group kb-card p-7 flex items-center gap-5">
                <o.icon className="w-8 h-8 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="font-heading font-semibold text-ink">{o.name}</p>
                  <p className="text-text-secondary text-[13px]">{o.tagline}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
