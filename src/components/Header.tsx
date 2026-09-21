import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Btn from './Btn';
import { brand, pillars, products } from '../data/site';
import { setScrollLocked } from '../lib/motion';

type MenuKey = 'services' | 'products' | null;

const links: { name: string; path: string; menu?: MenuKey }[] = [
  { name: 'About', path: '/about' },
  { name: 'Services', path: '/services', menu: 'services' },
  { name: 'Products', path: '/products', menu: 'products' },
  { name: 'Solutions', path: '/solutions' },
  { name: 'Team', path: '/team' },
  { name: 'Contact', path: '/contact' },
];

/** Live Chennai time — a small human signal that someone is actually there. */
function ChennaiClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  return (
    <div className="hidden xl:flex flex-col items-end leading-none font-mono text-[10px] tracking-[0.14em] uppercase">
      <span className="text-ink/80">Chennai · {time} IST</span>
      <span className="flex items-center gap-1.5 text-text-secondary/70 mt-1.5">
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </span>
        Taking new projects
      </span>
    </div>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3 group shrink-0" aria-label="Kinetic Bay home">
      <span className="relative w-11 h-11 grid place-items-center">
        <span className="absolute inset-0 border border-primary/30 rotate-45 scale-[0.78] transition-transform duration-700 group-hover:rotate-[225deg]" />
        <img src="/kineticbay.png" alt="" width={36} height={36} className="relative w-9 h-9 object-contain" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-heading text-[19px] font-bold text-ink tracking-tight">Kinetic <span className="text-primary">Bay</span></span>
        <span className="hidden sm:block text-[8.5px] tracking-[0.2em] uppercase font-semibold text-text-secondary mt-1.5">Machines · Humans</span>
      </span>
    </Link>
  );
}

function MegaPanel({ menu, onClose }: { menu: Exclude<MenuKey, null>; onClose: () => void }) {
  const items = menu === 'services'
    ? pillars.map((p, i) => ({ key: p.slug, to: `/services/${p.slug}`, icon: p.icon, name: p.name, sub: p.tagline, idx: i }))
    : products.map((p, i) => ({ key: p.slug, to: `/products/${p.slug}`, icon: p.icon, name: p.name, sub: p.tagline, idx: i }));
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[min(880px,92vw)]">
    <motion.div
      initial={{ opacity: 0, y: -8, clipPath: 'inset(0 0 100% 0)' }}
      animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
      exit={{ opacity: 0, y: -6, clipPath: 'inset(0 0 100% 0)' }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="nav-panel"
    >
      <div className="grid grid-cols-[1fr_260px]">
        <div className={`grid ${menu === 'services' ? 'grid-cols-2' : 'grid-cols-2'} gap-px bg-white/[0.06]`}>
          {items.map((it) => (
            <Link key={it.key} to={it.to} onClick={onClose} className="group relative bg-[#0e0f12] p-5 hover:bg-[#15161a] transition-colors">
              <span className="absolute right-4 top-4 font-mono text-[10px] text-text-secondary/50">0{it.idx + 1}</span>
              <it.icon className="w-5 h-5 text-primary mb-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:rotate-[-8deg]" />
              <p className="font-heading font-semibold text-ink text-[15px] flex items-center gap-1.5">
                {it.name}
                <ArrowUpRight className="w-3.5 h-3.5 text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </p>
              <p className="text-text-secondary text-[12.5px] mt-1 leading-snug">{it.sub}</p>
            </Link>
          ))}
        </div>
        <div className="p-6 flex flex-col justify-between bg-[linear-gradient(160deg,rgba(240,138,75,0.16),rgba(240,138,75,0.02))]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-3">{menu === 'services' ? 'Four pillars' : 'Ready to deploy'}</p>
            <p className="font-heading text-ink text-lg leading-snug">
              {menu === 'services' ? 'Not sure which pillar fits? Most problems need two.' : 'Every product can be white-labelled and hosted your way.'}
            </p>
          </div>
          <Link to={menu === 'services' ? '/services' : '/products'} onClick={onClose} className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-ink hover:text-primary transition-colors">
            {menu === 'services' ? 'See all services' : 'See the product tour'} <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
    </div>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[45] bg-bg lg:hidden overflow-y-auto"
      data-lenis-prevent
      initial={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)' }}
      animate={{ clipPath: 'circle(150% at calc(100% - 40px) 40px)' }}
      exit={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)' }}
      transition={{ duration: 0.6, ease: [0.7, 0, 0.2, 1] }}
    >
      <div className="absolute inset-0 hero-grid opacity-50 pointer-events-none" />
      <nav className="relative px-6 pt-28 pb-10 flex flex-col min-h-full" aria-label="Mobile navigation">
        <ul className="flex-1">
          {links.map((l, i) => (
            <li key={l.path} className="overflow-hidden border-b border-white/[0.06]">
              <motion.div initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: 0.25 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                <NavLink
                  to={l.path}
                  onClick={onClose}
                  className={({ isActive }) => `flex items-baseline gap-4 py-4 font-heading font-bold text-[40px] leading-none tracking-[-0.03em] ${isActive ? 'text-primary' : 'text-ink'}`}
                >
                  <span className="font-mono text-[11px] font-normal tracking-normal text-text-secondary">0{i + 1}</span>
                  {l.name}
                </NavLink>
              </motion.div>
            </li>
          ))}
        </ul>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="pt-8 space-y-5">
          <Btn to="/contact" className="w-full [&_.kbtn-label]:flex-1">Start Your Project</Btn>
          <div className="flex items-center justify-between text-[13px] text-text-secondary">
            <a href={`mailto:${brand.email}`} className="hover:text-primary">{brand.email}</a>
            <span>Chennai, India</span>
          </div>
        </motion.div>
      </nav>
    </motion.div>
  );
}

