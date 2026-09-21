import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import HeroStory from '../components/home/HeroStory';
import TypeStage from '../components/home/TypeStage';
import Reveal from '../components/Reveal';
import TiltCard from '../components/TiltCard';
import { SectionHead, Counter, FaqSection, FinalCta, faqJsonLd } from '../components/ui';
import {
  sdgs, impact, pillars, pillarsIntro, products, productsIntro,
  industries, industriesIntro, promises, whyIntro,
} from '../data/site';
import { useSeo } from '../lib/seo';

/* ─── SDG: three columns drifting at different depths ─── */

function SdgCard({ sdg }: { sdg: typeof sdgs[number] }) {
  return (
    <TiltCard className="kb-card p-6 md:p-7 relative overflow-hidden group" maxTilt={6}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: sdg.color }} />
      <div className="flex items-center gap-4 mb-5">
        <span className="w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-heading font-bold leading-none shrink-0" style={{ background: sdg.color }}>
          <span className="text-[9px] tracking-widest opacity-80">SDG</span>
          <span className="text-2xl">{sdg.num}</span>
        </span>
        <h3 className="font-heading font-semibold text-ink text-[17px] leading-tight">{sdg.title}</h3>
      </div>
      <p className="text-text-secondary text-[14px] leading-relaxed">{sdg.body}</p>
    </TiltCard>
  );
}

function DepthColumn({ items, p, speed }: { items: typeof sdgs; p: MotionValue<number>; speed: number }) {
  const y = useTransform(p, [0, 1], [speed, -speed]);
  return (
    <motion.div style={{ y }} className="flex flex-col gap-5">
      {items.map((s) => <SdgCard key={s.num} sdg={s} />)}
    </motion.div>
  );
}

function SdgSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  return (
    <section ref={ref} className="section-py relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="hidden md:grid grid-cols-3 gap-5 md:py-16">
          <DepthColumn items={[sdgs[0], sdgs[3]]} p={scrollYProgress} speed={40} />
          <DepthColumn items={[sdgs[1], sdgs[4]]} p={scrollYProgress} speed={110} />
          <DepthColumn items={[sdgs[2], sdgs[5]]} p={scrollYProgress} speed={20} />
        </div>
        <div className="md:hidden grid gap-4">
          {sdgs.map((s) => <SdgCard key={s.num} sdg={s} />)}
        </div>
        <Reveal className="mt-14 text-center">
          <p className="font-heading text-2xl md:text-4xl text-ink tracking-[-0.02em] max-w-3xl mx-auto leading-tight">
            We don't just build technology that works. <span className="text-gradient-primary">We build technology that matters.</span>
          </p>
          <p className="text-[12px] text-text-secondary/60 mt-5">Kinetic Bay's work is aligned with and contributes to the UN SDGs. It does not imply UN endorsement.</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Impact board ─── */

function ImpactBoard() {
  return (
    <section className="section-py relative border-y border-border bg-surface/40 overflow-hidden">
      <div className="absolute inset-0 hero-grid opacity-40" />
      <div className="relative max-w-[1200px] mx-auto px-6">
        <SectionHead eyebrow={impact.eyebrow} title={impact.title} center />
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-border rounded-3xl overflow-hidden bg-bg/60 backdrop-blur">
          {impact.stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 90} className={`p-7 md:p-10 ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t lg:border-t-0' : ''} lg:border-l first:lg:border-l-0 border-border`}>
              <div className="font-heading font-bold text-gradient-primary leading-none mb-4" style={{ fontSize: 'clamp(36px, 5vw, 68px)' }}>
                {s.value !== undefined ? <Counter value={s.value} suffix={s.suffix} /> : s.word}
              </div>
              <p className="font-heading font-semibold text-ink text-[17px] mb-1">{s.label}</p>
              <p className="text-text-secondary text-[13px]">{s.sub}</p>
            </Reveal>
          ))}
        </div>
        <Reveal><p className="text-center text-text-secondary text-base md:text-lg max-w-2xl mx-auto mt-10">{impact.closer}</p></Reveal>
      </div>
    </section>
  );
}

