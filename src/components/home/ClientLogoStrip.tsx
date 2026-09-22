import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface Client { id: string; name: string; logo: string; website: string }

const FALLBACK = ['AI & Automation', 'Digital Engineering', 'Cybersecurity & Cloud', 'IoT Projects', 'HRMS', 'VMS', 'PMS', 'CRM', 'Attendance', 'Chennai → World'];

/**
 * Homepage strip: scrolls client logos managed in the CMS. Until any logos
 * are uploaded it shows the original service ticker.
 */
export default function ClientLogoStrip() {
  const [clients, setClients] = useState<Client[] | null>(null);

  useEffect(() => {
    api.getPublicClients().then((r: { clients: Client[] }) => setClients(r.clients || [])).catch(() => setClients([]));
  }, []);

  if (!clients || clients.length === 0) {
    return (
      <div className="relative border-t border-border py-4 overflow-hidden bg-primary text-bg">
        <div className="ticker-track flex gap-10 whitespace-nowrap font-heading font-bold text-lg uppercase tracking-tight" style={{ width: 'max-content' }}>
          {[0, 1].map((k) => (
            <span key={k} className="flex gap-10" aria-hidden={k === 1}>
              {FALLBACK.map((t) => (
                <span key={t} className="flex items-center gap-10">{t}<span className="w-2 h-2 bg-bg rotate-45" /></span>
              ))}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // repeat short lists so the loop never shows a gap on wide screens
  const reps = Math.max(1, Math.ceil(8 / clients.length));
  const row = Array.from({ length: reps }, () => clients).flat();
  const seconds = Math.max(20, row.length * 4);

  return (
    <div className="relative border-t border-border py-7 overflow-hidden bg-surface/60">
      <p className="text-center font-mono text-[10px] tracking-[0.25em] uppercase text-text-secondary mb-5">Trusted by teams we build with</p>
      {/* soft fade at both edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32 z-10 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 z-10 bg-gradient-to-l from-bg to-transparent" />
      <div className="ticker-track logo-track flex items-center gap-5 md:gap-8" style={{ width: 'max-content', animationDuration: `${seconds}s` }}>
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center gap-5 md:gap-8" aria-hidden={k === 1}>
            {row.map((c, i) => {
              const tile = (
                <span className="flex items-center justify-center h-16 md:h-20 w-36 md:w-44 rounded-2xl bg-white/95 border border-white/10 px-5 transition-transform duration-300 hover:-translate-y-0.5">
                  <img
                    src={c.logo}
                    alt={k === 0 && i < clients.length ? c.name : ''}
                    loading="lazy"
                    className="max-h-9 md:max-h-11 max-w-full object-contain grayscale opacity-80 transition duration-300 hover:grayscale-0 hover:opacity-100"
                  />
                </span>
              );
              return c.website
                ? <a key={`${c.id}-${i}`} href={c.website} target="_blank" rel="noopener noreferrer" tabIndex={k === 1 ? -1 : 0} title={c.name}>{tile}</a>
                : <span key={`${c.id}-${i}`} title={c.name}>{tile}</span>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
