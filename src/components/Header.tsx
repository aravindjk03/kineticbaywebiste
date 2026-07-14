import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap } from 'lucide-react';
import GooeyNav from './GooeyNav';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Services', path: '/services' },
  { name: 'Solutions', path: '/solutions' },
  { name: 'Team', path: '/team' },
  { name: 'Contact', path: '/contact' },
];

function KBLogo({ size = 36 }: { size?: number }) {
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

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const activeIndex = navLinks.findIndex(l => l.path === location.pathname);
  const gooeyItems = navLinks.map(link => ({
    label: link.name,
    href: link.path,
    onClick: () => navigate(link.path),
  }));

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-bg/90 backdrop-blur-xl border-b border-border py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <KBLogo size={32} />
            <span className="font-heading text-xl font-bold text-ink tracking-tight">
              Kinetic <span className="text-gradient-primary">Bay</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center" aria-label="Main navigation">
            <GooeyNav
              items={gooeyItems}
              initialActiveIndex={activeIndex >= 0 ? activeIndex : 0}
              particleCount={12}
              particleDistances={[80, 8]}
              particleR={80}
              animationTime={500}
              timeVariance={250}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
            />
          </div>

          <div className="hidden md:block">
            <Link to="/contact" className="btn-accent text-sm py-2.5 px-5 rounded-lg inline-flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> Start a Project
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-ink hover:bg-surface transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[64px] left-0 right-0 z-40 bg-bg/95 backdrop-blur-xl border-b border-border px-6 py-4 flex flex-col gap-1"
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-3 rounded-lg text-[15px] font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-primary bg-surface'
                    : 'text-text-secondary hover:text-ink hover:bg-surface'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-2 pb-1">
              <Link to="/contact" className="btn-accent w-full justify-center rounded-lg text-sm py-3">
                Start a Project
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
