import { Link } from 'react-router-dom';
import { Mail, Linkedin, Github, Zap } from 'lucide-react';

function KBLogo({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/kineticbay.png"
      alt="Kinetic Bay logo icon"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#050607] border-t border-border">
      <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
              <KBLogo size={28} />
              <span className="font-heading text-lg font-bold text-ink">
                Kinetic <span className="text-gradient-primary">Bay</span>
              </span>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed max-w-xs mb-4">
              Full-stack technology studio building AI-powered, cloud-native software aligned with the UN Sustainable Development Goals.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary/60">
              <Zap className="w-3 h-3 text-primary" />
              <span>Powered by Azure AI Foundry</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-ink/50 uppercase tracking-widest mb-4">Navigate</h4>
            <ul className="space-y-2.5">
              {[
                { name: 'Home', path: '/' },
                { name: 'Services', path: '/services' },
                { name: 'Solutions', path: '/solutions' },
                { name: 'Team', path: '/team' },
                { name: 'Contact', path: '/contact' },
              ].map((l) => (
                <li key={l.path}>
                  <Link to={l.path} className="text-sm text-text-secondary hover:text-primary transition-colors">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-ink/50 uppercase tracking-widest mb-4">Connect</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:hello@kineticbay.io" className="flex items-center gap-3 text-sm text-text-secondary hover:text-primary transition-colors group">
                  <Mail className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                  hello@kineticbay.io
                </a>
              </li>
              <li>
                <a href="https://linkedin.com/company/kineticbay" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-text-secondary hover:text-primary transition-colors group">
                  <Linkedin className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="https://github.com/kineticbay" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-text-secondary hover:text-primary transition-colors group">
                  <Github className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="current-mark mb-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-secondary/50">© {new Date().getFullYear()} Kinetic Bay. All rights reserved.</p>
          <p className="text-xs text-text-secondary/40">Built for impact. Aligned with the SDGs.</p>
        </div>
      </div>
    </footer>
  );
}
