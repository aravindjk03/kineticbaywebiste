import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { Target, Eye, Heart, ShieldCheck, Search, Gem, TrendingUp, Zap, GraduationCap, Rocket, Sprout } from 'lucide-react';
import { BayScene } from '../components/fx/ParallaxLayers';
import FrictionStory from '../components/fx/FrictionStory';
import PresenceMaps from '../components/fx/PresenceMaps';
import Reveal from '../components/Reveal';
import TiltCard from '../components/TiltCard';
import Btn from '../components/Btn';
import { SectionHead, FinalCta } from '../components/ui';
import { story, catalysts } from '../data/site';
import { useSeo } from '../lib/seo';

const valueIcons = [Heart, ShieldCheck, Search, Gem, TrendingUp];
const catalystIcons = [Zap, GraduationCap, Rocket, Sprout];

/* Values start fanned out like a hand of cards in depth and straighten into a row as you arrive. */
function ValueCard({ i, n, p, v }: { i: number; n: number; p: MotionValue<number>; v: typeof story.values[number] }) {
  const off = i - (n - 1) / 2;
  const rotateY = useTransform(p, [0, 1], [off * -18, 0]);
  const rotateZ = useTransform(p, [0, 1], [off * 6, 0]);
  const z = useTransform(p, [0, 1], [-Math.abs(off) * 160, 0]);
  const y = useTransform(p, [0, 1], [Math.abs(off) * 50, 0]);
  const Icon = valueIcons[i];
  return (
    <motion.div style={{ rotateY, rotateZ, z, y }} className="kb-card p-6 min-h-[260px] flex flex-col group">
      <span className="kb-tab" />
      <div className="flex items-center justify-between mb-auto">
        <Icon className="w-7 h-7 text-primary transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" strokeWidth={1.6} />
        <span className="font-mono text-[10px] text-text-secondary">V/0{i + 1}</span>
      </div>
      <h3 className="font-heading font-bold text-ink text-xl mt-10 mb-2">{v.name}</h3>
      <p className="text-text-secondary text-[14px] leading-relaxed">{v.body}</p>
    </motion.div>
  );
}

function Values() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.95', 'center 0.6'] });
  return (
    <section className="section-py">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHead eyebrow="Our values" title="Five principles. Every project." />
        <div ref={ref} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 [perspective:1600px]">
          {story.values.map((v, i) => <ValueCard key={v.name} i={i} n={story.values.length} p={scrollYProgress} v={v} />)}
        </div>
      </div>
    </section>
  );
}

/* Mission and vision as two plates that slide apart to reveal the belief between them. */
function Belief() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'center 0.5'] });
  const left = useTransform(scrollYProgress, [0, 1], ['18%', '0%']);
  const right = useTransform(scrollYProgress, [0, 1], ['-18%', '0%']);
  const quote = useTransform(scrollYProgress, [0.4, 1], [0, 1]);
  return (
    <section ref={ref} className="section-py border-y border-border overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6">
        <motion.p style={{ opacity: quote }} className="font-heading font-bold text-ink text-center text-3xl md:text-5xl lg:text-6xl tracking-[-0.03em] leading-[1.05] max-w-4xl mx-auto mb-16">
          “The best technology doesn't replace people — <span className="text-gradient-primary">it frees them.</span>”
        </motion.p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: Target, label: 'Our Mission', body: story.mission, x: left },
            { icon: Eye, label: 'Our Vision', body: story.vision, x: right },
          ].map((m) => (
            <motion.div key={m.label} style={{ x: m.x }}>
              <TiltCard className="kb-card glare p-9 md:p-12 h-full" maxTilt={5}>
                <span className="kb-tab" />
                <m.icon className="w-9 h-9 text-primary mb-10" strokeWidth={1.5} />
                <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-primary mb-4">{m.label}</p>
                <p className="font-heading text-ink text-xl md:text-2xl leading-snug">{m.body}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function About() {
  useSeo(
    'About Kinetic Bay | Technology with SDG Purpose',
    'Chennai-born technology company that finds the friction in how organisations work and engineers it away — human-centred and aligned with the UN SDGs.',
  );

  return (
    <div className="bg-bg">
      <BayScene>
        <div className="max-w-[1240px] mx-auto px-6">
          <p className="eyebrow mb-5">{story.eyebrow}</p>
          <h1 className="font-heading font-bold text-ink leading-[0.95] tracking-[-0.04em] max-w-[900px] mb-6" style={{ fontSize: 'clamp(44px, 7.5vw, 112px)' }}>
            Born by the Bay. <span className="text-gradient-primary">Built for the world.</span>
          </h1>
          <p className="text-ink/80 text-base md:text-xl max-w-xl leading-relaxed">{story.lead}</p>
        </div>
      </BayScene>

      <section className="section-py">
        <div className="max-w-[1240px] mx-auto px-6 grid lg:grid-cols-[0.4fr_1fr] gap-8 lg:gap-16">
          <Reveal><p className="font-mono text-[11px] tracking-[0.25em] uppercase text-primary lg:sticky lg:top-32">[ Our story ]</p></Reveal>
          <div className="space-y-8">
            {story.paragraphs.map((para, i) => (
              <Reveal key={i} delay={i * 80}>
                <p className={i === 0 ? 'font-heading font-bold text-ink text-3xl md:text-[44px] leading-[1.12] tracking-[-0.025em]' : 'text-text-secondary text-lg md:text-xl leading-relaxed max-w-3xl'}>{para}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FrictionStory />
      <Belief />
      <Values />
      <PresenceMaps />

      <section id="catalysts" className="section-py relative overflow-hidden scroll-mt-24">
        <div className="absolute inset-0 hero-grid opacity-40" />
        <div className="relative max-w-[1240px] mx-auto px-6 grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16">
          <div>
            <SectionHead eyebrow={catalysts.eyebrow} title={catalysts.title} className="mb-8" />
            {catalysts.paragraphs.map((para) => (
              <Reveal key={para.slice(0, 20)}><p className="text-text-secondary text-base md:text-lg leading-relaxed mb-5">{para}</p></Reveal>
            ))}
            <Reveal className="mt-8"><Btn to="/team" variant="line">Meet the team</Btn></Reveal>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 content-center">
            {catalysts.highlights.map((h, i) => {
              const Icon = catalystIcons[i];
              return (
                <Reveal key={h.name} delay={i * 90} className={i % 2 ? 'sm:translate-y-10' : ''}>
                  <TiltCard className="kb-card glare p-7 h-full" maxTilt={10}>
                    <span className="kb-tab" />
                    <Icon className="w-8 h-8 text-primary mb-6" strokeWidth={1.6} />
                    <h3 className="font-heading font-semibold text-ink text-lg mb-2">{h.name}</h3>
                    <p className="text-text-secondary text-[14px] leading-relaxed">{h.body}</p>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
