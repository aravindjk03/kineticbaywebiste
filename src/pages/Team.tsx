import { Link } from 'react-router-dom';
import { ArrowRight, Target, Shield, Eye, Clock, Lightbulb, Globe, Leaf, Users } from 'lucide-react';
import DecryptedText from '../components/DecryptedText';
import ScrollFloat from '../components/ScrollFloat';
import Reveal from '../components/Reveal';
import PageHero3D from '../components/PageHero3D';

const coreValues = [
  { icon: Target, title: 'Impact Over Hype', body: 'We ship what we can prove, not what sounds good in a deck.' },
  { icon: Shield, title: 'Technical Honesty', body: 'We label targets as targets and results as results. Always.' },
  { icon: Eye, title: 'Build in the Open', body: 'Progress on our SDG roadmap is public, not a black box.' },
  { icon: Clock, title: 'Long-Term Thinking', body: "We're building a portfolio, not chasing a single exit." },
];

const mentorPillars = [
  { icon: Leaf, title: 'Sustainability Leadership', body: 'Our mentors have spent decades benchmarking ESG practices and sustainability frameworks at an institutional level — giving us a north star that goes beyond good intentions.' },
  { icon: Lightbulb, title: 'Tech for Good Expertise', body: 'Guided by practitioners who have deployed technology solutions across health, education, and climate — we build with real-world field knowledge, not just lab theory.' },
  { icon: Globe, title: 'SDG Alignment', body: 'Every product roadmap is reviewed against the UN Sustainable Development Goals framework, with mentor oversight ensuring we stay honest about impact claims.' },
  { icon: Users, title: 'Community & Scale', body: 'Our mentors have worked with NGOs, government agencies, and global institutions — opening doors for pilots, partnerships, and responsible scale.' },
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
              A collective of young builders, united by a belief that technology — when guided by the right values — can move the needle on the world's hardest problems.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── ORIGIN STORY ─────────────────────────── */}
      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <p className="eyebrow mb-3">Our Origin</p>
              <h2 className="font-heading font-bold text-ink text-2xl sm:text-3xl md:text-[36px] leading-[1.2] mb-6">
                Young chaps who refused to wait for<br />
                <span className="text-gradient-primary">permission to build.</span>
              </h2>
              <p className="text-text-secondary text-[15px] sm:text-[16px] leading-relaxed mb-4">
                Kinetic Bay wasn't built in a boardroom. It was built by a group of young engineers and designers who looked at the gap between sustainable ambitions and real technical execution — and decided to close it themselves.
              </p>
              <p className="text-text-secondary text-[15px] sm:text-[16px] leading-relaxed mb-4">
                We come from different backgrounds but share the same conviction: that a thoughtful tech stack, applied with care, can drive measurable social and environmental impact. Not someday. Now.
              </p>
              <p className="text-text-secondary text-[15px] sm:text-[16px] leading-relaxed">
                Our work spans cloud-native platforms, AI-powered automation, and SDG-aligned product development — built by people who are equally at home in a codebase and a community impact report.
              </p>
            </Reveal>

            <Reveal delay={100}>
              <div className="kb-card p-8 space-y-6">
                {[
                  { label: 'Who we are', value: 'A cross-disciplinary crew of engineers, designers, and strategists — early in our careers, long on conviction.' },
                  { label: 'What drives us', value: 'Sustainable practice through real technology — not greenwashing, not marketing, but systems that genuinely reduce harm and increase opportunity.' },
                  { label: 'How we work', value: 'Lean, deliberate, mentor-guided. Every major decision is reviewed against our SDG commitments before a single line of code is written.' },
                ].map(({ label, value }) => (
                  <div key={label} className="border-l-2 border-primary/40 pl-5">
                    <p className="text-primary font-semibold text-[13px] uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-text-secondary text-[14px] sm:text-[15px] leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-6"><div className="current-mark" /></div>

      {/* ── MENTORS ──────────────────────────────── */}
      <section className="section-py bg-surface">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <p className="eyebrow mb-3">Guided By</p>
            <h2 className="font-heading font-semibold text-ink leading-[1.15] tracking-[-0.01em] mb-4 text-2xl sm:text-3xl md:text-4xl">
              Mentors who have<br />
              <span className="text-gradient-primary">benchmarked sustainability.</span>
            </h2>
            <p className="text-text-secondary text-[15px] sm:text-[16px] leading-relaxed max-w-2xl mb-12">
              We don't operate on enthusiasm alone. Kinetic Bay is shaped by great mentors — practitioners and thought leaders who have spent careers establishing what responsible, sustainable technology actually looks like at scale.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {mentorPillars.map(({ icon: Icon, title, body }, i) => (
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

      {/* ── VALUES ───────────────────────────────── */}
      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <p className="eyebrow mb-3">How We Operate</p>
            <h2 className="font-heading font-semibold text-ink leading-[1.15] tracking-[-0.01em] mb-12 text-2xl sm:text-3xl md:text-4xl">
              <ScrollFloat animationDuration={1} ease="back.inOut(2)" scrollStart="center bottom+=50%" scrollEnd="bottom bottom-=40%" stagger={0.04}>What we hold ourselves to.</ScrollFloat>
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {coreValues.map(({ icon: Icon, title, body }, i) => (
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
              We're a young, growing collective — actively looking for engineers, designers, and problem-solvers who care about SDG-aligned work as much as clean code. If you want to build things that matter, we want to hear from you.
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

