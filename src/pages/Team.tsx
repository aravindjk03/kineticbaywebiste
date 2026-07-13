import { Link } from 'react-router-dom';
import { ArrowRight, Linkedin, Github, Target, Shield, Eye, Clock } from 'lucide-react';
import DecryptedText from '../components/DecryptedText';
import ScrollFloat from '../components/ScrollFloat';
import Reveal from '../components/Reveal';
import PageHero3D from '../components/PageHero3D';

const skillTags = ['Azure AI Foundry', 'Angular', 'Node.js', 'Python', 'Java', '.NET', 'MongoDB', 'SQL'];

const values = [
  { icon: Target, title: 'Impact Over Hype', body: 'We ship what we can prove, not what sounds good in a deck.' },
  { icon: Shield, title: 'Technical Honesty', body: 'We label targets as targets and results as results. Always.' },
  { icon: Eye, title: 'Build in the Open', body: 'Progress on our SDG roadmap is public, not a black box.' },
  { icon: Clock, title: 'Long-Term Thinking', body: "We're building a portfolio, not chasing a single exit." },
];

export default function Team() {
  return (
    <div className="overflow-hidden bg-bg">

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative min-h-[50vh] flex items-end pb-16 pt-32 border-b border-border overflow-hidden">
        <div className="glow-orb w-[400px] h-[400px] bg-primary/10 top-1/2 right-10 -translate-y-1/2" />
        <PageHero3D shape="sphere" />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 w-full">
          <Reveal>
            <p className="eyebrow mb-4">Team</p>
            <h1
              className="font-heading font-bold text-ink leading-[1.05] tracking-[-0.02em] mb-5 max-w-xl"
              style={{ fontSize: 'clamp(34px, 5vw, 64px)' }}
            >
              <DecryptedText
                text="The people behind "
                animateOn="view"
                sequential
                revealDirection="start"
                speed={35}
                encryptedClassName="decrypt-encrypted"
              />
              <span className="text-gradient-primary">
                <DecryptedText
                  text="the momentum."
                  animateOn="view"
                  sequential
                  revealDirection="start"
                  speed={35}
                  encryptedClassName="decrypt-encrypted"
                />
              </span>
            </h1>
            <p className="text-text-secondary leading-relaxed max-w-xl text-base sm:text-lg md:text-xl">
              Kinetic Bay is founder-led and growing deliberately — every hire has to believe in the mission as much as the code.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FOUNDER CARD ─────────────────────────── */}
      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <div className="kb-card p-7 sm:p-10 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1 flex justify-center md:justify-start">
                  <div className="relative">
                    <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-5xl sm:text-6xl font-bold text-primary select-none orange-ring">
                      K
                    </div>
                    {/* Orbiting dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-full rounded-full border border-primary/20 animate-spin-slow" />
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h2 className="font-heading font-bold text-ink text-3xl sm:text-4xl md:text-[40px] leading-[1.15] mb-1">Koushik</h2>
                  <p className="text-primary font-semibold text-[15px] sm:text-[16px] mb-4">Founder &amp; Full-Stack Engineer</p>
                  <p className="text-text-secondary text-[14px] sm:text-[15px] leading-relaxed mb-5">
                    Koushik is a full-stack developer specializing in cloud-native applications on Microsoft Azure, with hands-on experience building intelligent document processing systems, secure authentication flows, and AI-powered agent workflows. He works comfortably across the stack — from Angular front ends to Node.js and Python back ends — and is actively expanding into Azure AI Foundry and agentic AI systems.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {skillTags.map((tag) => (
                      <span key={tag} className="skill-chip">{tag}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://linkedin.com/in/koushik"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Koushik on LinkedIn"
                      className="btn-ghost text-sm py-2.5 px-4 rounded-lg inline-flex items-center gap-2"
                    >
                      <Linkedin className="w-4 h-4" /> LinkedIn
                    </a>
                    <a
                      href="https://github.com/koushik"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Koushik on GitHub"
                      className="btn-ghost text-sm py-2.5 px-4 rounded-lg inline-flex items-center gap-2"
                    >
                      <Github className="w-4 h-4" /> GitHub
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-6"><div className="current-mark" /></div>

      {/* ── VALUES ───────────────────────────────── */}
      <section className="section-py bg-surface">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <p className="eyebrow mb-3">How We Operate</p>
            <h2 className="font-heading font-semibold text-ink leading-[1.15] tracking-[-0.01em] mb-12 text-2xl sm:text-3xl md:text-4xl">
              <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.04}>What we hold ourselves to.</ScrollFloat>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="kb-card p-6 h-full">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-ink text-[17px] sm:text-[18px] leading-[1.3] mb-2">{title}</h3>
                  <p className="text-text-secondary text-[14px] leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── GROWING SECTION ──────────────────────── */}
      <section className="section-py relative overflow-hidden">
        <div className="glow-orb w-[500px] h-[300px] bg-primary/10 bottom-0 left-1/2 -translate-x-1/2" />
        <div className="max-w-[1200px] mx-auto px-6 text-center relative z-10">
          <Reveal>
            <h2 className="font-heading font-semibold text-ink leading-[1.15] tracking-[-0.01em] mb-5 text-2xl sm:text-3xl md:text-4xl">
              <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.03}>Kinetic Bay is just getting started.</ScrollFloat>
            </h2>
            <p className="text-text-secondary text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-8">
              We're a lean, founder-led studio today — with plans to bring on engineers and designers who care about SDG-aligned work as much as clean code. If that's you, we'd love to hear from you.
            </p>
            <Link to="/contact" className="btn-accent inline-flex items-center gap-2 rounded-lg">
              Get in Touch <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
