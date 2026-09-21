import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { pillars, products, journey } from '../../data/site';
import { screens } from './ProductScreens';
import world from '../../data/worldDots.json';
import { prefersReducedMotion } from '../../lib/motion';

/** Shared cursor-tilt spring (-0.5‥0.5). */
function usePointerTilt() {
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 70, damping: 18 }), sy = useSpring(my, { stiffness: 70, damping: 18 });
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const f = (e: PointerEvent) => { mx.set(e.clientX / innerWidth - 0.5); my.set(e.clientY / innerHeight - 0.5); };
    addEventListener('pointermove', f);
    return () => removeEventListener('pointermove', f);
  }, [mx, my]);
  return { sx, sy };
}

function HeroCopy({ eyebrow, title, highlight, body, children }: { eyebrow: string; title: string; highlight: string; body: string; children?: ReactNode }) {
  return (
    <div className="relative z-10">
      <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="eyebrow mb-6">{eyebrow}</motion.p>
      <h1 className="font-heading font-bold text-ink leading-[0.96] tracking-[-0.04em] mb-7" style={{ fontSize: 'clamp(42px, 6.2vw, 96px)' }}>
        <span className="block overflow-hidden pb-1"><motion.span className="block" initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>{title}</motion.span></span>
        <span className="block overflow-hidden pb-1"><motion.span className="block text-gradient-primary" initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ delay: 0.12, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>{highlight}</motion.span></span>
      </h1>
      <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="text-text-secondary text-base md:text-lg leading-relaxed max-w-[520px]">{body}</motion.p>
      {children && <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-9">{children}</motion.div>}
    </div>
  );
}

function Shell({ sectionRef, children, visual }: { sectionRef: React.RefObject<HTMLElement>; children: ReactNode; visual: ReactNode }) {
  return (
    <section ref={sectionRef} className="relative min-h-[100svh] flex items-center overflow-hidden border-b border-border bg-bg">
      <div className="absolute inset-0 hero-grid opacity-50" />
      <div className="relative max-w-[1240px] mx-auto px-6 w-full grid lg:grid-cols-[1fr_1fr] gap-10 items-center pt-32 pb-16">
        {children}
        <div className="relative h-[380px] sm:h-[480px] lg:h-[600px]">{visual}</div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   Services — four pillar plates in an isometric stack that
   separates on scroll like an exploded technical drawing.
═══════════════════════════════════════════════════════════ */

const PLATE_PATTERNS = [
  'radial-gradient(rgba(240,138,75,0.55) 1.2px, transparent 1.6px) 0 0 / 18px 18px',
  'repeating-linear-gradient(90deg, rgba(240,138,75,0.35) 0 1px, transparent 1px 22px), repeating-linear-gradient(0deg, rgba(240,138,75,0.18) 0 1px, transparent 1px 22px)',
  'repeating-linear-gradient(45deg, rgba(240,138,75,0.35) 0 1px, transparent 1px 12px)',
  'radial-gradient(circle at 30% 30%, rgba(240,138,75,0.6) 0 3px, transparent 4px) 0 0 / 44px 44px, linear-gradient(rgba(240,138,75,0.25) 1px, transparent 1px) 0 0 / 44px 22px',
];

export function ServicesHero({ eyebrow, title, highlight, body, children }: { eyebrow: string; title: string; highlight: string; body: string; children?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const spread = useTransform(scrollYProgress, [0, 0.7], [70, 150]);
  const { sx, sy } = usePointerTilt();
  const rotZ = useTransform(sx, (v) => -38 + v * 16);
  const rotX = useTransform(sy, (v) => 56 - v * 10);
  const layers = [...pillars].reverse(); // IoT at the base, AI on top

  return (
    <Shell sectionRef={ref} visual={
      <div className="absolute inset-0 grid place-items-center [perspective:1600px]" aria-hidden="true">
        <motion.div style={{ rotateX: rotX, rotateZ: rotZ }} className="relative w-[220px] h-[220px] sm:w-[290px] sm:h-[290px] [transform-style:preserve-3d]">
          {layers.map((p, i) => (
            <Plate key={p.slug} i={i} spread={spread} name={p.name} Icon={p.icon} pattern={PLATE_PATTERNS[3 - i]} top={i === layers.length - 1} />
          ))}
        </motion.div>
      </div>
    }>
      <HeroCopy eyebrow={eyebrow} title={title} highlight={highlight} body={body}>{children}</HeroCopy>
    </Shell>
  );
}

function Plate({ i, spread, name, Icon, pattern, top }: { i: number; spread: MotionValue<number>; name: string; Icon: typeof pillars[number]['icon']; pattern: string; top: boolean }) {
  const z = useTransform(spread, (s) => (i - 1.5) * s);
  return (
    <motion.div style={{ z }} className="absolute inset-0 [transform-style:preserve-3d]">
      <div
        className={`absolute inset-0 ${top ? 'bg-[#1c1510]' : 'bg-[#121316]'} shadow-[inset_0_0_0_1px_rgba(240,138,75,0.55),0_0_60px_-10px_rgba(240,138,75,0.35)]`}
        style={{ backgroundImage: pattern }}
      >
        <div className="absolute left-4 bottom-4 right-4 flex items-end justify-between">
          <span className="font-heading font-bold text-ink text-sm sm:text-base leading-tight max-w-[70%]">{name}</span>
          <span className="font-mono text-[10px] text-primary">L{4 - i}</span>
        </div>
        <Icon className="absolute right-4 top-4 w-7 h-7 text-primary" strokeWidth={1.5} />
      </div>
      {/* edge thickness */}
      <div className="absolute left-0 right-0 bottom-0 h-[8px] origin-bottom bg-primary/60 [transform:rotateX(-90deg)]" />
      <div className="absolute top-0 bottom-0 right-0 w-[8px] origin-right bg-primary-dark/70 [transform:rotateY(90deg)]" />
    </motion.div>
  );
}

// the five products appear twice so the ring reads as a full carousel
const RING = [...products, ...products];

/* ════════════════════════════════════════════════════════
   Products — a 3D carousel ring of live product screens.
   Drift on its own, drag to spin, scroll to nudge.
═══════════════════════════════════════════════════════════ */

export function ProductsHero({ eyebrow, title, highlight, body, children }: { eyebrow: string; title: string; highlight: string; body: string; children?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const angle = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scrollSpin = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const rotateY = useTransform([angle, scrollSpin] as MotionValue<number>[], ([a, s]: number[]) => a + s);
  const [front, setFront] = useState(0);
  const dragging = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    const tick = () => { if (!dragging.current) angle.set(angle.get() - 0.12); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    const unsub = rotateY.on('change', (v) => {
      const step = 360 / RING.length;
      setFront(((Math.round(-v / step) % RING.length) + RING.length) % RING.length);
    });
    return () => { cancelAnimationFrame(raf); unsub(); };
  }, [angle, rotateY]);

  const R = 'clamp(230px, 30vw, 400px)';
  const current = RING[front];
  return (
    <Shell sectionRef={ref} visual={
      <motion.div
        className="absolute inset-0 [perspective:1400px] cursor-grab active:cursor-grabbing touch-pan-y"
        onPanStart={() => { dragging.current = true; }}
        onPan={(_, info) => angle.set(angle.get() + info.delta.x * 0.35)}
        onPanEnd={(_, info) => {
          dragging.current = false;
          animate(angle, angle.get() + info.velocity.x * 0.05, { type: 'spring', stiffness: 40, damping: 20 });
        }}
      >
        <div className="absolute left-1/2 bottom-[8%] -translate-x-1/2 w-[80%] h-10 rounded-[50%] bg-primary/25 blur-2xl" />
        <motion.div style={{ rotateY, rotateX: -8 }} className="absolute left-1/2 top-1/2 w-0 h-0 [transform-style:preserve-3d]">
          {RING.map((p, i) => {
            const Screen = screens[p.slug];
            return (
              <div
                key={i}
                className="absolute w-[150px] sm:w-[220px] -ml-[75px] sm:-ml-[110px] -mt-[60px] sm:-mt-[85px] [backface-visibility:hidden]"
                style={{ transform: `rotateY(${i * (360 / RING.length)}deg) translateZ(${R})` }}
              >
                <div className={`aspect-[16/10] ring-1 transition-shadow duration-500 ${front === i ? 'ring-primary shadow-[0_30px_80px_-10px_rgba(240,138,75,0.6)]' : 'ring-white/10'}`}>
                  <Screen />
                </div>
                <p className={`mt-3 text-center font-heading font-semibold text-sm transition-colors ${front === i ? 'text-primary' : 'text-text-secondary'}`}>{p.name}</p>
              </div>
            );
          })}
        </motion.div>
        <Link to={`/products/${current.slug}`} className="absolute left-1/2 bottom-0 -translate-x-1/2 font-mono text-[11px] tracking-[0.2em] uppercase text-text-secondary hover:text-primary">
          Drag to spin · View {current.short} →
        </Link>
      </motion.div>
    }>
      <HeroCopy eyebrow={eyebrow} title={title} highlight={highlight} body={body}>{children}</HeroCopy>
    </Shell>
  );
}

/* ════════════════════════════════════════════════════════
   Solutions — the five steps on a rotating drum, like the
   wheels of a combination lock clicking into place.
═══════════════════════════════════════════════════════════ */

export function SolutionsHero({ eyebrow, title, highlight, body, children }: { eyebrow: string; title: string; highlight: string; body: string; children?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const drum = useMotionValue(0);
  const spin = useTransform([drum, scrollYProgress] as MotionValue<number>[], ([d, s]: number[]) => d + s * 180);
  const [active, setActive] = useState(0);
  const n = journey.length;
  const step = 360 / n;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      animate(drum, i * step, { type: 'spring', stiffness: 80, damping: 14 });
    }, 2200);
    const unsub = spin.on('change', (v) => setActive(((Math.round(v / step) % n) + n) % n));
    return () => { clearInterval(id); unsub(); };
  }, [drum, spin, step, n]);

  return (
    <Shell sectionRef={ref} visual={
      <div className="absolute inset-0 grid place-items-center [perspective:1200px]" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[92px] sm:h-[120px] border-y border-primary/40 bg-primary/[0.06]" />
        <motion.div style={{ rotateX: spin }} className="relative w-full h-[100px] [transform-style:preserve-3d]">
          {journey.map((j, i) => (
            <div
              key={j.num}
              className="absolute inset-0 flex items-center justify-center gap-4 [backface-visibility:hidden]"
              style={{ transform: `rotateX(${-i * step}deg) translateZ(clamp(120px, 16vw, 190px))` }}
            >
              <span className="font-mono text-sm text-primary">{j.num}</span>
              <span className={`font-heading font-bold tracking-[-0.04em] leading-none transition-colors duration-300 ${active === i ? 'text-ink' : 'text-ink/25'}`} style={{ fontSize: 'clamp(48px, 7vw, 104px)' }}>
                {j.title}
              </span>
            </div>
          ))}
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#08090A_0%,transparent_32%,transparent_68%,#08090A_100%)] pointer-events-none" />
        <p className="absolute bottom-6 inset-x-0 text-center text-text-secondary text-sm max-w-sm mx-auto px-6 min-h-[40px]">{journey[active].get}</p>
      </div>
    }>
      <HeroCopy eyebrow={eyebrow} title={title} highlight={highlight} body={body}>{children}</HeroCopy>
    </Shell>
  );
}

/* ════════════════════════════════════════════════════════
   Contact — the real dotted world map, lit from Chennai.
═══════════════════════════════════════════════════════════ */

export function ContactHero({ eyebrow, title, highlight, body, children }: { eyebrow: string; title: string; highlight: string; body: string; children?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const { sx, sy } = usePointerTilt();
  const x = useTransform(sx, (v) => v * -30);
  const y = useTransform(sy, (v) => v * -20);
  const [cx, cy] = world.chennai as [number, number];
  const targets = Object.values(world.world) as [number, number][];
  return (
    <section ref={ref} className="relative min-h-[88svh] flex items-end overflow-hidden border-b border-border bg-bg">
      <motion.svg style={{ x, y }} viewBox={`-2 -2 ${world.w + 4} ${world.h + 4}`} className="absolute inset-[-4%] w-[108%] h-[108%] opacity-80" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {(world.p as [number, number, number][]).map(([px, py, ind], i) => {
          const d = Math.hypot(px - cx, py - cy);
          return <circle key={i} cx={px} cy={py} r={0.28} fill={ind ? '#F08A4B' : `rgba(241,245,249,${Math.max(0.1, 0.4 - d / 200)})`} />;
        })}
        {targets.map(([tx, ty], i) => {
          const mx = (cx + tx) / 2, my = (cy + ty) / 2 - Math.hypot(tx - cx, ty - cy) * 0.3;
          return (
            <motion.path key={i} d={`M${cx} ${cy} Q${mx} ${my} ${tx} ${ty}`} fill="none" stroke="#F08A4B" strokeWidth={0.22}
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.9 }} transition={{ delay: 0.6 + i * 0.18, duration: 1.4, ease: 'easeInOut' }} />
          );
        })}
        <circle cx={cx} cy={cy} r={0.8} fill="#F08A4B" />
        <circle cx={cx} cy={cy} r={0.8} fill="none" stroke="#F08A4B" strokeWidth={0.2} className="map-ping" />
      </motion.svg>
      <div className="absolute inset-0 bg-[linear-gradient(to_top,#08090A_12%,rgba(8,9,10,0.6)_55%,rgba(8,9,10,0.2))]" />
      <div className="relative max-w-[1240px] mx-auto px-6 w-full pt-40 pb-16 md:pb-20">
        <HeroCopy eyebrow={eyebrow} title={title} highlight={highlight} body={body}>{children}</HeroCopy>
      </div>
    </section>
  );
}
