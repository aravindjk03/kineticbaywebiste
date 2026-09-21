import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import Reveal from './Reveal';
import FlowField from './fx/FlowField';
import { faqs, finalCta } from '../data/site';

export function SectionHead({ eyebrow, title, body, center = false, className = '' }: {
  eyebrow: string; title: ReactNode; body?: string; center?: boolean; className?: string;
}) {
  return (
    <Reveal className={`${center ? 'text-center mx-auto' : ''} max-w-3xl mb-12 md:mb-16 ${className}`}>
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h2 className="font-heading font-bold text-ink text-3xl md:text-5xl leading-[1.05] tracking-[-0.025em] mb-5">{title}</h2>
      {body && <p className="text-text-secondary text-base md:text-lg leading-relaxed">{body}</p>}
    </Reveal>
  );
}

export function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min((now - start) / 1800, 1);
        setShown(Math.round((1 - Math.pow(1 - k, 3)) * value));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return <span ref={ref} className="tabular-nums">{shown}{suffix}</span>;
}

function FaqRow({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(i === 0);
  const id = `faq-${i}`;
  return (
    <div className="border-b border-border">
      <button
        className="w-full flex items-center justify-between gap-6 text-left py-5 group"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
      >
        <span className="flex items-baseline gap-4">
          <span className="text-primary/60 font-heading text-sm tabular-nums">{String(i + 1).padStart(2, '0')}</span>
          <span className="font-heading font-semibold text-ink text-[17px] md:text-[19px] group-hover:text-primary transition-colors">{q}</span>
        </span>
        <ChevronDown className={`w-5 h-5 text-primary shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 pl-10 text-text-secondary text-[15px] md:text-base leading-relaxed max-w-3xl">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const faqJsonLd = {
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

export function FaqSection() {
  return (
    <section className="section-py">
      <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
        <div className="lg:sticky lg:top-32 self-start">
          <SectionHead eyebrow="FAQ" title="Questions? We have answers." className="mb-0" />
          <Reveal>
            <p className="text-text-secondary mt-4 mb-6">Can't find what you're looking for?</p>
            <Link to="/contact" className="btn-ghost">Ask us directly <ArrowRight className="w-4 h-4" /></Link>
          </Reveal>
        </div>
        <Reveal>
          <div className="border-t border-border">
            {faqs.map((f, i) => <FaqRow key={f.q} q={f.q} a={f.a} i={i} />)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-border min-h-[80vh] flex items-center">
      <FlowField />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,9,10,0.35),rgba(8,9,10,0.92)_70%)] pointer-events-none" />
      <div className="relative max-w-[1000px] mx-auto px-6 py-28 text-center">
        <Reveal>
          <p className="eyebrow mb-5">{finalCta.eyebrow}</p>
          <h2 className="font-heading font-bold text-ink text-3xl sm:text-5xl md:text-6xl leading-[1.04] tracking-[-0.03em] mb-6">
            Have a process that's slowing you down?{' '}
            <span className="text-gradient-primary">Let's build the machine that fixes it.</span>
          </h2>
          <p className="text-text-secondary text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10">{finalCta.body}</p>
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <Link to="/contact" className="btn-accent">{finalCta.primary} <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/contact?topic=Our%20Products" className="btn-ghost">{finalCta.secondary}</Link>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-text-secondary">
            {finalCta.reassurance.map((r) => (
              <li key={r} className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" />{r}</li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
