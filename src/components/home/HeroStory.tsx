import { lazy, Suspense, useRef, type ReactNode } from 'react';
import Btn from '../Btn';
import { motion, useScroll, useTransform, useMotionValueEvent, type MotionValue } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { StoryState } from '../fx/MorphParticles';
import { hero, philosophy, sdgIntro } from '../../data/site';
import { useIsMobile, useNearViewport, prefersReducedMotion } from '../../lib/motion';

// three.js loads after first paint so the headline is never blocked on WebGL
const MorphParticles = lazy(() => import('../fx/MorphParticles'));

const STAGES = ['Intro', 'Machines', 'Humans', 'Promise', 'Purpose'];

/** Opacity/offset for a copy panel centred on `at` (scroll progress 0‒1). */
function usePanel(p: MotionValue<number>, at: number, span = 0.085, first = false, last = false) {
  const inStart = at - span * 1.6, inEnd = at - span * 0.4;
  const outStart = at + span * 0.4, outEnd = at + span * 1.6;
  const opacity = useTransform(
    p,
    first ? [0, outStart, outEnd] : last ? [inStart, inEnd, 1] : [inStart, inEnd, outStart, outEnd],
    first ? [1, 1, 0] : last ? [0, 1, 1] : [0, 1, 1, 0],
  );
  const y = useTransform(
    p,
    first ? [0, outEnd] : last ? [inStart, inEnd] : [inStart, inEnd, outStart, outEnd],
    first ? [0, -80] : last ? [60, 0] : [60, 0, 0, -60],
  );
  const pointerEvents = useTransform(opacity, (o) => (o > 0.5 ? 'auto' : 'none'));
  return { opacity, y, pointerEvents };
}

function Panel({ p, at, first, last, className = '', children }: {
  p: MotionValue<number>; at: number; first?: boolean; last?: boolean; className?: string; children: ReactNode;
}) {
  const style = usePanel(p, at, 0.085, first, last);
  return (
    <motion.div style={style} className={`absolute inset-0 flex ${className}`}>
      {children}
    </motion.div>
  );
}

function StoryCard({ label, title, body, micro, align }: {
  label: string; title: string; body: string; micro: string[]; align: 'left' | 'right';
}) {
  return (
    <div className={`w-full max-w-[1200px] mx-auto px-6 flex ${align === 'right' ? 'lg:justify-end' : ''} items-end lg:items-center pb-10 lg:pb-0 h-full`}>
      <div className="story-card max-w-[520px]">
        <p className="eyebrow mb-4">{label}</p>
        <h2 className="font-heading font-bold text-ink text-3xl md:text-6xl leading-[1.02] tracking-[-0.03em] mb-3 md:mb-5">{title}</h2>
        <p className="text-text-secondary text-[14px] md:text-lg leading-relaxed mb-4 md:mb-6">{body}</p>
        <div className="flex flex-wrap gap-2">
          {micro.map((m) => <span key={m} className="skill-chip !text-[12px] md:!text-[13px]">{m}</span>)}
        </div>
      </div>
    </div>
  );
}

function RailItem({ label, at, p }: { label: string; at: number; p: MotionValue<number> }) {
  const opacity = useTransform(p, [at - 0.13, at, at + 0.13], [0, 1, 0]);
  const dot = useTransform(p, [at - 0.13, at, at + 0.13], ['rgba(8,9,10,1)', 'rgba(249,115,22,1)', 'rgba(8,9,10,1)']);
  return (
    <div className="relative flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-ink h-4">
      <motion.span style={{ opacity }}>{label}</motion.span>
      <motion.span style={{ backgroundColor: dot }} className="w-[7px] h-[7px] rounded-full border border-primary/70" />
    </div>
  );
}

