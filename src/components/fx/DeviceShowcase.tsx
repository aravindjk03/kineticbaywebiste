import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { products } from '../../data/site';
import { screens } from './ProductScreens';

/**
 * Scroll-driven product story: the laptop opens, then turns in 3D while each
 * product takes the screen and its features peel off into depth around it.
 */
export default function DeviceShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const i = Math.min(products.length - 1, Math.max(0, Math.floor(((v - 0.08) / 0.9) * products.length)));
    setActive(i);
  });

  const lid = useTransform(p, [0, 0.08], [-86, 8]);
  const turnY = useTransform(p, [0, 1], [-24, 20]);
  const turnX = useTransform(p, [0, 0.5, 1], [16, 8, 14]);
  const lift = useTransform(p, [0, 0.1], [60, 0]);
  const phoneY = useTransform(p, [0, 1], [80, -60]);
  const progress = useTransform(p, [0.08, 0.98], ['0%', '100%']);

  const product = products[active];
  const Screen = screens[product.slug];

  return (
    <section ref={ref} className="relative" style={{ height: `${products.length * 90 + 70}vh` }} aria-label="Product showcase">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div className="absolute inset-0 hero-grid opacity-40" />
        <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-primary/10 blur-[140px]" />

        <div className="relative max-w-[1200px] mx-auto px-6 w-full grid lg:grid-cols-[0.9fr_1.1fr] gap-6 lg:gap-12 items-center">
          {/* copy */}
          <div className="order-2 lg:order-1 min-h-[300px] sm:min-h-[340px]">
            <div className="flex items-center gap-2 mb-4 lg:mb-5" aria-hidden="true">
              {products.map((pr, i) => (
                <span key={pr.slug} className={`h-1 rounded-full transition-all duration-500 ${i === active ? 'w-10 bg-primary' : 'w-4 bg-border'}`} />
              ))}
              <span className="ml-2 text-[11px] text-text-secondary tabular-nums">0{active + 1} / 0{products.length}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={product.slug}
                initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -24, filter: 'blur(6px)' }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="eyebrow mb-3">{product.full}</p>
                <h3 className="font-heading font-bold text-ink text-3xl lg:text-5xl leading-[1.02] tracking-[-0.03em] mb-2 lg:mb-3">{product.name}</h3>
                <p className="text-primary font-medium text-base sm:text-lg mb-3">{product.tagline}</p>
                <p className="text-text-secondary text-[14px] sm:text-[15px] leading-relaxed mb-5 hidden xl:block">{product.body}</p>
                <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 mb-6">
                  {product.features.slice(0, 4).map((f, i) => (
                    <li key={f} className={`items-start gap-2 text-[13px] text-text-secondary ${i > 1 ? 'hidden lg:flex' : 'flex'}`}><Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />{f}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Link to={`/products/${product.slug}`} className="btn-accent">Explore {product.short} <ArrowRight className="w-4 h-4" /></Link>
                  <Link to="/contact?topic=Our%20Products" className="btn-ghost">Request a Demo</Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* device */}
          <div className="order-1 lg:order-2 relative h-[230px] sm:h-[320px] lg:h-[500px] [perspective:1600px]">
            <motion.div style={{ rotateY: turnY, rotateX: turnX, y: lift }} className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]">
              <div className="relative w-[88%] max-w-[560px] aspect-[16/10] [transform-style:preserve-3d]">
                {/* lid */}
                <motion.div style={{ rotateX: lid }} className="absolute inset-0 origin-bottom [transform-style:preserve-3d]">
                  <div className="absolute inset-0 rounded-[14px] bg-[#1b1c20] border border-white/10 p-[2.2%] shadow-[0_40px_120px_-20px_rgba(240,138,75,0.35)] [backface-visibility:hidden]">
                    <div className="w-full h-full rounded-[8px] overflow-hidden relative bg-black">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={product.slug}
                          className="absolute inset-0"
                          initial={{ clipPath: 'inset(0 0 100% 0)' }}
                          animate={{ clipPath: 'inset(0 0 0% 0)' }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
                        >
                          <Screen />
                        </motion.div>
                      </AnimatePresence>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent pointer-events-none" />
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-[14px] bg-[#131417] [transform:rotateY(180deg)] [backface-visibility:hidden] flex items-center justify-center">
                    <img src="/kineticbay.png" alt="" className="w-12 opacity-60" />
                  </div>
                </motion.div>
                {/* base */}
                <div className="absolute left-[-6%] right-[-6%] top-full h-[62%] origin-top [transform:rotateX(90deg)] rounded-b-[18px] rounded-t-[4px] bg-gradient-to-b from-[#26272c] to-[#141518] border border-white/10">
                  <div className="absolute inset-x-[8%] top-[10%] h-[48%] rounded grid grid-cols-12 gap-[3px] p-[3px] opacity-50">
                    {Array.from({ length: 48 }, (_, i) => <span key={i} className="rounded-[2px] bg-black/60" />)}
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-[10%] w-[30%] h-[24%] rounded-md bg-black/40" />
                </div>

                {/* features peeling off into depth */}
                <AnimatePresence>
                  {product.features.slice(0, 3).map((f, i) => (
                    <motion.div
                      key={product.slug + f}
                      className="absolute hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-bg/85 backdrop-blur border border-primary/30 text-[11px] text-ink shadow-ember-sm max-w-[220px]"
                      style={{ left: ['-14%', '72%', '-8%'][i], top: ['8%', '30%', '74%'][i] }}
                      initial={{ opacity: 0, z: 0, scale: 0.6 }}
                      animate={{ opacity: 1, z: [140, 200, 110][i], scale: 1 }}
                      exit={{ opacity: 0, z: 0, scale: 0.6 }}
                      transition={{ delay: 0.25 + i * 0.1, type: 'spring', stiffness: 140, damping: 18 }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{f}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* companion phone on a nearer plane */}
            <motion.div style={{ y: phoneY }} className="absolute right-[2%] bottom-[4%] w-[22%] max-w-[120px] aspect-[9/19] rounded-[18px] bg-[#1b1c20] border border-white/10 p-[5%] shadow-[0_30px_80px_-10px_rgba(0,0,0,0.8)] hidden lg:block">
              <div className="w-full h-full rounded-[12px] bg-[#0c0d0f] p-2 flex flex-col gap-1.5">
                <span className="h-1.5 w-1/2 rounded bg-primary" />
                <span className="flex-1 rounded bg-white/[0.04] border border-white/5 flex items-center justify-center">
                  <product.icon className="w-6 h-6 text-primary" />
                </span>
                {[80, 60, 70].map((w) => <span key={w} className="h-1.5 rounded bg-white/10" style={{ width: `${w}%` }} />)}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border/50">
          <motion.div className="h-full bg-primary shadow-[0_0_10px_#F08A4B]" style={{ width: progress }} />
        </div>
      </div>
    </section>
  );
}