export default function Header() {
  const location = useLocation();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<MenuKey>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<number>();
  const openTimer = useRef<number>();
  const travel = useRef(0); // scroll distance accumulated in the current direction

  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    const delta = y - prev;
    setScrolled(y > 24);
    // hysteresis: small wobbles in either direction are ignored
    travel.current = Math.sign(delta) === Math.sign(travel.current) ? travel.current + delta : delta;
    if (y < 160 || menu || mobileOpen) setHidden(false);
    else if (travel.current > 80) setHidden(true);
    else if (travel.current < -140) setHidden(false);
  });

  useEffect(() => { setMenu(null); setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { setScrollLocked(mobileOpen); return () => setScrollLocked(false); }, [mobileOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setMobileOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // hover intent: a menu opens only when the pointer rests on its link, not when it merely passes over
  const open = (m: MenuKey, immediate = false) => {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openTimer.current);
    if (immediate || menu) setMenu(m);
    else openTimer.current = window.setTimeout(() => setMenu(m), 180);
  };
  const scheduleClose = () => {
    window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setMenu(null), 220);
  };
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const bracketTarget = hovered ?? links.find((l) => isActive(l.path))?.path ?? null;

  return (
    <>
      <motion.header
        className="fixed top-0 inset-x-0 z-50 px-4 sm:px-6"
        animate={{ y: hidden ? -110 : 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={`mx-auto max-w-[1320px] flex items-center justify-between gap-4 transition-all duration-500 ${scrolled ? 'pt-3' : 'pt-5'}`}>
          <Logo />

          {/* dock */}
          <nav
            className="hidden lg:block relative"
            aria-label="Main navigation"
            onMouseLeave={() => { setHovered(null); scheduleClose(); }}
          >
            <div className={`nav-dock flex items-center gap-1 px-2 h-[52px] transition-colors duration-500 ${scrolled ? 'nav-dock-solid' : ''}`}>
              {links.map((l, i) => (
                <div
                  key={l.path}
                  className="relative"
                  onMouseEnter={() => { setHovered(l.path); if (l.menu) open(l.menu); else scheduleClose(); }}
                >
                  <NavLink
                    to={l.path}
                    onFocus={() => { setHovered(l.path); if (l.menu) open(l.menu, true); }}
                    aria-haspopup={l.menu ? 'true' : undefined}
                    aria-expanded={l.menu ? menu === l.menu : undefined}
                    className={`relative flex items-start gap-1 px-4 py-2 text-[14px] font-medium transition-colors ${isActive(l.path) ? 'text-ink' : 'text-text-secondary hover:text-ink'}`}
                  >
                    {bracketTarget === l.path && (
                      <motion.span layoutId="nav-brackets" className="nav-brackets" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                    )}
                    <span className="relative">{l.name}</span>
                    <sup className={`relative font-mono text-[8px] mt-0.5 ${isActive(l.path) ? 'text-primary' : 'text-text-secondary/40'}`}>0{i + 1}</sup>
                  </NavLink>
                </div>
              ))}
              <motion.span className="absolute left-3 right-3 bottom-0 h-px origin-left bg-gradient-to-r from-primary via-accent to-transparent" style={{ scaleX: progress }} aria-hidden="true" />
            </div>
            <AnimatePresence>
              {menu && (
                <div onMouseEnter={() => open(menu, true)} onMouseLeave={scheduleClose}>
                  <MegaPanel key={menu} menu={menu} onClose={() => setMenu(null)} />
                </div>
              )}
            </AnimatePresence>
          </nav>

          <div className="flex items-center gap-5">
            <ChennaiClock />
            <div className="hidden lg:block"><Btn to="/contact" className="kbtn-sm">Start a Project</Btn></div>
            <button
              className="lg:hidden relative z-[60] w-12 h-12 grid place-items-center nav-dock"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <span className={`absolute h-[2px] w-5 bg-ink transition-all duration-500 ${mobileOpen ? 'rotate-45' : '-translate-y-[4px]'}`} />
              <span className={`absolute h-[2px] bg-primary transition-all duration-500 ${mobileOpen ? '-rotate-45 w-5' : 'translate-y-[4px] w-3 translate-x-[4px]'}`} />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>{mobileOpen && <MobileMenu onClose={() => setMobileOpen(false)} />}</AnimatePresence>
    </>
  );
}
