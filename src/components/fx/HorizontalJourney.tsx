import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { journey } from '../../data/site';

function StepCard({ step, index, total, p }: { step: typeof journey[number]; index: number; total: number; p: MotionValue<number> }) {
  // each card swings through a shallow cover-flow arc as it crosses the centre
  const centre = index / (total - 1);
  const rotateY = useTransform(p, [centre - 0.35, centre, centre + 0.35], [28, 0, -28]);
  const z = useTransform(p, [centre - 0.3, centre, centre + 0.3], [-160, 0, -160]);
  const glow = useTransform(p, [centre - 0.15, centre, centre + 0.15], [0.25, 1, 0.25]);

  return (
    <motion.article
      style={{ rotateY, z }}
      className="relative shrink-0 w-[82vw] sm:w-[520px] h-[60vh] max-h-[520px] rounded-3xl border border-border bg-surface/80 backdrop-blur p-8 sm:p-10 flex flex-col justify-between overflow-hidden"
    >
      <motion.div style={{ opacity: glow }} className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/25 blur-[80px] pointer-events-none" />
      <span className="outline-word-sm font-heading font-bold leading-none" style={{ fontSize: 'clamp(90px, 14vw, 170px)' }} aria-hidden="true">{step.num}</span>
      <div className="relative">
        <h3 className="font-heading font-bold text-ink text-3xl sm:text-4xl tracking-[-0.02em] mb-3">
          <span className="text-primary mr-2 text-lg align-middle">{step.num}</span>{step.title}
        </h3>
        <p className="text-text-secondary text-[15px] sm:text-base leading-relaxed mb-6">{step.body}</p>
        <div className="rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-bold mb-1">What you get</p>
          <p className="text-ink text-[14px]">{step.get}</p>
        </div>
      </div>
    </motion.article>
  );
}

/** Vertical scroll drives a horizontal track of the 5-step delivery journey. */
export default function HorizontalJourney() {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (!track.current) return;
      setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });
  const x = useTransform(p, [0, 1], [0, -distance]);
  const line = useTransform(p, [0, 1], ['0%', '100%']);

  return (
    <section ref={ref} className="relative" style={{ height: `${journey.length * 70}vh` }} aria-label="Our 5-step delivery journey">
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
        <div className="max-w-[1200px] mx-auto px-6 w-full mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">Our 5-step delivery journey</p>
            <h2 className="font-heading font-bold text-ink text-3xl md:text-5xl tracking-[-0.02em]">Discover → Evolve.</h2>
          </div>
          <div className="hidden md:block w-60 h-[2px] bg-border relative">
            <motion.div className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_10px_#F97316]" style={{ width: line }} />
          </div>
        </div>
        <div className="[perspective:1400px]">
          <motion.div ref={track} style={{ x }} className="flex gap-6 sm:gap-8 px-6 md:px-[max(24px,calc((100vw-1200px)/2+24px))] [transform-style:preserve-3d] w-max">
            {journey.map((step, i) => <StepCard key={step.num} step={step} index={i} total={journey.length} p={p} />)}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
