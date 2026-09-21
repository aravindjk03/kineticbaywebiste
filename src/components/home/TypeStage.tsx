import { lazy, Suspense, useRef } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import type { TypeState } from '../fx/KineticType3D';
import { useNearViewport, prefersReducedMotion } from '../../lib/motion';

const KineticType3D = lazy(() => import('../fx/KineticType3D'));

/** Pinned 3D wordmark: hover scatters letters, tap bursts them, scroll turns it to reveal the tagline. */
export default function TypeStage() {
  const ref = useRef<HTMLElement>(null);
  const [nearRef, near] = useNearViewport<HTMLDivElement>('300px');
  const state = useRef<TypeState>({ progress: 0, burst: 0, hover: false });
  const reduced = prefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => { state.current.progress = v; });

  const hintFront = useTransform(scrollYProgress, [0, 0.25, 0.35], [1, 1, 0]);
  const hintBack = useTransform(scrollYProgress, [0.65, 0.78], [0, 1]);

  return (
    <section ref={ref} className="relative" style={{ height: '240vh' }} aria-label="Kinetic Bay — Building Machines. Shaping Humans.">
      <h2 className="sr-only">Kinetic Bay: Building Machines. Shaping Humans.</h2>
      <div
        ref={nearRef}
        className="sticky top-0 h-screen overflow-hidden cursor-crosshair select-none"
        onPointerDown={() => { state.current.burst += 1; }}
        onPointerMove={(e) => { state.current.hover = e.pointerType === 'mouse'; }}
        onPointerLeave={() => { state.current.hover = false; }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_55%,rgba(249,115,22,0.14),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(to_bottom,transparent,rgba(249,115,22,0.05))] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
        <Suspense fallback={null}>
          {near && <KineticType3D state={state} active={near} reduced={reduced} />}
        </Suspense>
        <motion.p style={{ opacity: hintFront }} className="absolute bottom-10 inset-x-0 text-center text-[11px] uppercase tracking-[0.3em] text-text-secondary/70 pointer-events-none">
          Hover the letters · Tap to scatter · Scroll to turn
        </motion.p>
        <motion.p style={{ opacity: hintBack }} className="absolute bottom-10 inset-x-0 text-center text-[11px] uppercase tracking-[0.3em] text-primary/80 pointer-events-none">
          The promise behind the name
        </motion.p>
      </div>
    </section>
  );
}
