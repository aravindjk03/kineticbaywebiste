import { useMemo, useRef } from 'react';
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { story } from '../../data/site';
import { useIsMobile } from '../../lib/motion';

const LABELS = [
  'Manual entry', 'Re-keyed data', 'Email approvals', 'Spreadsheet v12', 'Missed follow-up', 'Paper forms',
  'Siloed tools', 'Status meetings', 'Lost context', 'Duplicate records', 'Version conflict', 'Waiting on sign-off',
  'No live data', 'Copy · paste', 'Shadow IT', 'Late reports', 'Guesswork', 'Workarounds',
  'Unread inbox', 'Blind spots', 'Double work', 'Hand-offs', 'Legacy system', 'After-hours admin',
  'Ticket queue', 'Manual reconciliation', 'Security gaps',
];
// 27 labels = three 3×3 faces of the engineered cube

type Pose = [number, number, number, number, number, number, number]; // x y z rx ry rz opacity

function seeded(i: number, k: number) {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// scroll keyframes: [start, end] of each hold; transitions happen between holds
const HOLDS = [[0, 0.1], [0.3, 0.4], [0.6, 0.72], [0.95, 1]];

function poses(i: number, T: number, W: number, H: number): Pose[] {
  const g = T * 0.14;
  // 0 · friction: scattered through depth, tumbling
  const chaos: Pose = [
    (seeded(i, 1) - 0.5) * W * 0.95, (seeded(i, 2) - 0.5) * H * 0.8, (seeded(i, 3) - 0.6) * 700,
    (seeded(i, 4) - 0.5) * 120, (seeded(i, 5) - 0.5) * 140, (seeded(i, 6) - 0.5) * 90, 1,
  ];
  // 1 · listen: everything laid out and mapped on one plane
  const col = i % 9, row = Math.floor(i / 9);
  const grid: Pose = [(col - 4) * (T + g), (row - 1) * (T + g), 0, 0, 0, 0, 1];
  // 2 · engineer: the same pieces fold into one solid block
  const face = Math.floor(i / 9), k = i % 9, u = k % 3, v = Math.floor(k / 3), h = T * 1.5;
  const cube: Pose =
    face === 0 ? [(u - 1) * T, (v - 1) * T, h, 0, 0, 0, 1]
      : face === 1 ? [(u - 1) * T, -h, (v - 1) * T, 90, 0, 0, 1]
        : [h, (v - 1) * T, (1 - u) * T, 0, 90, 0, 1];
  // 3 · release: the load lifts away
  const release: Pose = [
    cube[0] * 1.6 + (seeded(i, 7) - 0.5) * W * 0.6, -H * 0.9 - seeded(i, 8) * H * 0.6, cube[2] + (seeded(i, 9) - 0.5) * 300,
    cube[3] + (seeded(i, 10) - 0.5) * 260, cube[4] + (seeded(i, 11) - 0.5) * 260, (seeded(i, 12) - 0.5) * 180, 0,
  ];
  return [chaos, grid, cube, release];
}

function sample(p: number, ps: Pose[], stagger: number): { pose: Pose; seg: number; t: number } {
  for (let s = 0; s < 3; s++) {
    const [, holdEnd] = HOLDS[s];
    const [nextStart] = HOLDS[s + 1];
    if (p <= HOLDS[s][1]) return { pose: ps[s], seg: s, t: 0 };
    if (p < nextStart) {
      let t = (p - holdEnd) / (nextStart - holdEnd);
      t = Math.min(1, Math.max(0, (t - stagger * 0.3) / 0.7));
      const e = ease(t);
      const a = ps[s], b = ps[s + 1];
      return { pose: a.map((v, j) => lerp(v, b[j], e)) as Pose, seg: s, t: e };
    }
  }
  return { pose: ps[3], seg: 3, t: 1 };
}

function Sheet({ i, p, T, W, H }: { i: number; p: MotionValue<number>; T: number; W: number; H: number }) {
  const ps = useMemo(() => poses(i, T, W, H), [i, T, W, H]);
  const stagger = seeded(i, 13);
  const transform = useTransform(p, (v) => {
    const [x, y, z, rx, ry, rz] = sample(v, ps, stagger).pose;
    return `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
  });
  const opacity = useTransform(p, (v) => sample(v, ps, stagger).pose[6]);
  // tiles "power up" as they become part of the engineered block
  const lit = useTransform(p, [0.4, 0.6], [0, 1]);
  const label = useTransform(p, [0.42, 0.55], [1, 0]);
  return (
    <motion.div
      style={{ transform, opacity, width: T, height: T, marginLeft: -T / 2, marginTop: -T / 2 }}
      className="absolute left-1/2 top-1/2 [transform-style:preserve-3d] will-change-transform"
    >
      <div className="absolute inset-0 bg-[#16171b] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] flex items-end p-1.5 overflow-hidden">
        <motion.span style={{ opacity: label }} className="font-mono text-[8px] md:text-[9px] leading-tight uppercase tracking-wide text-text-secondary">{LABELS[i]}</motion.span>
      </div>
      <motion.div
        style={{ opacity: lit }}
        className="absolute inset-0 bg-[linear-gradient(135deg,#FB923C,#EA580C)] shadow-[inset_0_0_0_1px_rgba(255,220,180,0.6),0_0_30px_rgba(249,115,22,0.45)]"
      >
        <div className="absolute inset-[18%] border border-white/30" />
      </motion.div>
    </motion.div>
  );
}

function Chapter({ i, p }: { i: number; p: MotionValue<number> }) {
  const c = story.chapters[i];
  const centre = [0.08, 0.36, 0.66, 0.93][i];
  const opacity = useTransform(p, i === 0 ? [0, 0.18, 0.24] : i === 3 ? [0.8, 0.86, 1] : [centre - 0.16, centre - 0.1, centre + 0.1, centre + 0.16], i === 0 ? [1, 1, 0] : i === 3 ? [0, 1, 1] : [0, 1, 1, 0]);
  const y = useTransform(opacity, [0, 1], [30, 0]);
  return (
    <div className="absolute inset-x-0 bottom-0 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2">
    <motion.div style={{ opacity, y }}>
      <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-primary mb-4">0{i + 1} — {c.label}</p>
      <h2 className="font-heading font-bold text-ink text-3xl md:text-5xl leading-[1.04] tracking-[-0.03em] mb-4 md:mb-5">{c.title}</h2>
      <p className="text-text-secondary text-[14px] md:text-lg leading-relaxed">{c.body}</p>
    </motion.div>
    </div>
  );
}

/** Pain → solution, told with 27 sheets of everyday friction that get mapped, engineered and released. */
export default function FrictionStory() {
  const ref = useRef<HTMLElement>(null);
  const mobile = useIsMobile(1024);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.35 });

  const T = mobile ? 34 : 62;
  const W = mobile ? 360 : 640;
  const H = mobile ? 380 : 620;

  // camera: straight-on for the map, isometric for the block, then a lift
  const sceneRX = useTransform(p, [0.4, 0.6, 0.95], [0, -24, -40]);
  const sceneRY = useTransform(p, [0.4, 0.6, 0.95], [0, -38, -70]);
  const glow = useTransform(p, [0.55, 0.7, 0.92, 1], [0, 0.6, 1, 1]);
  const bar = useTransform(p, [0, 1], ['0%', '100%']);

  return (
    <section ref={ref} className="relative" style={{ height: '460vh' }} aria-label="How we solve problems">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-40" />
        <motion.div style={{ opacity: glow }} className="absolute right-[5%] lg:right-[12%] top-[28%] w-[520px] h-[520px] rounded-full bg-primary/30 blur-[120px]" />

        <div className="relative h-full max-w-[1240px] mx-auto px-6 grid lg:grid-cols-[0.85fr_1.15fr] gap-4">
          {/* copy */}
          <div className="relative order-2 lg:order-1 h-[42vh] lg:h-full pb-6 lg:pb-0">
            {story.chapters.map((_, i) => <Chapter key={i} i={i} p={p} />)}
          </div>
          {/* stage */}
          <div className="relative order-1 lg:order-2 h-[44vh] lg:h-full mt-24 lg:mt-0 [perspective:1400px]" aria-hidden="true">
            <motion.div style={{ rotateX: sceneRX, rotateY: sceneRY }} className="absolute inset-0 [transform-style:preserve-3d]">
              {LABELS.map((_, i) => <Sheet key={i} i={i} p={p} T={T} W={W} H={H} />)}
            </motion.div>
          </div>
        </div>

        <div className="absolute left-6 right-6 top-20 lg:left-auto lg:right-8 lg:top-1/2 lg:-translate-y-1/2 lg:w-[2px] lg:h-40 h-[2px] bg-border" aria-hidden="true">
          <motion.div className="bg-primary h-full lg:h-auto lg:w-full" style={mobile ? { width: bar } : { height: bar }} />
        </div>
      </div>
    </section>
  );
}
