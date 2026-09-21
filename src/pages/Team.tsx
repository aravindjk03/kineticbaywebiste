import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { Leaf, ShieldCheck, Hand, Compass, SearchCheck, BadgeCheck } from 'lucide-react';
import Constellation, { ROLES } from '../components/fx/Constellation';
import Reveal from '../components/Reveal';
import TiltCard from '../components/TiltCard';
import Btn from '../components/Btn';
import { SectionHead, FinalCta } from '../components/ui';
import { teamStory, teamIntro } from '../data/site';
import { useSeo } from '../lib/seo';

/* Words light up one at a time as the sentence scrolls through view. */
function LitWord({ w, i, n, p }: { w: string; i: number; n: number; p: MotionValue<number> }) {
  const opacity = useTransform(p, [i / n, (i + 1) / n], [0.15, 1]);
  const accent = /sustainable|safer|hands/i.test(w);
  return <motion.span style={{ opacity }} className={accent ? 'text-primary' : ''}>{w} </motion.span>;
}

function Origin() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.4'] });
  const words = teamStory.origin.split(' ');
  return (
    <section className="section-py">
      <div className="max-w-[1100px] mx-auto px-6">
        <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-primary mb-8">[ Where we began ]</p>
        <p ref={ref} className="font-heading font-bold text-ink text-3xl md:text-5xl lg:text-[58px] leading-[1.12] tracking-[-0.025em]">
          <span className="sr-only">{teamStory.origin}</span>
          <span aria-hidden="true">{words.map((w, i) => <LitWord key={i} w={w} i={i} n={words.length} p={scrollYProgress} />)}</span>
        </p>
      </div>
    </section>
  );
}

const commitIcons = [Leaf, ShieldCheck, Hand];

