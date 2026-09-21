import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useScroll, useSpring, useTransform, useMotionValue, type MotionValue } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { prefersReducedMotion } from '../../lib/motion';

/** Normalised (-0.5‥0.5) cursor position, spring-smoothed. */
function useMouseDepth() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [mx, my]);
  return { sx, sy };
}

/** A layer that moves `depth`× as much as the foreground for both scroll and cursor. */
function Layer({ depth, scroll, sx, sy, range = 240, mouse = 60, sticky = false, className = '', children }: {
  depth: number; scroll: MotionValue<number>; sx: MotionValue<number>; sy: MotionValue<number>;
  range?: number; mouse?: number; sticky?: boolean; className?: string; children: ReactNode;
}) {
  // In normal flow the page carries the front plane, so far planes lag behind.
  // Inside a sticky stage nothing moves natively, so near planes travel furthest (the camera rises).
  const scrollY = useTransform(scroll, [0, 1], [0, sticky ? range * depth : range * (1 - depth)]);
  const mouseX = useTransform(sx, (v) => -v * mouse * depth);
  const mouseY = useTransform(sy, (v) => -v * mouse * 0.6 * depth);
  const y = useTransform([scrollY, mouseY] as MotionValue<number>[], ([a, b]: number[]) => a + b);
  return (
    <motion.div style={{ x: mouseX, y }} className={`absolute inset-0 will-change-transform ${className}`}>
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════
   Inner-page hero: giant outline word → perspective grid →
   floating glyphs → headline, each on its own depth plane.
═══════════════════════════════════════════════════════════ */

export function ParallaxHero({ word, eyebrow, title, highlight, body, icons = [], children }: {
  word: string; eyebrow: string; title: string; highlight?: string; body?: string; icons?: LucideIcon[]; children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const { sx, sy } = useMouseDepth();
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // deterministic scatter so SSR/prerender and client agree
  const spots = [
    { x: '72%', y: '22%', d: 0.55, s: 64, blur: 0 },
    { x: '86%', y: '58%', d: 0.8, s: 84, blur: 0 },
    { x: '62%', y: '70%', d: 0.35, s: 44, blur: 2 },
    { x: '92%', y: '14%', d: 0.25, s: 36, blur: 3 },
    { x: '54%', y: '34%', d: 0.2, s: 30, blur: 4 },
  ];

  return (
    <section ref={ref} className="relative min-h-[82vh] md:min-h-[88vh] flex items-end overflow-hidden border-b border-border bg-bg">
      {/* far: outline word */}
      <Layer depth={0.12} scroll={scrollYProgress} sx={sx} sy={sy} range={320} mouse={40}>
        <div className="absolute inset-0 flex items-center justify-center select-none" aria-hidden="true">
          <span className="outline-word font-heading font-bold leading-none" style={{ fontSize: 'clamp(90px, 22vw, 360px)' }}>{word}</span>
        </div>
      </Layer>

      {/* horizon glow */}
      <Layer depth={0.2} scroll={scrollYProgress} sx={sx} sy={sy}>
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 w-[140%] h-[340px] rounded-[50%] bg-primary/15 blur-[90px]" />
      </Layer>

      {/* mid: perspective floor that streams toward the viewer */}
      <Layer depth={0.4} scroll={scrollYProgress} sx={sx} sy={sy} mouse={30}>
        <div className="absolute inset-x-[-20%] bottom-[-8%] h-[62%] [perspective:600px]" aria-hidden="true">
          <div className="grid-floor absolute inset-0 origin-bottom" />
        </div>
      </Layer>

      {/* near: floating glyph tiles at varying depth + blur (depth of field) */}
      {icons.slice(0, spots.length).map((Icon, i) => {
        const sp = spots[i];
        return (
          <Layer key={i} depth={sp.d} scroll={scrollYProgress} sx={sx} sy={sy} mouse={110} className="pointer-events-none hidden sm:block">
            <div className="absolute glyph-tile" style={{ left: sp.x, top: sp.y, width: sp.s, height: sp.s, filter: `blur(${sp.blur}px)`, animationDelay: `${i * -1.3}s` }}>
              <Icon style={{ width: sp.s * 0.42, height: sp.s * 0.42 }} className="text-primary" />
            </div>
          </Layer>
        );
      })}

      {/* front: copy */}
      <motion.div style={{ opacity: fade }} className="relative z-10 max-w-[1200px] mx-auto px-6 pb-16 md:pb-24 pt-36 w-full">
        <p className="eyebrow mb-5">{eyebrow}</p>
        <h1 className="font-heading font-bold text-ink leading-[1.0] tracking-[-0.035em] mb-6 max-w-[820px]" style={{ fontSize: 'clamp(40px, 6.4vw, 88px)' }}>
          {title}{highlight && <> <span className="text-gradient-primary">{highlight}</span></>}
        </h1>
        {body && <p className="text-text-secondary text-base md:text-xl leading-relaxed max-w-[640px]">{body}</p>}
        {children}
      </motion.div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   About: the Bay of Bengal at dusk. Sky → sun → Chennai
   skyline (gopuram + lighthouse) → three seas → a boat
   setting sail → the shore. Scroll sets the sun; the boat
   sails out; every plane drifts at its own speed.
═══════════════════════════════════════════════════════════ */

const SVG = { viewBox: '0 0 1600 900', preserveAspectRatio: 'xMidYMax slice' } as const;

export function BayScene({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const { sx, sy } = useMouseDepth();
  const sunY = useTransform(scrollYProgress, [0, 1], [0, 170]);
  const sunGlow = useTransform(scrollYProgress, [0, 1], [1, 0.45]);
  const boatX = useTransform(scrollYProgress, [0, 1], ['-4%', '38%']);
  const boatScale = useTransform(scrollYProgress, [0, 1], [1, 0.72]);
  const copy = useTransform(scrollYProgress, [0, 0.75, 1], [1, 1, 0]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -90]);

  return (
    <div ref={ref} className="relative" style={{ height: '190vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* sky */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #050506 0%, #0d0806 38%, #261309 62%, #4f2512 74%, #1a0c05 80%)' }} />

        {/* stars */}
        <Layer sticky depth={0.04} scroll={scrollYProgress} sx={sx} sy={sy} range={60} mouse={20}>
          <svg {...SVG} className="absolute inset-0 w-full h-full" aria-hidden="true">
            {Array.from({ length: 70 }, (_, i) => (
              <circle key={i} cx={(i * 397) % 1600} cy={(i * 131) % 420} r={(i % 3) * 0.6 + 0.6} fill="#FDE6CF" opacity={0.25 + ((i * 7) % 10) / 20} />
            ))}
          </svg>
        </Layer>

        {/* sun, setting as you scroll */}
        <Layer sticky depth={0.1} scroll={scrollYProgress} sx={sx} sy={sy} range={80} mouse={30}>
          <motion.div style={{ y: sunY, opacity: sunGlow }} className="absolute left-1/2 top-[44%] -translate-x-1/2">
            <div className="w-[260px] h-[260px] md:w-[360px] md:h-[360px] rounded-full" style={{ background: 'radial-gradient(circle, #FFD08A 0%, #F5A76E 38%, #F08A4B 55%, rgba(240,138,75,0) 72%)' }} />
            <div className="absolute inset-[-60%] rounded-full bg-primary/25 blur-[90px]" />
          </motion.div>
        </Layer>

        {/* far: Chennai skyline — temple gopuram, Marina lighthouse, towers */}
        <Layer sticky depth={0.22} scroll={scrollYProgress} sx={sx} sy={sy} range={140} mouse={50}>
          <svg {...SVG} className="absolute inset-0 w-full h-full" aria-hidden="true">
            <g fill="#150a05">
              <rect x="120" y="560" width="70" height="140" /><rect x="200" y="520" width="46" height="180" />
              <rect x="258" y="590" width="90" height="110" /><rect x="360" y="545" width="38" height="155" />
              {/* gopuram: stacked, narrowing tiers */}
              {Array.from({ length: 7 }, (_, i) => (
                <rect key={i} x={430 + i * 11} y={640 - i * 24} width={150 - i * 22} height={26} rx={2} />
              ))}
              <path d="M494 470 L505 440 L516 470 Z" />
              <rect x="620" y="600" width="120" height="100" /><rect x="752" y="570" width="56" height="130" />
              {/* lighthouse */}
              <path d="M1086 700 L1100 470 L1128 470 L1142 700 Z" /><rect x="1094" y="452" width="40" height="20" />
              <rect x="1104" y="428" width="20" height="24" />
              <rect x="1180" y="585" width="80" height="115" /><rect x="1272" y="540" width="44" height="160" />
              <rect x="1328" y="600" width="110" height="100" /><rect x="1450" y="560" width="60" height="140" />
              <rect x="0" y="690" width="1600" height="40" />
            </g>
            <circle cx="1114" cy="440" r="7" fill="#F6C36B" />
            <path d="M1114 440 L1600 380 L1600 500 Z" fill="#F6C36B" opacity="0.06" />
            {[140, 214, 280, 372, 640, 770, 1200, 1290, 1360, 1470].map((x, i) => (
              <rect key={x} x={x} y={600 + (i % 3) * 22} width="6" height="8" fill="#F08A4B" opacity="0.55" />
            ))}
          </svg>
        </Layer>

        {/* seas */}
        <Layer sticky depth={0.4} scroll={scrollYProgress} sx={sx} sy={sy} range={180} mouse={70}>
          <svg {...SVG} className="absolute inset-0 w-full h-full" aria-hidden="true">
            <path className="wave-a" d="M0 720 Q200 700 400 720 T800 720 T1200 720 T1600 720 V900 H0Z" fill="#1d0d05" />
            {Array.from({ length: 14 }, (_, i) => (
              <rect key={i} x={760 - (i % 4) * 22 + ((i * 37) % 60)} y={728 + i * 9} width={80 - i * 4} height="2" fill="#F5A76E" opacity={0.6 - i * 0.035} rx="1" />
            ))}
          </svg>
        </Layer>

        {/* boat setting sail */}
        <Layer sticky depth={0.55} scroll={scrollYProgress} sx={sx} sy={sy} range={200} mouse={80}>
          <motion.div style={{ x: boatX, scale: boatScale }} className="absolute left-[18%] bottom-[16%] w-[120px] md:w-[170px] origin-bottom">
            <svg viewBox="0 0 170 150" className="w-full boat-bob" aria-hidden="true">
              <path d="M84 8 L84 112 L22 112 Z" fill="#0b0604" />
              <path d="M90 22 L90 112 L146 112 Z" fill="#120905" />
              <path d="M84 8 L84 112 L22 112 Z" fill="none" stroke="#F08A4B" strokeOpacity="0.5" strokeWidth="1.5" />
              <path d="M8 116 L162 116 L144 140 L28 140 Z" fill="#0b0604" />
              <path d="M84 4 L96 9 L84 14" fill="#F08A4B" />
            </svg>
          </motion.div>
        </Layer>

        <Layer sticky depth={0.7} scroll={scrollYProgress} sx={sx} sy={sy} range={220} mouse={100}>
          <svg {...SVG} className="absolute inset-0 w-full h-full" aria-hidden="true">
            <path className="wave-b" d="M0 780 Q160 760 320 780 T640 780 T960 780 T1280 780 T1600 780 V900 H0Z" fill="#120804" />
            <path d="M0 780 Q160 760 320 780 T640 780 T960 780 T1280 780 T1600 780" fill="none" stroke="#F08A4B" strokeOpacity="0.25" strokeWidth="1.5" />
          </svg>
        </Layer>

        {/* foreground shore */}
        <Layer sticky depth={1} scroll={scrollYProgress} sx={sx} sy={sy} range={260} mouse={140}>
          <svg {...SVG} className="absolute inset-0 w-full h-full" aria-hidden="true">
            <path d="M0 840 Q300 800 620 850 T1200 830 T1600 850 V900 H0Z" fill="#08090A" />
            <path d="M0 860 C120 820 180 830 260 846 C330 810 380 820 420 852 L420 900 L0 900Z" fill="#050506" />
            <path d="M1300 860 C1380 820 1460 818 1600 836 V900 H1300Z" fill="#050506" />
          </svg>
        </Layer>

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />

        <motion.div style={{ opacity: copy, y: copyY }} className="absolute inset-x-0 top-0 pt-32 md:pt-40 z-10">
          {children}
        </motion.div>
      </div>
    </div>
  );
}
