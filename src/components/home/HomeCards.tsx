import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { ArrowUpRight, Check } from 'lucide-react';
import Btn from '../Btn';
import { pillars, products, industries } from '../../data/site';
import { screens } from '../fx/ProductScreens';

/* ════════════════════════════════════════════════════════
   Pillars — four vertical plates; the focused one opens
   like a drawer and the others fold to their spines.
═══════════════════════════════════════════════════════════ */

export function PillarPanels() {
  const [open, setOpen] = useState(0);
  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:h-[560px]">
      {pillars.map((p, i) => {
        const isOpen = open === i;
        return (
          <motion.div
            key={p.slug}
            layout
            onMouseEnter={() => setOpen(i)}
            onFocus={() => setOpen(i)}
            onClick={() => setOpen(i)}
            transition={{ layout: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
            className={`kb-card relative overflow-hidden cursor-pointer ${isOpen ? 'lg:flex-[3.4]' : 'lg:flex-1'} ${isOpen ? 'min-h-[460px]' : 'min-h-[86px]'} lg:min-h-0`}
          >
            <span className="kb-tab" />
            {/* spine: visible when folded */}
            <div className={`absolute inset-0 hidden lg:flex flex-col justify-between p-6 transition-opacity duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <span className="font-mono text-[11px] text-primary">0{i + 1}</span>
              <p className="font-heading font-bold text-ink text-2xl whitespace-nowrap [writing-mode:vertical-rl] rotate-180">{p.name}</p>
              <p.icon className="w-6 h-6 text-primary/70" />
            </div>
            {/* mobile header row */}
            <div className="lg:hidden flex items-center gap-4 p-6">
              <span className="font-mono text-[11px] text-primary">0{i + 1}</span>
              <p className="font-heading font-bold text-ink text-xl flex-1">{p.name}</p>
              <p.icon className="w-6 h-6 text-primary" />
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  key="body"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.25, duration: 0.5 } }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  className="relative lg:absolute lg:inset-0 p-6 pt-0 lg:p-10 flex flex-col"
                >
                  <span className="hidden lg:block absolute right-8 top-2 outline-word-sm font-heading font-bold text-[170px] leading-none" aria-hidden="true">0{i + 1}</span>
                  <div className="hidden lg:flex w-14 h-14 items-center justify-center mb-8 bg-primary/10 border border-primary/30">
                    <p.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="hidden lg:block font-heading font-bold text-ink text-4xl tracking-[-0.025em] mb-2">{p.name}</h3>
                  <p className="text-primary font-medium text-lg mb-4">{p.tagline}</p>
                  <p className="text-text-secondary text-[15px] leading-relaxed mb-6 max-w-xl">{p.intro}</p>
                  <div className="flex flex-wrap gap-2 mb-8 max-w-2xl">
                    {p.services.slice(0, 6).map((s) => (
                      <span key={s.name} className="px-3 py-1.5 text-[12px] text-ink/90 bg-white/[0.04] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">{s.name}</span>
                    ))}
                    {p.services.length > 6 && <span className="px-3 py-1.5 text-[12px] text-primary">+{p.services.length - 6} more</span>}
                  </div>
                  <div className="mt-auto"><Btn to={`/services/${p.slug}`} variant="line" className="kbtn-sm">{`Explore ${p.name}`}</Btn></div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Products — full-width cards that stick and stack; each
   one sinks back into depth as the next slides over it.
═══════════════════════════════════════════════════════════ */

function StackCard({ i, total, progress }: { i: number; total: number; progress: MotionValue<number> }) {
  const p = products[i];
  const Screen = screens[p.slug];
  const start = i / total;
  const last = i === total - 1;
  // earlier cards recede further; the final card stays full size and undimmed
  const scale = useTransform(progress, [start, 1], [1, 1 - (total - 1 - i) * 0.04]);
  const dim = useTransform(progress, last ? [0, 1] : [start, start + 1 / total, 1], last ? [0, 0] : [0, 0.25, 0.55]);
  return (
    <div className="sticky" style={{ top: `calc(96px + ${i * 22}px)` }}>
      <motion.article style={{ scale, transformOrigin: 'top center' }} className="kb-card relative overflow-hidden h-[min(560px,72vh)] mb-8">
        <span className="kb-tab" />
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] h-full">
          <div className="p-7 md:p-10 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <span className="font-mono text-[11px] tracking-[0.2em] text-text-secondary">PRODUCT 0{i + 1} / 0{total}</span>
              <p.icon className="w-6 h-6 text-primary" />
            </div>
            <p className="eyebrow mb-3">{p.full}</p>
            <h3 className="font-heading font-bold text-ink text-4xl md:text-5xl tracking-[-0.03em] mb-3">{p.name}</h3>
            <p className="text-primary text-lg mb-6">{p.tagline}</p>
            <ul className="space-y-2 mb-8 hidden sm:block">
              {p.features.slice(0, 3).map((f) => (
                <li key={f} className="flex gap-2.5 text-[14px] text-text-secondary"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />{f}</li>
              ))}
            </ul>
            <div className="mt-auto"><Btn to={`/products/${p.slug}`} className="kbtn-sm">{`Explore ${p.short}`}</Btn></div>
          </div>
          <div className="relative hidden lg:block [perspective:1200px] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_50%,rgba(249,115,22,0.22),transparent_60%)]" />
            <div className="absolute left-[8%] top-[14%] w-[118%] aspect-[16/10] [transform:rotateY(-18deg)_rotateX(6deg)] origin-left shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
              <Screen />
            </div>
          </div>
        </div>
        <motion.div style={{ opacity: dim }} className="absolute inset-0 bg-bg pointer-events-none" />
      </motion.article>
    </div>
  );
}

export function ProductStack() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  return (
    <div ref={ref} className="relative">
      {products.map((p, i) => <StackCard key={p.slug} i={i} total={products.length} progress={scrollYProgress} />)}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Industries — an editorial index. Rows open on hover and a
   glowing tile with the sector's mark trails the cursor.
═══════════════════════════════════════════════════════════ */

export function IndustryIndex() {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 250, damping: 26 });
  const y = useSpring(my, { stiffness: 250, damping: 26 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };
  const Icon = hover !== null ? industries[hover].icon : null;

  return (
    <div ref={ref} className="relative border-t border-border" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {industries.map((ind, i) => (
        <div
          key={ind.name}
          onMouseEnter={() => setHover(i)}
          className="group relative border-b border-border py-6 md:py-7 grid md:grid-cols-[80px_1fr_1fr] gap-2 md:gap-6 items-baseline"
        >
          <span className="font-mono text-[12px] text-text-secondary group-hover:text-primary transition-colors">{String(i + 1).padStart(2, '0')}</span>
          <h3 className="font-heading font-bold text-ink text-2xl md:text-4xl tracking-[-0.025em] transition-all duration-500 group-hover:text-primary md:group-hover:translate-x-4">{ind.name}</h3>
          <p className="text-text-secondary text-[14px] md:text-[15px] leading-relaxed md:opacity-40 group-hover:opacity-100 transition-opacity duration-500">{ind.body}</p>
          <span className="absolute left-0 bottom-[-1px] h-px w-0 bg-primary group-hover:w-full transition-all duration-700" />
        </div>
      ))}
      <motion.div
        style={{ x, y }}
        className="pointer-events-none absolute left-0 top-0 hidden md:block z-10"
        aria-hidden="true"
      >
        <AnimatePresence>
          {Icon && (
            <motion.div
              key={hover}
              initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: -8 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="-translate-x-1/2 -translate-y-1/2 w-28 h-28 grid place-items-center bg-primary text-bg shadow-[0_20px_60px_-10px_rgba(249,115,22,0.7)] [clip-path:polygon(0_0,calc(100%_-_16px)_0,100%_16px,100%_100%,0_100%)]"
            >
              <Icon className="w-12 h-12" strokeWidth={1.6} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Explore — oversized link rows with a sweeping fill.
═══════════════════════════════════════════════════════════ */

export function ExploreRows({ rows }: { rows: { to: string; eyebrow: string; title: string }[] }) {
  return (
    <div className="border-t border-border">
      {rows.map((r) => (
        <Link key={r.to} to={r.to} className="group relative block border-b border-border overflow-hidden">
          <span className="absolute inset-0 bg-primary origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.2,1)]" />
          <div className="relative flex items-center justify-between gap-6 py-8 md:py-10 px-2">
            <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-10">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary group-hover:text-bg transition-colors md:w-44">{r.eyebrow}</span>
              <span className="font-heading font-bold text-ink text-2xl md:text-4xl tracking-[-0.02em] group-hover:text-bg transition-colors">{r.title}</span>
            </div>
            <ArrowUpRight className="w-8 h-8 text-primary shrink-0 group-hover:text-bg group-hover:rotate-45 transition-all duration-500" />
          </div>
        </Link>
      ))}
    </div>
  );
}