/* ─── Four pillars ─── */

function Pillars() {
  return (
    <section className="section-py">
      <div className="max-w-[1200px] mx-auto px-6">
        <SectionHead eyebrow={pillarsIntro.eyebrow} title={pillarsIntro.title} body={pillarsIntro.body} />
        <div className="grid md:grid-cols-2 gap-5">
          {pillars.map((p, i) => (
            <Reveal key={p.slug} delay={i * 90}>
              <Link to={`/services/${p.slug}`} className="block group h-full">
                <TiltCard className="kb-card glare p-8 md:p-10 h-full relative overflow-hidden" maxTilt={7}>
                  <span className="absolute right-6 top-4 outline-word-sm font-heading font-bold text-[96px] leading-none" aria-hidden="true">0{i + 1}</span>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-8 [transform:translateZ(40px)]">
                    <p.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-ink text-2xl md:text-3xl tracking-[-0.02em] mb-2">{p.name}</h3>
                  <p className="text-primary font-medium mb-4">{p.tagline}</p>
                  <p className="text-text-secondary text-[14px] leading-relaxed mb-7 line-clamp-3">{p.intro}</p>
                  <span className="inline-flex items-center gap-2 text-ink font-semibold text-[14px] group-hover:text-primary transition-colors">
                    Explore <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </TiltCard>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Products teaser ─── */

function ProductsTeaser() {
  return (
    <section className="section-py bg-surface/40 border-y border-border">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <SectionHead eyebrow={productsIntro.eyebrow} title={productsIntro.title} body={productsIntro.body} className="mb-0" />
          <Reveal className="shrink-0"><Link to="/products" className="btn-accent">See them in action <ArrowRight className="w-4 h-4" /></Link></Reveal>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {products.map((p, i) => (
            <Reveal key={p.slug} delay={i * 70} className={i === 4 ? 'col-span-2 lg:col-span-1' : ''}>
              <Link to={`/products/${p.slug}`} className="group block h-full">
                <TiltCard className="kb-card p-6 h-full flex flex-col" maxTilt={9}>
                  <p.icon className="w-7 h-7 text-primary mb-6" />
                  <p className="text-[11px] uppercase tracking-[0.16em] text-text-secondary mb-1">Kinetic</p>
                  <h3 className="font-heading font-bold text-ink text-2xl mb-3">{p.short}</h3>
                  <p className="text-text-secondary text-[13px] leading-relaxed flex-1">{p.tagline}</p>
                  <ArrowUpRight className="w-4 h-4 text-primary mt-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </TiltCard>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal><p className="text-text-secondary text-[14px] mt-8 text-center">{productsIntro.closer}</p></Reveal>
      </div>
    </section>
  );
}

/* ─── Industries ─── */

function Industries() {
  return (
    <section className="section-py">
      <div className="max-w-[1200px] mx-auto px-6">
        <SectionHead eyebrow={industriesIntro.eyebrow} title={industriesIntro.title} body={industriesIntro.body} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-border">
          {industries.map((ind, i) => (
            <Reveal key={ind.name} delay={(i % 3) * 80} className="border-r border-b border-border">
              <div className="group relative p-7 md:p-8 h-full overflow-hidden transition-colors hover:bg-surface">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-primary/0 group-hover:bg-primary/15 blur-2xl transition-colors duration-500" />
                <ind.icon className="w-7 h-7 text-primary mb-5 transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-110" />
                <h3 className="font-heading font-semibold text-ink text-lg mb-2">{ind.name}</h3>
                <p className="text-text-secondary text-[14px] leading-relaxed">{ind.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Why Kinetic Bay: promises light up as they pass ─── */

function Promise({ i, title, body, p }: { i: number; title: string; body: string; p: MotionValue<number> }) {
  const at = (i + 0.5) / promises.length;
  const opacity = useTransform(p, [at - 0.2, at - 0.06, at + 0.08, at + 0.22], [0.25, 1, 1, 0.35]);
  const x = useTransform(p, [at - 0.2, at - 0.06], [24, 0]);
  return (
    <motion.li style={{ opacity, x }} className="flex gap-6 py-7 border-b border-border">
      <span className="font-heading font-bold text-primary text-[15px] pt-1.5 tabular-nums">0{i + 1}</span>
      <div>
        <h3 className="font-heading font-bold text-ink text-xl md:text-2xl tracking-[-0.01em] mb-2">{title}</h3>
        <p className="text-text-secondary text-[15px] leading-relaxed">{body}</p>
      </div>
    </motion.li>
  );
}

function WhyUs() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.35'] });
  return (
    <section className="section-py bg-surface/40 border-y border-border">
      <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-20">
        <div className="lg:sticky lg:top-32 self-start">
          <SectionHead eyebrow={whyIntro.eyebrow} title={whyIntro.title} body={whyIntro.body} className="mb-8" />
          <Reveal><Link to="/solutions" className="btn-ghost">See how we work <ArrowRight className="w-4 h-4" /></Link></Reveal>
        </div>
        <div ref={ref}>
          <ol className="border-t border-border">
            {promises.map((pr, i) => <Promise key={pr.title} i={i} title={pr.title} body={pr.body} p={scrollYProgress} />)}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ─── Explore further ─── */

const explore = [
  { to: '/solutions', eyebrow: 'Solutions', title: 'From first conversation to lasting impact.' },
  { to: '/about', eyebrow: 'About Us', title: 'Born by the Bay. Built for the world.' },
  { to: '/about#catalysts', eyebrow: 'Kinetic Catalysts', title: 'Fresh thinking. Sharp skills. Serious results.' },
  { to: '/team', eyebrow: 'Meet the Team', title: 'Behind every system is someone who cares.' },
];

function Explore() {
  return (
    <section className="section-py">
      <div className="max-w-[1200px] mx-auto px-6 grid sm:grid-cols-2 gap-4">
        {explore.map((e, i) => (
          <Reveal key={e.to} delay={i * 70}>
            <Link to={e.to} className="group kb-card p-8 flex items-end justify-between gap-6 min-h-[200px] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/10 transition-colors duration-500" />
              <div className="relative">
                <p className="eyebrow mb-3">{e.eyebrow}</p>
                <p className="font-heading font-bold text-ink text-2xl leading-tight max-w-xs">{e.title}</p>
              </div>
              <span className="relative w-12 h-12 rounded-full border border-primary/40 flex items-center justify-center shrink-0 transition-all group-hover:bg-primary group-hover:border-primary">
                <ArrowUpRight className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Kinetic Bay',
      slogan: 'Building Machines. Shaping Humans.',
      url: 'https://kineticbay.kineticbay.workers.dev/',
      logo: 'https://kineticbay.kineticbay.workers.dev/kineticbay.png',
      email: 'Kineticbay@gmail.com',
      sameAs: ['https://linkedin.com/company/kineticbay'],
    },
    {
      '@type': 'LocalBusiness',
      name: 'Kinetic Bay',
      address: { '@type': 'PostalAddress', addressLocality: 'Chennai', addressRegion: 'Tamil Nadu', addressCountry: 'IN' },
      areaServed: ['IN', 'Worldwide'],
    },
    faqJsonLd,
  ],
};

export default function Home() {
  useSeo(
    'Kinetic Bay | Custom Software & AI Solutions, Chennai',
    'Custom software, AI, cloud & IoT solutions that make work easier and create impact. 40+ projects, 99% success. Chennai-based, serving India & the world.',
    orgJsonLd,
  );

  return (
    <div className="bg-bg">
      <HeroStory />
      <SdgSection />
      <ImpactBoard />
      <TypeStage />
      <Pillars />
      <ProductsTeaser />
      <Industries />
      <WhyUs />
      <Explore />
      <FaqSection />
      <FinalCta />
    </div>
  );
}
