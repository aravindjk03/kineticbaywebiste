import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Cpu, Cloud, Lock, Radio, Sparkles } from 'lucide-react';
import { ParallaxHero } from '../components/fx/ParallaxLayers';
import Reveal from '../components/Reveal';
import TiltCard from '../components/TiltCard';
import { FinalCta } from '../components/ui';
import { pillars, pillarsIntro } from '../data/site';
import { useSeo } from '../lib/seo';

export default function Services() {
  useSeo(
    'Services: AI, Software, Cloud & IoT | Kinetic Bay',
    'AI & automation, digital engineering, cybersecurity & cloud, and IoT projects — four pillars combined into solutions that work end to end.',
  );

  return (
    <div className="bg-bg">
      <ParallaxHero
        word="PILLARS"
        eyebrow={pillarsIntro.eyebrow}
        title="Four pillars."
        highlight="One goal: your success."
        body={pillarsIntro.body}
        icons={[Sparkles, Cpu, Lock, Cloud, Radio]}
      />

      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6 space-y-6">
          {pillars.map((p, i) => (
            <Reveal key={p.slug}>
              <TiltCard className="kb-card glare relative overflow-hidden" maxTilt={3}>
                <div className="grid lg:grid-cols-[1fr_1.1fr]">
                  <div className="p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-border relative">
                    <span className="absolute right-6 top-2 outline-word-sm font-heading font-bold text-[120px] leading-none" aria-hidden="true">0{i + 1}</span>
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-8">
                      <p.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="font-heading font-bold text-ink text-3xl md:text-4xl tracking-[-0.02em] mb-2">{p.name}</h2>
                    <p className="text-primary font-medium text-lg mb-5">{p.tagline}</p>
                    <p className="text-text-secondary leading-relaxed mb-8">{p.intro}</p>
                    <div className="flex flex-wrap gap-3">
                      <Link to={`/services/${p.slug}`} className="btn-accent">Explore {p.name} <ArrowRight className="w-4 h-4" /></Link>
                    </div>
                  </div>
                  <div className="p-8 md:p-12">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-secondary mb-5">What's inside</p>
                    <ul className="grid sm:grid-cols-2 gap-x-6">
                      {p.services.map((s) => (
                        <li key={s.name} className="py-3 border-b border-border/70 text-[14px] text-ink flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />{s.name}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 text-[14px] text-text-secondary"><span className="text-ink font-semibold">Outcome:</span> {p.outcome}</p>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          ))}
          <Reveal>
            <p className="text-center text-text-secondary text-[14px] pt-4">
              Already know what you need? <Link to="/contact" className="text-primary hover:underline inline-flex items-center gap-1">Talk to an engineer <ArrowUpRight className="w-3.5 h-3.5" /></Link>
            </p>
          </Reveal>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
