import { useMemo, useRef } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import Reveal from '../components/Reveal';
import { FinalCta } from '../components/ui';
import { screens } from '../components/fx/ProductScreens';
import { products } from '../data/site';
import { useSeo } from '../lib/seo';

export default function ProductDetail() {
  const { slug } = useParams();
  const product = products.find((p) => p.slug === slug);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [18, -6]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  const jsonLd = useMemo(() => product && {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS',
    description: product.body,
    publisher: { '@type': 'Organization', name: 'Kinetic Bay' },
  }, [product]);
  useSeo(product?.seoTitle ?? 'Products | Kinetic Bay', product?.seoDescription ?? '', jsonLd);
  if (!product) return <Navigate to="/products" replace />;

  const Screen = screens[product.slug];
  const others = products.filter((p) => p.slug !== product.slug);

  return (
    <div className="bg-bg">
      <section ref={ref} className="relative pt-36 pb-16 overflow-hidden border-b border-border">
        <div className="absolute inset-0 hero-grid opacity-50" />
        <motion.div style={{ y: glowY }} className="absolute left-1/2 top-[45%] -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-primary/15 blur-[130px]" />
        <div className="relative max-w-[1200px] mx-auto px-6 text-center">
          <p className="eyebrow mb-4">{product.full}</p>
          <h1 className="font-heading font-bold text-ink tracking-[-0.035em] leading-[1] mb-4" style={{ fontSize: 'clamp(44px, 7vw, 96px)' }}>{product.name}</h1>
          <p className="text-primary text-lg md:text-2xl font-medium mb-5">{product.tagline}</p>
          <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto mb-9">{product.body}</p>
          <div className="flex flex-wrap gap-3 justify-center mb-16">
            <Link to="/contact?topic=Our%20Products" className="btn-accent">Request a Demo <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/contact?topic=Our%20Products" className="btn-ghost">See It in Action</Link>
          </div>
          <div className="[perspective:1400px]">
            <motion.div
              style={{ rotateX, scale }}
              className="mx-auto max-w-[900px] aspect-[16/10] rounded-[18px] bg-[#1b1c20] border border-white/10 p-[1.6%] shadow-[0_60px_140px_-30px_rgba(249,115,22,0.45)] origin-bottom"
              role="img"
              aria-label={`${product.name} dashboard preview`}
            >
              <div className="w-full h-full rounded-[10px] overflow-hidden"><Screen /></div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-[1.2fr_0.8fr] gap-12">
          <div>
            <Reveal><p className="eyebrow mb-4">Key features</p></Reveal>
            <ul className="grid sm:grid-cols-2 gap-4">
              {product.features.map((f, i) => (
                <li key={f}>
                  <Reveal delay={(i % 2) * 80} className="kb-card p-6 h-full flex gap-4">
                    <span className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0"><Check className="w-4 h-4 text-primary" /></span>
                    <span className="text-ink text-[15px] leading-snug">{f}</span>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
          <Reveal>
            <div className="kb-card p-8 lg:sticky lg:top-32">
              <product.icon className="w-9 h-9 text-primary mb-6" />
              <p className="eyebrow mb-3">Ideal for</p>
              <p className="text-ink text-lg leading-relaxed mb-8">{product.ideal}</p>
              <p className="text-text-secondary text-[14px] mb-6">White-label it, integrate it with your existing systems, and host it on the cloud or on your own servers.</p>
              <Link to="/contact?topic=Our%20Products" className="btn-accent w-full justify-center">Book a Free Product Walkthrough</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="eyebrow mb-6">More from Kinetic Bay</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {others.map((o) => (
              <Link key={o.slug} to={`/products/${o.slug}`} className="group kb-card p-6">
                <o.icon className="w-6 h-6 text-primary mb-4" />
                <p className="font-heading font-semibold text-ink flex items-center justify-between">{o.name}<ArrowUpRight className="w-4 h-4 text-primary opacity-40 group-hover:opacity-100" /></p>
                <p className="text-text-secondary text-[13px] mt-1">{o.tagline}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