function Commitments() {
  return (
    <section className="pb-24">
      <div className="max-w-[1240px] mx-auto px-6 grid md:grid-cols-3 gap-4">
        {teamStory.commitments.map((c, i) => {
          const Icon = commitIcons[i];
          return (
            <Reveal key={c.title} delay={i * 110} className={i === 1 ? 'md:translate-y-12' : ''}>
              <TiltCard className="kb-card glare p-8 h-full min-h-[320px] flex flex-col" maxTilt={8}>
                <span className="kb-tab" />
                <div className="flex items-center justify-between mb-auto">
                  <Icon className="w-9 h-9 text-primary" strokeWidth={1.5} />
                  <span className="font-mono text-[11px] text-text-secondary">0{i + 1}</span>
                </div>
                <h3 className="font-heading font-bold text-ink text-2xl tracking-[-0.02em] mt-12 mb-3">{c.title}</h3>
                <p className="text-text-secondary text-[15px] leading-relaxed">{c.body}</p>
              </TiltCard>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* Disciplines orbit a shared core on a tilted 3D ring. */
function CrossFunctional() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const tilt = useTransform(scrollYProgress, [0, 1], [72, 52]);
  const spin = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const unspin = useTransform(spin, (x) => -x);
  const untilt = useTransform(tilt, (x) => -x);
  const d = teamStory.disciplines;
  return (
    <section ref={ref} className="section-py border-y border-border bg-surface/30 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <SectionHead eyebrow="How we're built" title={teamStory.crossTitle} body={teamStory.crossBody} className="mb-8" />
          <Reveal>
            <ul className="flex flex-wrap gap-2">
              {d.map((x) => <li key={x} className="px-3 py-1.5 text-[13px] text-ink bg-white/[0.04] shadow-[inset_0_0_0_1px_rgba(240,138,75,0.3)]">{x}</li>)}
            </ul>
          </Reveal>
        </div>
        <div className="relative h-[380px] sm:h-[460px] [perspective:1100px]" aria-hidden="true">
          <motion.div style={{ rotateX: tilt }} className="absolute inset-0 [transform-style:preserve-3d]">
            <motion.div style={{ rotateZ: spin }} className="absolute left-1/2 top-1/2 w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30 [transform-style:preserve-3d]">
              <div className="absolute inset-[18%] rounded-full border border-dashed border-primary/20" />
              {d.map((x, i) => {
                const a = (i / d.length) * Math.PI * 2;
                return (
                  <div key={x} className="absolute" style={{ left: `${50 + Math.cos(a) * 50}%`, top: `${50 + Math.sin(a) * 50}%` }}>
                    {/* counter-rotate so the chip always stands up and faces the viewer */}
                    <motion.div style={{ rotateZ: unspin }} className="[transform-style:preserve-3d]">
                      <motion.div style={{ rotateX: untilt }} className="-translate-x-1/2 -translate-y-full px-3 py-2 bg-bg text-[12px] font-semibold text-ink whitespace-nowrap shadow-[0_0_0_1px_rgba(240,138,75,0.5),0_10px_30px_-5px_rgba(240,138,75,0.35)]">
                        <span className="inline-block w-1.5 h-1.5 mr-2 align-middle" style={{ background: `rgb(${ROLES[i % ROLES.length].color})` }} />{x}
                      </motion.div>
                    </motion.div>
                  </div>
                );
              })}
            </motion.div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-primary/15 border border-primary/60 grid place-items-center shadow-[0_0_80px_10px_rgba(240,138,75,0.35)]">
              <span className="font-heading font-bold text-ink text-sm text-center leading-tight">Your<br />outcome</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const mentorIcons = [Compass, SearchCheck, BadgeCheck];

/* Three principles on stepped planes that settle into place on scroll. */
function Mentorship() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'center 0.55'] });
  return (
    <section className="section-py">
      <div className="max-w-[1240px] mx-auto px-6">
        <SectionHead eyebrow="Our model" title={teamStory.mentorTitle} body={teamStory.mentorBody} />
        <div ref={ref} className="grid md:grid-cols-3 gap-4 [perspective:1400px]">
          {teamStory.mentorPrinciples.map((m, i) => (
            <MentorPlate key={m.title} i={i} title={m.title} body={m.body} p={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MentorPlate({ i, title, body, p }: { i: number; title: string; body: string; p: MotionValue<number> }) {
  const rotateX = useTransform(p, [0, 1], [38 - i * 6, 0]);
  const z = useTransform(p, [0, 1], [-220 - i * 90, 0]);
  const y = useTransform(p, [0, 1], [120 + i * 40, 0]);
  const Icon = mentorIcons[i];
  return (
    <motion.div style={{ rotateX, z, y }} className="kb-card p-8 min-h-[260px] flex flex-col">
      <span className="kb-tab" />
      <Icon className="w-8 h-8 text-primary mb-auto" strokeWidth={1.5} />
      <p className="font-mono text-[11px] text-text-secondary mt-10 mb-2">STEP 0{i + 1}</p>
      <h3 className="font-heading font-bold text-ink text-3xl tracking-[-0.02em] mb-3">{title}</h3>
      <p className="text-text-secondary text-[15px] leading-relaxed">{body}</p>
    </motion.div>
  );
}

export default function Team() {
  useSeo(
    'Meet the Team | Kinetic Bay',
    'A cross-functional collective of engineers, designers and strategists, mentored by experience and driven by a sustainable, safer, hands-on digital future.',
  );

  return (
    <div className="bg-bg">
      {/* hero: the collective as a living network */}
      <section className="relative min-h-[100svh] flex items-end overflow-hidden border-b border-border">
        <Constellation />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(8,9,10,0.92),rgba(8,9,10,0.35)_60%,transparent)] pointer-events-none" />
        <div className="relative max-w-[1240px] mx-auto px-6 pb-16 md:pb-24 pt-40 w-full">
          <p className="eyebrow mb-6">{teamIntro.eyebrow}</p>
          <h1 className="font-heading font-bold text-ink leading-[0.94] tracking-[-0.04em] mb-8" style={{ fontSize: 'clamp(48px, 9vw, 136px)' }}>
            <span className="block overflow-hidden"><motion.span className="block" initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>{teamStory.heroTitle}</motion.span></span>
            <span className="block overflow-hidden"><motion.span className="block text-gradient-primary" initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ delay: 0.12, duration: 1, ease: [0.16, 1, 0.3, 1] }}>{teamStory.heroHighlight}</motion.span></span>
          </h1>
          <div className="grid md:grid-cols-[1fr_auto] gap-8 items-end">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-text-secondary text-base md:text-xl leading-relaxed max-w-xl">
              {teamStory.heroBody}
            </motion.p>
            <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-wrap md:flex-col gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary">
              {ROLES.map((r) => <li key={r.label} className="flex items-center gap-2"><span className="w-2 h-2" style={{ background: `rgb(${r.color})` }} />{r.label}</li>)}
              <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full border border-primary" />Mentors</li>
            </motion.ul>
          </div>
        </div>
      </section>

      <Origin />
      <Commitments />
      <CrossFunctional />
      <Mentorship />

      <section className="py-24 border-y border-border relative overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-40" />
        <Reveal className="relative max-w-[1000px] mx-auto px-6 text-center">
          <p className="font-heading font-bold text-ink text-3xl md:text-6xl tracking-[-0.03em] mb-10">
            {teamIntro.closer.split('Your success.')[0]}<span className="text-gradient-primary">Your success.</span>
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Btn to="/contact">Work with us</Btn>
            <Btn to="/about#catalysts" variant="line">Meet the Kinetic Catalysts</Btn>
          </div>
        </Reveal>
      </section>

      <FinalCta />
    </div>
  );
}
