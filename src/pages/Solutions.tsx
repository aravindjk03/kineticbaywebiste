import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { SolutionsHero } from '../components/fx/HeroScenes';
import Btn from '../components/Btn';
import HorizontalJourney from '../components/fx/HorizontalJourney';
import Reveal from '../components/Reveal';
import TiltCard from '../components/TiltCard';
import { SectionHead, FinalCta } from '../components/ui';
import { solutionsIntro, engagementModels, comparison } from '../data/site';
import { useSeo } from '../lib/seo';

function CompareRow({ row, i, p }: { row: typeof comparison.rows[number]; i: number; p: MotionValue<number> }) {
  const at = (i + 0.5) / comparison.rows.length;
  const strike = useTransform(p, [at - 0.12, at + 0.02], ['0%', '100%']);
  const kbOpacity = useTransform(p, [at - 0.08, at + 0.04], [0.3, 1]);
  return (
    <div className="grid grid-cols-[0.8fr_1fr_1fr] md:grid-cols-[0.6fr_1fr_1fr] border-b border-border text-[14px] md:text-[15px]">
      <div className="py-5 pr-3 font-heading font-semibold text-ink">{row.aspect}</div>
      <div className="py-5 px-3 text-text-secondary relative flex items-start gap-2">
        <X className="w-4 h-4 text-text-secondary/50 mt-0.5 shrink-0" />
        <span className="relative">
          {row.typical}
          <motion.span style={{ width: strike }} className="absolute left-0 top-1/2 h-px bg-text-secondary/70" />
        </span>
      </div>
      <motion.div style={{ opacity: kbOpacity }} className="py-5 pl-3 text-ink flex items-start gap-2 bg-primary/[0.05] border-l border-primary/30">
        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />{row.kb}
      </motion.div>
    </div>
  );
}

function Comparison() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.45'] });
  return (
    <section className="section-py">
      <div className="max-w-[1100px] mx-auto px-6">
        <SectionHead eyebrow="What makes us different" title={<>Plenty of companies write code. <span className="text-gradient-primary">Here's the difference.</span></>} body={comparison.intro} />
        <div ref={ref} className="border-t border-border">
          <div className="grid grid-cols-[0.8fr_1fr_1fr] md:grid-cols-[0.6fr_1fr_1fr] text-[11px] uppercase tracking-[0.16em] border-b border-border">
            <div className="py-4" />
            <div className="py-4 px-3 text-text-secondary">Typical IT vendor</div>
            <div className="py-4 pl-3 text-primary font-bold border-l border-primary/30 bg-primary/[0.05]">Kinetic Bay</div>
          </div>
          {comparison.rows.map((r, i) => <CompareRow key={r.aspect} row={r} i={i} p={scrollYProgress} />)}
        </div>
        <Reveal className="text-center mt-16">
          <p className="font-heading font-bold text-ink text-2xl md:text-4xl tracking-[-0.02em] mb-8">{comparison.closer}</p>
          <Btn to="/contact">{comparison.cta}</Btn>
        </Reveal>
      </div>
    </section>
  );
}

export default function Solutions() {
  useSeo(
    'Solutions: How We Work | Kinetic Bay',
    'A clear 5-step delivery journey — Discover, Design, Build, Deploy, Evolve — plus flexible engagement models and a partner that stays long after launch.',
  );

  return (
    <div className="bg-bg">
      <SolutionsHero eyebrow={solutionsIntro.eyebrow} title="From first conversation" highlight="to lasting impact." body={solutionsIntro.body}>
        <Btn to="/contact">Start with a discovery call</Btn>
      </SolutionsHero>

      <HorizontalJourney />

      <section className="section-py bg-surface/40 border-y border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <SectionHead eyebrow="Ways to work with us" title="Pick the engagement that fits." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {engagementModels.map((m, i) => (
              <Reveal key={m.name} delay={i * 70}>
                <TiltCard className="kb-card glare p-6 h-full flex flex-col" maxTilt={9}>
                  <span className="text-primary font-heading font-bold text-sm mb-6">0{i + 1}</span>
                  <h3 className="font-heading font-semibold text-ink text-lg leading-snug mb-3">{m.name}</h3>
                  <p className="text-text-secondary text-[14px] leading-relaxed"><span className="text-ink/80">Best for:</span> {m.body}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Comparison />
      <FinalCta />
    </div>
  );
}