export default function HeroStory() {
  const wrapper = useRef<HTMLDivElement>(null);
  const [nearRef, near] = useNearViewport<HTMLDivElement>('100px');
  const mobile = useIsMobile(1024);
  const reduced = prefersReducedMotion();
  const state = useRef<StoryState>({ stage: 0, mobile });
  state.current.mobile = mobile;

  const { scrollYProgress: p } = useScroll({ target: wrapper, offset: ['start start', 'end end'] });
  useMotionValueEvent(p, 'change', (v) => { state.current.stage = v * 4; });

  const bar = useTransform(p, [0, 1], ['0%', '100%']);
  const scrollHint = useTransform(p, [0, 0.04], [1, 0]);

  return (
    <section ref={wrapper} className="relative" style={{ height: '520vh' }} aria-label="Building Machines. Shaping Humans.">
      <div ref={nearRef} className="sticky top-0 h-screen overflow-hidden">
        {/* depth backdrop */}
        <div className="absolute inset-0 bg-bg" />
        <div className="absolute inset-0 hero-grid opacity-60" />
        <div className="absolute -top-40 right-[-10%] w-[900px] h-[700px] rounded-full bg-primary/10 blur-[140px]" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[700px] h-[600px] rounded-full bg-primary-dark/10 blur-[140px]" />

        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <MorphParticles state={state} active={near} count={mobile ? 5000 : 11000} reduced={reduced} />
          </Suspense>
        </div>
        {/* legibility veil on mobile where copy overlaps the particles */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg via-bg/80 to-transparent lg:hidden pointer-events-none" />

        {/* ── Stage 0: hero ─────────────────────── */}
        <Panel p={p} at={0} first className="items-end lg:items-center">
          <div className="w-full max-w-[1200px] mx-auto px-6 pb-16 lg:pb-0">
            <motion.p className="eyebrow mb-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              {hero.eyebrow}
            </motion.p>
            <h1 className="font-heading font-bold text-ink leading-[0.98] tracking-[-0.035em] mb-6 max-w-[800px]" style={{ fontSize: 'clamp(38px, 5.6vw, 82px)' }}>
              {hero.headline.map((line, i) => (
                <span key={line} className="block overflow-hidden pb-1">
                  <motion.span
                    className={`block ${i === 1 ? 'text-gradient-primary' : ''}`}
                    initial={{ y: '105%' }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.25 + i * 0.14, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p
              className="text-text-secondary text-[15px] md:text-xl leading-relaxed max-w-[560px] mb-7 md:mb-9"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            >
              {hero.sub}
            </motion.p>
            <motion.div className="flex flex-wrap gap-3 mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.72 }}>
              <Btn to="/contact">{hero.primary}</Btn>
              <Btn to="/products" variant="line">{hero.secondary}</Btn>
            </motion.div>
            <motion.ul
              className="hidden sm:flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-text-secondary/80"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
            >
              {hero.trust.map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" />{t}</li>
              ))}
            </motion.ul>
          </div>
        </Panel>

        {/* ── Stage 1: Building Machines ─────────── */}
        <Panel p={p} at={0.25}>
          <StoryCard label="01 · Machines" title={philosophy.machines.title} body={philosophy.machines.body} micro={philosophy.machines.micro} align="left" />
        </Panel>

        {/* ── Stage 2: Shaping Humans ────────────── */}
        <Panel p={p} at={0.5}>
          <StoryCard label="02 · Humans" title={philosophy.humans.title} body={philosophy.humans.body} micro={philosophy.humans.micro} align="right" />
        </Panel>

        {/* ── Stage 3: two halves, one promise ───── */}
        <Panel p={p} at={0.75} className="items-end lg:items-stretch">
          <div className="w-full max-w-[1200px] mx-auto px-6 flex flex-col lg:justify-between h-auto lg:h-full pt-0 lg:pt-28 pb-12 lg:pb-14 text-center">
            <div>
              <p className="eyebrow mb-4">{philosophy.eyebrow}</p>
              <h2 className="font-heading font-bold text-ink text-4xl md:text-6xl leading-[1.02] tracking-[-0.03em] flex items-center justify-center gap-3 flex-wrap">
                Machines <Plus className="w-8 h-8 md:w-12 md:h-12 text-primary" strokeWidth={3} /> Humans
              </h2>
            </div>
            <div className="mt-5 lg:mt-0">
              <p className="font-heading text-xl md:text-2xl text-ink mb-3">{philosophy.title}</p>
              <p className="text-text-secondary text-[15px] md:text-lg leading-relaxed max-w-2xl mx-auto">{philosophy.intro}</p>
            </div>
          </div>
        </Panel>

        {/* ── Stage 4: purpose / SDGs ────────────── */}
        <Panel p={p} at={1} last>
          <div className="w-full max-w-[1200px] mx-auto px-6 flex items-end lg:items-center pb-12 lg:pb-0 h-full">
            <div className="story-card max-w-[520px]">
              <p className="eyebrow mb-4">{sdgIntro.eyebrow}</p>
              <h2 className="font-heading font-bold text-ink text-4xl md:text-6xl leading-[1.02] tracking-[-0.03em] mb-5">{sdgIntro.title}</h2>
              <p className="text-text-secondary text-[15px] md:text-lg leading-relaxed">{sdgIntro.body}</p>
            </div>
          </div>
        </Panel>

        {/* chapter rail */}
        <div className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 flex-col items-end gap-4 z-10" aria-hidden="true">
          <div className="absolute right-[3px] top-0 bottom-0 w-px bg-border" />
          <motion.div className="absolute right-[3px] top-0 w-px bg-primary shadow-[0_0_8px_#F97316]" style={{ height: bar }} />
          {STAGES.map((s, i) => <RailItem key={s} label={s} at={i / 4} p={p} />)}
        </div>

        <motion.div style={{ opacity: scrollHint }} className="absolute bottom-7 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2" aria-hidden="true">
          <span className="text-[10px] text-text-secondary uppercase tracking-[0.3em]">Scroll to begin</span>
          <span className="block w-px h-10 bg-gradient-to-b from-primary to-transparent animate-pulse" />
        </motion.div>
      </div>
    </section>
  );
}
