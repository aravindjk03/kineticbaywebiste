import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../lib/motion';

const ROLES = [
  { label: 'Engineering', color: '240,138,75' },
  { label: 'Design', color: '246,195,107' },
  { label: 'AI & Data', color: '245,167,110' },
  { label: 'Cloud & Security', color: '241,245,249' },
  { label: 'Strategy', color: '217,115,58' },
];

/**
 * A living network of the collective: nodes drift, link to their neighbours,
 * and gather toward the cursor. Larger ringed nodes are the mentors.
 */
export default function Constellation({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    let w = 0, h = 0, raf = 0, t = 0;
    const mouse = { x: -9999, y: -9999, active: false };
    type N = { x: number; y: number; vx: number; vy: number; r: number; role: number; mentor: boolean; phase: number };
    let nodes: N[] = [];

    const resize = () => {
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(110, Math.max(40, (w * h) / 11000)));
      nodes = Array.from({ length: n }, (_, i) => {
        const mentor = i % 11 === 0;
        return {
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
          r: mentor ? 4.5 : 1.6 + Math.random() * 1.8,
          role: i % ROLES.length, mentor, phase: Math.random() * 6.28,
        };
      });
    };

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      const link = Math.min(170, w / 7);
      for (const a of nodes) {
        if (mouse.active) {
          const dx = mouse.x - a.x, dy = mouse.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d < 240) { a.vx += (dx / d) * 0.035; a.vy += (dy / d) * 0.035; }
        }
        a.vx *= 0.985; a.vy *= 0.985;
        a.x += a.vx + Math.sin(t + a.phase) * 0.08;
        a.y += a.vy + Math.cos(t * 0.8 + a.phase) * 0.08;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        a.x = Math.max(0, Math.min(w, a.x)); a.y = Math.max(0, Math.min(h, a.y));
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > link) continue;
          const o = (1 - d / link) * (a.mentor || b.mentor ? 0.5 : 0.22);
          ctx.strokeStyle = `rgba(240,138,75,${o})`;
          ctx.lineWidth = a.mentor || b.mentor ? 1 : 0.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      for (const a of nodes) {
        const col = ROLES[a.role].color;
        ctx.fillStyle = `rgba(${col},0.95)`;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
        if (a.mentor) {
          const pulse = 9 + Math.sin(t * 2 + a.phase) * 2.5;
          ctx.strokeStyle = 'rgba(240,138,75,0.55)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(a.x, a.y, pulse, 0, Math.PI * 2); ctx.stroke();
        }
      }
      if (mouse.active) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 160);
        g.addColorStop(0, 'rgba(240,138,75,0.12)'); g.addColorStop(1, 'rgba(240,138,75,0)');
        ctx.fillStyle = g; ctx.fillRect(mouse.x - 160, mouse.y - 160, 320, 320);
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    const onMove = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      mouse.active = mouse.y >= 0 && mouse.y <= r.height;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('resize', resize);
    if (prefersReducedMotion()) { draw(); cancelAnimationFrame(raf); }
    else {
      const io = new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); if (e.isIntersecting) raf = requestAnimationFrame(draw); });
      io.observe(c);
      return () => { io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); window.removeEventListener('resize', resize); };
    }
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} className={`absolute inset-0 w-full h-full ${className}`} aria-hidden="true" />;
}

export { ROLES };
