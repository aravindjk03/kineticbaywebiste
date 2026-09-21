import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowRight, Target, Eye, Heart, ShieldCheck, Search, Gem, TrendingUp, Zap, GraduationCap, Rocket, Sprout } from 'lucide-react';
import { BayScene } from '../components/fx/ParallaxLayers';
import Reveal from '../components/Reveal';
import TiltCard from '../components/TiltCard';
import { SectionHead, FinalCta } from '../components/ui';
import { story, catalysts } from '../data/site';
import { useSeo } from '../lib/seo';

/* Words brighten one by one as the paragraph scrolls through the viewport. */
function Word({ w, i, n, p }: { w: string; i: number; n: number; p: MotionValue<number> }) {
  const opacity = useTransform(p, [i / n, (i + 1) / n], [0.18, 1]);
  return <motion.span style={{ opacity }}>{w} </motion.span>;
}

function ScrollLitParagraph({ text, large = false }: { text: string; large?: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] });
  const words = text.split(' ');
  return (
    <p ref={ref} className={`${large ? 'font-heading text-2xl md:text-[34px] leading-[1.3] tracking-[-0.01em]' : 'text-lg md:text-xl leading-relaxed'} text-ink mb-10`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{words.map((w, i) => <Word key={i} w={w} i={i} n={words.length} p={scrollYProgress} />)}</span>
    </p>
  );
}

const valueIcons = [Heart, ShieldCheck, Search, Gem, TrendingUp];
const catalystIcons = [Zap, GraduationCap, Rocket, Sprout];

function Presence() {
  const rings = [
    { label: 'Chennai', sub: 'Headquarters', r: 18 },
    { label: 'Pan-India', sub: 'Metro to tier-3', r: 34 },
    { label: 'Global', sub: 'Across the world', r: 50 },
  ];
  return (
    <section className="section-py border-y border-border bg-surface/40 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <SectionHead eyebrow="Where we are" title={story.presenceTitle} body={story.presenceBody} className="mb-0" />
        </div>
        <Reveal>
          <div className="relative aspect-square max-w-[480px] mx-auto" aria-hidden="true">
            {rings.map((ring, i) => (
              <div key={ring.label} className="absolute rounded-full border border-primary/25" style={{ inset: `${50 - ring.r}%` }}>
                <span className="absolute left-1/2 -translate-x-1/2 -top-3 px-3 py-1 rounded-full bg-bg border border-primary/30 text-[11px] font-semibold text-ink whitespace-nowrap">
                  {ring.label} <span className="text-text-secondary font-normal">· {ring.sub}</span>
                </span>
                <span className="absolute inset-0 rounded-full border border-primary/40 animate-radar" style={{ animationDelay: `${i * 1.1}s` }} />
              </div>
            ))}
            {/* arcs reaching out from Chennai */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
              {[[-38, -20], [30, -34], [40, 18], [-24, 36], [8, 46], [-46, 6]].map(([x, y], i) => (
                <g key={i}>
                  <path d={`M50 50 Q ${50 + x / 2 - y / 4} ${50 + y / 2 + x / 4} ${50 + x} ${50 + y}`} fill="none" stroke="#F97316" strokeWidth="0.35" strokeDasharray="1.5 1.5" className="arc-dash" style={{ animationDelay: `${i * 0.4}s` }} />
                  <circle cx={50 + x} cy={50 + y} r="1.1" fill="#FFAB00" />
                </g>
              ))}
            </svg>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary shadow-[0_0_30px_8px_rgba(249,115,22,0.6)]" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function About() {
  useSeo(
    'About Kinetic Bay | Technology with SDG Purpose',
    'Chennai-born technology company building human-centred software aligned with the UN SDGs. Meet the story, mission and team.',
  );

  return (
    <div className="bg-bg">
      <BayScene>
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="eyebrow mb-5">{story.eyebrow}</p>
          <h1 className="font-heading font-bold text-ink leading-[0.98] tracking-[-0.035em] max-w-[820px]" style={{ fontSize: 'clamp(42px, 7vw, 100px)' }}>
            Born by the Bay. <span className="text-gradient-primary">Built for the world.</span>
          </h1>
        </div>
      </BayScene>

      <section className="section-py">
        <div className="max-w-[900px] mx-auto px-6">
          <ScrollLitParagraph text={story.paragraphs[0]} large />
          {story.paragraphs.slice(1).map((para) => <ScrollLitParagraph key={para.slice(0, 20)} text={para} />)}
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-2 gap-5">
          {[
            { icon: Target, label: 'Our Mission', body: story.mission },
            { icon: Eye, label: 'Our Vision', body: story.vision },
          ].map((m, i) => (
            <Reveal key={m.label} delay={i * 100}>
              <TiltCard className="kb-card glare p-9 md:p-12 h-full relative overflow-hidden" maxTilt={5}>
                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />
                <m.icon className="w-9 h-9 text-primary mb-8" />
                <p className="eyebrow mb-4">{m.label}</p>
                <p className="font-heading text-ink text-xl md:text-2xl leading-snug">{m.body}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section-py border-t border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <SectionHead eyebrow="Our values" title="What we stand for." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {story.values.map((v, i) => {
              const Icon = valueIcons[i];
              return (
                <Reveal key={v.name} delay={i * 70}>
                  <div className="kb-card p-6 h-full group">
                    <Icon className="w-7 h-7 text-primary mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                    <h3 className="font-heading font-semibold text-ink text-lg mb-2">{v.name}</h3>
                    <p className="text-text-secondary text-[14px] leading-relaxed">{v.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <Presence />

      <section id="catalysts" className="section-py relative overflow-hidden scroll-mt-24">
        <div className="absolute inset-0 hero-grid opacity-40" />
        <div className="relative max-w-[1200px] mx-auto px-6 grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16">
          <div>
            <SectionHead eyebrow={catalysts.eyebrow} title={catalysts.title} className="mb-8" />
            {catalysts.paragraphs.map((para) => (
              <Reveal key={para.slice(0, 20)}><p className="text-text-secondary text-base md:text-lg leading-relaxed mb-5">{para}</p></Reveal>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 content-center">
            {catalysts.highlights.map((h, i) => {
              const Icon = catalystIcons[i];
              return (
                <Reveal key={h.name} delay={i * 90} className={i % 2 ? 'sm:translate-y-10' : ''}>
                  <TiltCard className="kb-card glare p-7 h-full" maxTilt={10}>
                    <Icon className="w-8 h-8 text-primary mb-6" />
                    <h3 className="font-heading font-semibold text-ink text-lg mb-2">{h.name}</h3>
                    <p className="text-text-secondary text-[14px] leading-relaxed">{h.body}</p>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </div>
        <Reveal className="relative text-center mt-24">
          <Link to="/team" className="btn-ghost">Meet the team <ArrowRight className="w-4 h-4" /></Link>
        </Reveal>
      </section>

      <FinalCta />
    </div>
  );
}
