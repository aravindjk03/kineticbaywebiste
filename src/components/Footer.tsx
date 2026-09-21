import { Link } from 'react-router-dom';
import { Mail, Linkedin, MapPin } from 'lucide-react';
import { brand, pillars, products } from '../data/site';

const company = [
  { name: 'About', path: '/about' },
  { name: 'Kinetic Catalysts', path: '/about#catalysts' },
  { name: 'Team', path: '/team' },
  { name: 'Solutions', path: '/solutions' },
  { name: 'Contact', path: '/contact' },
];

function Column({ title, links }: { title: string; links: { name: string; path: string }[] }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold text-ink/50 uppercase tracking-[0.16em] mb-5">{title}</h4>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.path}>
            <Link to={l.path} className="text-[14px] text-text-secondary hover:text-primary transition-colors">{l.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#050607] border-t border-border relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 pt-20 pb-8 relative">
        <div className="grid grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr] gap-10 mb-16">
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-3 mb-5">
              <img src="/kineticbay.png" alt="Kinetic Bay logo" width={40} height={40} className="w-10 h-10 object-contain" />
              <span className="font-heading text-xl font-bold text-ink">Kinetic <span className="text-gradient-primary">Bay</span></span>
            </Link>
            <p className="font-heading text-ink text-[15px] mb-2">{brand.tagline}</p>
            <p className="text-[14px] text-text-secondary leading-relaxed max-w-xs">
              Custom software, AI, cloud and IoT solutions from Chennai to the world, aligned with the UN Sustainable Development Goals.
            </p>
          </div>
          <Column title="Services" links={pillars.map((p) => ({ name: p.name, path: `/services/${p.slug}` }))} />
          <Column title="Products" links={products.map((p) => ({ name: p.short, path: `/products/${p.slug}` }))} />
          <Column title="Company" links={company} />
          <div>
            <h4 className="text-[11px] font-bold text-ink/50 uppercase tracking-[0.16em] mb-5">Connect</h4>
            <ul className="space-y-3 text-[14px]">
              <li><a href={brand.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-text-secondary hover:text-primary transition-colors"><Linkedin className="w-4 h-4 text-primary/70" />LinkedIn</a></li>
              <li><a href={`mailto:${brand.email}`} className="flex items-center gap-2.5 text-text-secondary hover:text-primary transition-colors break-all"><Mail className="w-4 h-4 text-primary/70 shrink-0" />{brand.email}</a></li>
              <li className="flex items-center gap-2.5 text-text-secondary"><MapPin className="w-4 h-4 text-primary/70 shrink-0" />Chennai, India</li>
            </ul>
          </div>
        </div>

        {/* oversized wordmark bleeding off the bottom edge */}
        <div className="select-none pointer-events-none -mb-[3vw]" aria-hidden="true">
          <p className="outline-word font-heading font-bold leading-[0.8] tracking-[-0.04em] text-center whitespace-nowrap" style={{ fontSize: 'clamp(64px, 15.5vw, 210px)' }}>KINETIC BAY</p>
        </div>

        <div className="current-mark my-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-secondary/60">© {new Date().getFullYear()} Kinetic Bay. All rights reserved.</p>
          <p className="text-xs text-text-secondary/50">Built for impact. Aligned with the SDGs.</p>
        </div>
      </div>
    </footer>
  );
}
