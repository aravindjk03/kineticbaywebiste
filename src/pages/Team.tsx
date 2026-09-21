import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Linkedin, Users, HeartHandshake, Code2, PenTool, Lightbulb } from 'lucide-react';
import { ParallaxHero } from '../components/fx/ParallaxLayers';
import Reveal from '../components/Reveal';
import { FinalCta } from '../components/ui';
import { getTeamMembers } from '../lib/cmsStore';
import type { TeamMember } from '../types/cms';
import { teamIntro } from '../data/site';
import { useSeo } from '../lib/seo';

/** Photo on the front; hover (or tap) flips to the person's "why". */
function FlipCard({ member }: { member: TeamMember }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="group [perspective:1200px] h-[420px]">
      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        aria-label={`${member.name}, ${member.role}. Show more`}
        className={`relative w-full h-full text-left [transform-style:preserve-3d] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:[transform:rotateY(180deg)] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        <div className="absolute inset-0 rounded-2xl overflow-hidden border border-border bg-surface [backface-visibility:hidden]">
          <img src={member.image} alt={member.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-6">
            <p className="text-primary text-[11px] font-bold uppercase tracking-[0.14em] mb-1">{member.role}</p>
            <h3 className="font-heading font-bold text-ink text-2xl">{member.name}</h3>
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl border border-primary/40 bg-surface p-7 flex flex-col [transform:rotateY(180deg)] [backface-visibility:hidden] overflow-hidden">
          <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-primary/15 blur-3xl" />
          <p className="eyebrow mb-3">Why I do it</p>
          <p className="font-heading text-ink text-lg leading-snug flex-1">{member.bio}</p>
          <div className="pt-4 border-t border-border">
            <p className="font-heading font-semibold text-ink">{member.name}</p>
            <p className="text-text-secondary text-[13px] mb-3">{member.role}</p>
            {member.linkedin && member.linkedin !== '#' && (
              <a href={member.linkedin} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-2 text-primary text-[13px] font-semibold">
                <Linkedin className="w-4 h-4" /> Connect
              </a>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

export default function Team() {
  useSeo(
    'Meet the Team | Kinetic Bay',
    'Engineers, designers, strategists and problem-solvers who take your success personally. Meet the people behind Kinetic Bay.',
  );
  const [members, setMembers] = useState<TeamMember[]>(getTeamMembers());

  useEffect(() => {
    const onUpdate = () => setMembers(getTeamMembers());
    window.addEventListener('kb:team_updated', onUpdate);
    return () => window.removeEventListener('kb:team_updated', onUpdate);
  }, []);

  return (
    <div className="bg-bg">
      <ParallaxHero
        word="PEOPLE"
        eyebrow={teamIntro.eyebrow}
        title="Behind every system is"
        highlight="someone who cares."
        icons={[HeartHandshake, Code2, Users, PenTool, Lightbulb]}
      />

      <section className="section-py">
        <div className="max-w-[900px] mx-auto px-6">
          {teamIntro.paragraphs.map((para, i) => (
            <Reveal key={i}>
              <p className={`${i === 0 ? 'font-heading text-2xl md:text-3xl text-ink leading-snug' : 'text-text-secondary text-lg leading-relaxed'} mb-8`}>{para}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((m, i) => (
              <Reveal key={m.id} delay={(i % 3) * 90}>
                <FlipCard member={m} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-y border-border bg-surface/40 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-40" />
        <Reveal className="relative max-w-[1000px] mx-auto px-6 text-center">
          <p className="font-heading font-bold text-ink text-3xl md:text-5xl tracking-[-0.025em] mb-8">
            One team. One promise. <span className="text-gradient-primary">Your success.</span>
          </p>
          <Link to="/about#catalysts" className="btn-ghost">Meet the Kinetic Catalysts <ArrowRight className="w-4 h-4" /></Link>
        </Reveal>
      </section>

      <FinalCta />
    </div>
  );
}
