import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Bot, MessageSquare, Globe, Cloud, Target, Users, Zap, TrendingUp, Shield, Code2, Layers, Megaphone } from 'lucide-react';
import Reveal from '../components/Reveal';
import GradientBlinds from '../components/GradientBlinds';
import Shuffle from '../components/Shuffle';

import ScrollFloat from '../components/ScrollFloat';
import TiltCard from '../components/TiltCard';
import LeadGenForm from '../components/LeadGenForm';


/* ─── ANIMATED COUNTER ─────────────────────────────────── */

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true);
        const duration = 2000;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplayed(Math.floor(eased * value));
          if (progress < 1) requestAnimationFrame(tick);
          else setDisplayed(value);
        };
        tick();
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, started]);
  return <span ref={ref}>{displayed.toLocaleString()}{suffix}</span>;
}

/* ─── SCROLL PARALLAX SECTION ──────────────────────────── */

function ParallaxSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

/* ─── DATA ─────────────────────────────────────────────── */

const services = [
  { icon: Bot, title: 'AI Agents & Automation', desc: 'Intelligent agents that reason, plan, and act — built on Azure AI Foundry.' },
  { icon: MessageSquare, title: 'Conversational AI', desc: 'Chatbots and voice agents that understand context and close the loop.' },
  { icon: Globe, title: 'Web Applications', desc: 'High-performance SPAs and full-stack apps that scale under pressure.' },
  { icon: Code2, title: 'Custom Development & Projects', desc: 'Bespoke software projects built from the ground up to fit your exact business needs.' },
  { icon: Layers, title: 'Website Design & Development', desc: 'Visually stunning, high-performance, and responsive websites optimized for growth.' },
  { icon: Megaphone, title: 'Brand Building & Identity', desc: 'Cohesive brand strategy, logo design, visual identity, and go-to-market messaging.' },
  { icon: Cloud, title: 'Cloud & DevOps', desc: 'Azure-native infrastructure with CI/CD pipelines that ship fast and stay stable.' },
];

const sdgCards = [
  { num: '01', title: 'EduReach', desc: 'AI-adaptive learning tools for underserved communities.', tag: 'SDG 4' },
  { num: '02', title: 'HealthBridge', desc: 'Remote diagnostics & telemedicine for low-resource settings.', tag: 'SDG 3' },
  { num: '03', title: 'CarbonLens', desc: 'Real-time carbon tracking dashboards for SMEs.', tag: 'SDG 13' },
  { num: '04', title: 'GreenChain', desc: 'Transparent ESG supply-chain verification platform.', tag: 'SDG 12' },
  { num: '05', title: 'CityPulse', desc: 'Smart civic analytics platform for urban planners.', tag: 'SDG 11' },
  { num: '06', title: 'GrowthLink', desc: 'Credit-scoring AI for underbanked micro-enterprises.', tag: 'SDG 8' },
  { num: '07', title: 'InnoGrid', desc: 'Predictive grid management for renewable energy operators.', tag: 'SDG 7' },
];

const stats = [
  { value: 7, suffix: '', label: 'SDG-aligned products' },
  { value: 99, suffix: '%', label: 'Azure uptime SLA' },
  { value: 5, suffix: '+', label: 'countries served' },
  { value: 40, suffix: '%', label: 'faster time-to-deploy' },
];

const steps = [
  { num: '01', title: 'Discovery', desc: 'Deep-dive into your stack, constraints, and goals.' },
  { num: '02', title: 'Blueprint', desc: 'Architecture design with measurable milestones.' },
  { num: '03', title: 'Build', desc: 'Iterative sprints with weekly demos, no surprises.' },
  { num: '04', title: 'Launch & Scale', desc: 'Production deploy, monitoring, and iterative growth.' },
];

