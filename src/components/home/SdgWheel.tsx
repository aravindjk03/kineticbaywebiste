import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion';
import { sdgs, sdgIntro } from '../../data/site';

// Official UN SDG palette, goals 1–17
const SDG_COLORS = ['#E5243B', '#DDA63A', '#4C9F38', '#C5192D', '#FF3A21', '#26BDE2', '#FCC30B', '#A21942', '#FD6925', '#DD1367', '#FD9D24', '#BF8B2E', '#3F7E44', '#0A97D9', '#56C02B', '#00689D', '#19486A'];
const SEG = 360 / 17;
const R_IN = 118;
const R_OUT = 186;

const rad = (d: number) => (d * Math.PI) / 180;
function sector(a0: number, a1: number, r0: number, r1: number) {
  const p = (r: number, a: number) => `${(r * Math.cos(rad(a))).toFixed(2)} ${(r * Math.sin(rad(a))).toFixed(2)}`;
  return `M ${p(r0, a0)} L ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
}
// goal n (1-based) is centred at this angle before rotation (goal 1 at 12 o'clock)
const centre = (n: number) => (n - 1) * SEG - 90;

/** Scroll turns the UN SDG wheel so each goal we contribute to lands on the pointer. */
export default function SdgWheel() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const rotation = useSpring(-centre(sdgs[0].num), { stiffness: 70, damping: 18 });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const i = Math.min(sdgs.length - 1, Math.max(0, Math.floor(v * sdgs.length * 0.999)));
    if (i !== active) setActive(i);
    // the pointer sits at 3 o'clock (0°), so rotate the active goal's centre onto it
    rotation.set(-centre(sdgs[i].num));
  });

  const goal = sdgs[active];
  const ours = new Set(sdgs.map((s) => s.num));

  const scrollToGoal = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((i + 0.5) / sdgs.length), behavior: 'smooth' });
  };

  return (
    <section ref={ref} className="relative" style={{ height: `${sdgs.length * 70 + 30}vh` }} aria-label="Sustainable Development Goals we contribute to">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div className="absolute inset-0 hero-grid opacity-40" />
        <div className="relative max-w-[1240px] mx-auto px-6 w-full grid lg:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-14 items-center">
          {/* wheel */}
          <div className="relative mx-auto w-[min(78vw,340px)] sm:w-[min(60vw,420px)] lg:w-[min(46vw,560px)] aspect-square">
            <div className="absolute inset-[8%] rounded-full blur-[70px] transition-colors duration-700" style={{ background: `${goal.color}40` }} />
            <motion.svg viewBox="-220 -220 440 440" className="relative w-full h-full" style={{ rotate: rotation }} aria-hidden="true">
              {SDG_COLORS.map((c, i) => {
                const n = i + 1;
                const mine = ours.has(n);
                const on = n === goal.num;
                const a0 = centre(n) - SEG / 2 + 0.8;
                const a1 = centre(n) + SEG / 2 - 0.8;
                const r1 = on ? R_OUT + 22 : mine ? R_OUT + 6 : R_OUT;
                const mid = (R_IN + r1) / 2;
                const ta = centre(n);
                return (
                  <g key={n} style={{ transition: 'opacity 0.5s' }} opacity={on ? 1 : mine ? 0.8 : 0.16}>
                    <path d={sector(a0, a1, R_IN, r1)} fill={c} />
                    <text
                      x={mid * Math.cos(rad(ta))} y={mid * Math.sin(rad(ta))}
                      fill="#fff" fontSize="15" fontWeight="700" fontFamily="Space Grotesk, sans-serif"
                      textAnchor="middle" dominantBaseline="central"
                      transform={`rotate(${ta + 90} ${mid * Math.cos(rad(ta))} ${mid * Math.sin(rad(ta))})`}
                    >
                      {n}
                    </text>
                  </g>
                );
              })}
              <circle r={R_IN - 14} fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 6" />
            </motion.svg>

            {/* fixed centre readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-secondary uppercase">Goal</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={goal.num}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -30, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="font-heading font-bold leading-none"
                  style={{ fontSize: 'clamp(56px, 9vw, 110px)', color: goal.color }}
                >
                  {String(goal.num).padStart(2, '0')}
                </motion.span>
              </AnimatePresence>
            </div>
            {/* pointer */}
            <div className="absolute right-[-2%] top-1/2 -translate-y-1/2 flex items-center" aria-hidden="true">
              <span className="w-0 h-0 border-y-[9px] border-y-transparent border-r-[14px]" style={{ borderRightColor: goal.color }} />
            </div>
          </div>

          {/* story */}
          <div className="min-h-[300px]">
            <p className="eyebrow mb-3">{sdgIntro.eyebrow} · UN SDGs</p>
            <p className="text-text-secondary text-[14px] leading-relaxed mb-6 max-w-md hidden lg:block">
              Six of the seventeen goals are ones our work moves forward. Scroll to turn the wheel.
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={goal.num}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="h-[3px] w-10" style={{ background: goal.color }} />
                  <span className="font-mono text-[12px] tracking-[0.2em] uppercase" style={{ color: goal.color }}>SDG {goal.num}</span>
                </div>
                <h3 className="font-heading font-bold text-ink text-3xl md:text-5xl leading-[1.04] tracking-[-0.025em] mb-5">{goal.title}</h3>
                <p className="text-text-secondary text-base md:text-lg leading-relaxed max-w-lg">{goal.body}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex gap-2 mt-8" role="tablist" aria-label="Goals">
              {sdgs.map((s, i) => (
                <button
                  key={s.num}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`SDG ${s.num}: ${s.title}`}
                  onClick={() => scrollToGoal(i)}
                  className="h-9 min-w-9 px-2 font-mono text-[12px] font-bold transition-all duration-300"
                  style={{ background: i === active ? s.color : 'rgba(255,255,255,0.05)', color: i === active ? '#fff' : '#94A3B8' }}
                >
                  {s.num}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-secondary/50 mt-6">Aligned with and contributing to the UN SDGs. This does not imply UN endorsement.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
