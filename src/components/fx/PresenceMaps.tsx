import { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import india from '../../data/indiaDots.json';
import world from '../../data/worldDots.json';
import { story } from '../../data/site';

type XY = [number, number];

function Arc({ from, to, p, range, lift = 0.35, width }: { from: XY; to: XY; p: MotionValue<number>; range: [number, number]; lift?: number; width: number }) {
  const [x1, y1] = from, [x2, y2] = to;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const d = Math.hypot(x2 - x1, y2 - y1);
  const cx = mx, cy = my - d * lift;
  const pathLength = useTransform(p, range, [0, 1]);
  const dot = useTransform(p, [range[1] - 0.02, range[1]], [0, 1]);
  return (
    <g>
      <motion.path d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} fill="none" stroke="#F97316" strokeWidth={width} strokeLinecap="round" style={{ pathLength }} />
      <motion.circle cx={x2} cy={y2} r={width * 2.2} fill="#FFAB00" style={{ opacity: dot }} />
    </g>
  );
}

const LINES = [
  { k: 'Headquartered in Chennai.', sub: 'Our home base on the Bay of Bengal, Tamil Nadu.' },
  { k: 'Present across India.', sub: 'From metro enterprises to growing businesses in tier-2 and tier-3 cities.' },
  { k: 'Serving the world.', sub: 'We work in your time zone and speak your business language.' },
];

function Line({ i, p }: { i: number; p: MotionValue<number> }) {
  const at = [0.08, 0.35, 0.8][i];
  const opacity = useTransform(p, i === 0 ? [0, 0.2, 0.26] : i === 2 ? [0.55, 0.62, 1] : [at - 0.12, at - 0.06, 0.48, 0.54], i === 0 ? [1, 1, 0] : i === 2 ? [0, 1, 1] : [0, 1, 1, 0]);
  const y = useTransform(opacity, [0, 1], [24, 0]);
  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-0 top-0">
      <p className="font-heading font-bold text-ink text-3xl md:text-5xl tracking-[-0.03em] leading-[1.05] mb-4">{LINES[i].k}</p>
      <p className="text-text-secondary text-base md:text-lg max-w-md">{LINES[i].sub}</p>
    </motion.div>
  );
}

/** India (with Chennai pulsing and arcs to other cities) zooms out into a dotted world map. */
export default function PresenceMaps() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 100, damping: 26, mass: 0.3 });

  const indiaScale = useTransform(p, [0.42, 0.6], [1, 0.25]);
  const indiaOpacity = useTransform(p, [0.46, 0.58], [1, 0]);
  const worldScale = useTransform(p, [0.42, 0.62], [3.2, 1]);
  const worldOpacity = useTransform(p, [0.45, 0.58], [0, 1]);

  const cityEntries = Object.entries(india.cities) as [string, XY][];
  const worldEntries = Object.entries(world.world) as [string, XY][];
  const chennaiW = world.chennai as XY;
  const originW = `${(chennaiW[0] / world.w) * 100}% ${(chennaiW[1] / world.h) * 100}%`;

  return (
    <section ref={ref} className="relative border-y border-border" style={{ height: '320vh' }} aria-label={story.presenceTitle}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_50%,rgba(249,115,22,0.10),transparent_60%)]" />
        <div className="relative h-full max-w-[1240px] mx-auto px-6 grid lg:grid-cols-[0.8fr_1.2fr] items-center gap-6">
          <div className="order-2 lg:order-1 relative h-[210px] lg:h-[260px]">
            <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-primary mb-5 absolute -top-10">[ Where we are ]</p>
            {LINES.map((_, i) => <Line key={i} i={i} p={p} />)}
          </div>

          <div className="order-1 lg:order-2 relative h-[52vh] lg:h-[78vh] mt-20 lg:mt-0">
            {/* India */}
            <motion.svg
              viewBox={`-2 -2 ${india.w + 4} ${india.h + 4}`}
              className="absolute inset-0 w-full h-full"
              style={{ scale: indiaScale, opacity: indiaOpacity, transformOrigin: `${(india.chennai[0] / india.w) * 100}% ${(india.chennai[1] / india.h) * 100}%` }}
              role="img"
              aria-label="Map of India with Chennai highlighted"
            >
              {(india.p as XY[]).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.34} fill="rgba(241,245,249,0.32)" />)}
              {cityEntries.map(([name, to], i) => (
                <Arc key={name} from={india.chennai as XY} to={to} p={p} range={[0.06 + i * 0.022, 0.2 + i * 0.022]} width={0.22} />
              ))}
              {cityEntries.filter(([name]) => !['Pune', 'Jaipur'].includes(name)).map(([name, [x, y]]) => (
                <text key={name} x={x + 1} y={y - 0.8} fontSize="1.5" fill="rgba(241,245,249,0.6)" fontFamily="JetBrains Mono, monospace">{name}</text>
              ))}
              <circle cx={india.chennai[0]} cy={india.chennai[1]} r={0.9} fill="#F97316" />
              <circle cx={india.chennai[0]} cy={india.chennai[1]} r={0.9} fill="none" stroke="#F97316" strokeWidth={0.25} className="map-ping" />
              <text x={india.chennai[0] + 1.6} y={india.chennai[1] + 0.6} fontSize="2.1" fontWeight="700" fill="#F97316" fontFamily="Space Grotesk, sans-serif">Chennai</text>
            </motion.svg>

            {/* World */}
            <motion.svg
              viewBox={`-1 -1 ${world.w + 2} ${world.h + 2}`}
              className="absolute inset-0 w-full h-full"
              style={{ scale: worldScale, opacity: worldOpacity, transformOrigin: originW }}
              role="img"
              aria-label="World map showing Kinetic Bay's reach from Chennai"
            >
              {(world.p as [number, number, number][]).map(([x, y, isIndia], i) => (
                <circle key={i} cx={x} cy={y} r={0.3} fill={isIndia ? '#F97316' : 'rgba(241,245,249,0.26)'} />
              ))}
              {worldEntries.map(([name, to], i) => (
                <Arc key={name} from={chennaiW} to={to} p={p} range={[0.62 + i * 0.035, 0.8 + i * 0.03]} width={0.24} lift={0.3} />
              ))}
              <circle cx={chennaiW[0]} cy={chennaiW[1]} r={0.8} fill="#F97316" />
              <circle cx={chennaiW[0]} cy={chennaiW[1]} r={0.8} fill="none" stroke="#F97316" strokeWidth={0.2} className="map-ping" />
            </motion.svg>
          </div>
        </div>
      </div>
    </section>
  );
}