/* ─── HOME PAGE ────────────────────────────────────────── */

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroTextY = useTransform(heroScroll, [0, 1], [0, -120]);
  const heroOpacity = useTransform(heroScroll, [0, 0.6], [1, 0]);
  const heroScale = useTransform(heroScroll, [0, 1], [1, 0.92]);

  return (
    <div className="overflow-hidden bg-bg">

      {/* ── HERO ────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
        {/* GradientBlinds — orange brand theme */}
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}>
          <GradientBlinds
            gradientColors={['#F97316', '#EA580C', '#1a0800', '#08090A']}
            angle={0}
            noise={0.18}
            blindCount={12}
            blindMinWidth={50}
            spotlightRadius={0.55}
            spotlightSoftness={1.2}
            spotlightOpacity={0.9}
            mouseDampening={0.18}
            distortAmount={0}
            shineDirection="left"
            mixBlendMode="normal"
          />
        </div>




        {/* Text */}
        <motion.div
          style={{ y: heroTextY, opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 max-w-[1200px] mx-auto px-6 pt-28 pb-20 w-full"
        >
          <motion.p
            className="eyebrow mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Full-Stack AI Studio
          </motion.p>
          <h1
            className="font-heading font-bold text-ink leading-[1.03] tracking-[-0.03em] mb-6 max-w-2xl"
            style={{ fontSize: 'clamp(42px, 6vw, 80px)' }}
          ><Shuffle
              text="Engineering "
              tag="span"
              textAlign="left"
              shuffleDirection="right"
              duration={0.35}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power3.out"
              stagger={0.03}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={true}
              respectReducedMotion={true}
              className="font-heading font-bold text-ink leading-[1.03] tracking-[-0.03em]"
              style={{ fontSize: 'inherit' }}
            /><span className="text-primary"><Shuffle
                text="Momentum "
                tag="span"
                textAlign="left"
                shuffleDirection="right"
                duration={0.35}
                animationMode="evenodd"
                shuffleTimes={1}
                ease="power3.out"
                stagger={0.03}
                threshold={0.1}
                triggerOnce={true}
                triggerOnHover={true}
                respectReducedMotion={true}
                className="font-heading font-bold leading-[1.03] tracking-[-0.03em]"
                style={{ fontSize: 'inherit' }}
              /></span><Shuffle
              text="for a Sustainable World."
              tag="span"
              textAlign="left"
              shuffleDirection="right"
              duration={0.35}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power3.out"
              stagger={0.03}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={true}
              respectReducedMotion={true}
              className="font-heading font-bold text-ink leading-[1.03] tracking-[-0.03em]"
              style={{ fontSize: 'inherit' }}
            /></h1>
          <motion.p
            className="text-text-secondary text-xl leading-relaxed max-w-xl mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Kinetic Bay builds AI agents, cloud-native apps, and SDG-aligned software products that actually ship — and prove their impact.
          </motion.p>
          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <Link to="/contact" className="btn-accent rounded-lg inline-flex items-center gap-2">
              Start a Project <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/solutions" className="btn-ghost rounded-lg inline-flex items-center gap-2">
              See Our Products
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-primary" />
          <span className="text-[10px] text-text-secondary uppercase tracking-widest">Scroll</span>
        </motion.div>
      </section>

      {/* ── CREDIBILITY TICKER ──────────────────────── */}
      <section className="bg-surface border-y border-border py-5 overflow-hidden">
        <div className="relative">
          <div className="ticker-track flex gap-12 whitespace-nowrap" style={{ width: 'max-content' }}>
            {[...Array(2)].map((_, i) =>
              ['Azure AI Foundry', 'Angular', 'Node.js', 'Python', 'TypeScript', 'MongoDB', 'Docker', 'Kubernetes', 'CI/CD', 'SDG-Aligned', 'Zero-to-Launch', 'Full-Stack'].map((s) => (
                <span key={`${i}-${s}`} className="text-[13px] font-medium text-text-secondary/70 flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── WHY KINETIC BAY ─────────────────────────── */}
      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <p className="eyebrow mb-3">Why us</p>
            <h2 className="font-heading font-bold text-ink leading-[1.1] tracking-[-0.02em] mb-14 text-3xl md:text-5xl max-w-xl">
              <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.03}>Built different. </ScrollFloat>
              <span className="text-gradient-primary">
                <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.03}>Proven different.</ScrollFloat>
              </span>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'AI-First Architecture', desc: 'Every product is designed around AI from day one — not bolted on at the end.' },
              { icon: Target, title: 'SDG-Aligned by Design', desc: 'We only build software that creates measurable real-world impact.' },
              { icon: Shield, title: 'Azure-Native Security', desc: 'Enterprise-grade security baked in at the infrastructure level, not as an afterthought.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 100}>
              <TiltCard className="kb-card p-7 h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-ink text-[19px] leading-[1.25] mb-3">{title}</h3>
                <p className="text-text-secondary text-[15px] leading-relaxed">{desc}</p>
              </TiltCard>
            </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES PREVIEW ────────────────────────── */}
      <section className="section-py bg-surface">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <p className="eyebrow mb-3">Services</p>
            <h2 className="font-heading font-bold text-ink leading-[1.1] tracking-[-0.02em] mb-14 text-3xl md:text-5xl">
              <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.03}>What we build.</ScrollFloat>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {services.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 80}>
              <TiltCard className="kb-card p-7 flex gap-5 items-start">
                <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-ink text-[17px] leading-[1.3] mb-2">{title}</h3>
                  <p className="text-text-secondary text-[14px] leading-relaxed">{desc}</p>
                </div>
              </TiltCard>
            </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/services" className="btn-ghost inline-flex items-center gap-2 rounded-lg">
              View all services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────── */}
      <section className="section-py relative overflow-hidden">
        <div className="glow-orb w-[500px] h-[300px] bg-primary/8 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map(({ value, suffix, label }, i) => (
              <Reveal key={label} delay={i * 80}>
                <div className="text-center">
                  <div className="font-heading font-bold text-gradient-primary mb-2" style={{ fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 1 }}>
                    <AnimatedCounter value={value} suffix={suffix} />
                  </div>
                  <p className="text-text-secondary text-[14px]">{label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SDG MISSION STRIP ───────────────────────── */}
      <ParallaxSection className="section-py bg-surface">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <p className="eyebrow mb-3">One studio, seven missions</p>
            <h2 className="font-heading font-bold text-ink leading-[1.1] tracking-[-0.02em] mb-12 text-3xl md:text-5xl">
              <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.03}>Products that move the needle.</ScrollFloat>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sdgCards.map(({ num, title, desc, tag }, i) => (
              <Reveal key={title} delay={i * 60}>
              <TiltCard className="kb-card p-6 h-full">
                <span className="font-heading font-bold text-primary/30 text-[13px] tracking-widest block mb-3">{num}</span>
                <h3 className="font-heading font-bold text-ink text-[17px] leading-[1.25] mb-2">{title}</h3>
                <p className="text-text-secondary text-[13px] leading-relaxed mb-4">{desc}</p>
                <span className="phase-badge phase-1">{tag}</span>
              </TiltCard>
            </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/solutions" className="btn-ghost inline-flex items-center gap-2 rounded-lg">
              Explore Solutions <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </ParallaxSection>

      {/* ── TEAM TEASER ─────────────────────────────── */}
      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="kb-card p-10 md:p-16 text-center relative overflow-hidden">
            <div className="glow-orb w-64 h-64 bg-primary/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10">
              <Reveal>
                <div className="flex items-center justify-center gap-3 mb-6">
                  {['Y', 'B', 'C'].map((letter) => (
                    <div key={letter} className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-xl font-bold text-primary orange-ring">
                      {letter}
                    </div>
                  ))}
                </div>
                <p className="eyebrow mb-3">The team</p>
                <h2 className="font-heading font-bold text-ink text-3xl md:text-4xl leading-[1.15] mb-4">
                  <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.04}>Young. Driven. Mission-guided.</ScrollFloat>
                </h2>
                <p className="text-text-secondary text-lg leading-relaxed max-w-xl mx-auto mb-8">
                  Built by a group of young chaps who want to change the world through sustainable technology — and shaped by mentors who have already benchmarked what that looks like.
                </p>
                <Link to="/team" className="btn-accent inline-flex items-center gap-2 rounded-lg">
                  Meet the team <Users className="w-4 h-4" />
                </Link>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW WE WORK ─────────────────────────────── */}
      <section className="section-py bg-surface">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <p className="eyebrow mb-3">Process</p>
            <h2 className="font-heading font-bold text-ink leading-[1.1] tracking-[-0.02em] mb-14 text-3xl md:text-5xl">
              <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.04}>No surprises.</ScrollFloat>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map(({ num, title, desc }, i) => (
              <Reveal key={num} delay={i * 80}>
                <div className="relative">
                  <div className="kb-card p-6 h-full">
                   <span className="font-heading font-bold text-primary text-[32px] leading-none block mb-4">{num}</span>
                   <h3 className="font-heading font-semibold text-ink text-[18px] leading-[1.25] mb-2">{title}</h3>
                   <p className="text-text-secondary text-[14px] leading-relaxed">{desc}</p>
                 </div>
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 -right-2.5 w-5 h-px bg-primary/30" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEAD GENERATION FORM ─────────────────────── */}
      <section className="section-py border-t border-border bg-surface/20">
        <div className="max-w-[1200px] mx-auto px-6">
          <LeadGenForm />
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────── */}
      <section className="section-py relative overflow-hidden">
        <div className="glow-orb w-[700px] h-[400px] bg-primary/12 bottom-0 left-1/2 -translate-x-1/2" />
        <div className="max-w-[1200px] mx-auto px-6 text-center relative z-10">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/25 mb-6">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-[12px] font-semibold text-primary uppercase tracking-wider">Ready to ship?</span>
            </div>
            <h2 className="font-heading font-bold text-ink leading-[1.07] tracking-[-0.02em] mb-6 text-4xl md:text-6xl">
              <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.03}>Let's build something </ScrollFloat>
              <span className="text-gradient-primary">
                <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.03}>that matters.</ScrollFloat>
              </span>
            </h2>
            <p className="text-text-secondary text-lg leading-relaxed max-w-xl mx-auto mb-10">
              Whether it's an AI agent, a cloud-native platform, or an SDG-aligned product — we scope it, price it, and ship it.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/contact" className="btn-accent rounded-lg inline-flex items-center gap-2">
                Start a Project <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/services" className="btn-ghost rounded-lg inline-flex items-center gap-2">
                Explore Services
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
