import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import HeroStory from '../components/home/HeroStory';
import TypeStage from '../components/home/TypeStage';
import Reveal from '../components/Reveal';
import Btn from '../components/Btn';
import SdgWheel from '../components/home/SdgWheel';
import { PillarPanels, ProductStack, IndustryIndex, ExploreRows } from '../components/home/HomeCards';
import { SectionHead, Counter, FaqSection, FinalCta, faqJsonLd } from '../components/ui';
import {
  impact, pillarsIntro, productsIntro,
  industriesIntro, promises, whyIntro,
} from '../data/site';
import { useSeo } from '../lib/seo';

/* ─── Impact board ─── */

function ImpactBoard() {
  return (
    <section className="relative border-y border-border overflow-hidden">
      <div className="absolute inset-0 hero-grid opacity-30" />
      <div className="relative max-w-[1240px] mx-auto px-6 pt-24 pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <SectionHead eyebrow={impact.eyebrow} title={impact.title} className="mb-0" />
          <Reveal><p className="text-text-secondary max-w-sm text-[15px] leading-relaxed">{impact.closer}</p></Reveal>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {impact.stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 110} className="group relative py-8 lg:py-4 pr-4 lg:pl-8 first:lg:pl-0 lg:border-l first:lg:border-l-0 border-border">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-text-secondary mb-6">[ {String(i + 1).padStart(2, '0')} ] {s.label}</p>
              <div className="stat-fill font-heading font-bold leading-[0.85] tracking-[-0.05em] mb-4" style={{ fontSize: s.word ? 'clamp(34px, 4.4vw, 64px)' : 'clamp(64px, 8vw, 128px)' }}>
                {s.value !== undefined ? <Counter value={s.value} suffix={s.suffix} /> : s.word}
              </div>
              <p className="text-text-secondary text-[13px]">{s.sub}</p>
            </Reveal>
          ))}
        </div>
      </div>
      {/* marquee strip */}
      <div className="relative border-t border-border py-4 overflow-hidden bg-primary text-bg">
        <div className="ticker-track flex gap-10 whitespace-nowrap font-heading font-bold text-lg uppercase tracking-tight" style={{ width: 'max-content' }}>
          {[0, 1].map((k) => (
            <span key={k} className="flex gap-10">
              {['AI & Automation', 'Digital Engineering', 'Cybersecurity & Cloud', 'IoT Projects', 'HRMS', 'VMS', 'PMS', 'CRM', 'Attendance', 'Chennai → World'].map((t) => (
                <span key={t} className="flex items-center gap-10">{t}<span className="w-2 h-2 bg-bg rotate-45" /></span>
              ))}
            </span>
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
          <Reveal><Btn to="/solutions" variant="line">See how we work</Btn></Reveal>
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

const explore = [
  { to: '/solutions', eyebrow: 'Solutions', title: 'From first conversation to lasting impact.' },
  { to: '/about', eyebrow: 'About Us', title: 'Born by the Bay. Built for the world.' },
  { to: '/about#catalysts', eyebrow: 'Kinetic Catalysts', title: 'Fresh thinking. Sharp skills.' },
  { to: '/team', eyebrow: 'The Team', title: 'Behind every system is someone who cares.' },
];

function Pillars() {
  return (
    <section className="section-py">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHead eyebrow={pillarsIntro.eyebrow} title={pillarsIntro.title} body={pillarsIntro.body} />
        <PillarPanels />
      </div>
    </section>
  );
}

function ProductsSection() {
  return (
    <section className="section-py bg-surface/30 border-y border-border">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <SectionHead eyebrow={productsIntro.eyebrow} title={productsIntro.title} body={productsIntro.body} className="mb-0" />
          <Reveal className="shrink-0"><Btn to="/products" variant="line">See the product tour</Btn></Reveal>
        </div>
        <ProductStack />
        <p className="text-text-secondary text-[14px] mt-4 text-center">{productsIntro.closer}</p>
      </div>
    </section>
  );
}

function Industries() {
  return (
    <section className="section-py">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHead eyebrow={industriesIntro.eyebrow} title={industriesIntro.title} body={industriesIntro.body} />
        <IndustryIndex />
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
      <SdgWheel />
      <ImpactBoard />
      <TypeStage />
      <Pillars />
      <ProductsSection />
      <Industries />
      <WhyUs />
      <section className="section-py"><div className="max-w-[1240px] mx-auto px-6"><ExploreRows rows={explore} /></div></section>
      <FaqSection />
      <FinalCta />
    </div>
  );
}
