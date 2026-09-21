import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../lib/motion';

/**
 * Generative background: particles drift along a slowly evolving noise field,
 * leaving ember trails. Pauses when off-screen; static frame for reduced motion.
 */
export default function FlowField({ density = 0.00018, className = '' }: { density?: number; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    let w = 0, h = 0, raf = 0, visible = false, t = 0;
    let pts: { x: number; y: number; life: number; hue: number }[] = [];
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(w * h * density);
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, life: Math.random() * 200, hue: Math.random() }));
      ctx.fillStyle = '#08090A';
      ctx.fillRect(0, 0, w, h);
    };

    // cheap smooth pseudo-noise from layered sines
    const field = (x: number, y: number) =>
      (Math.sin(x * 0.0021 + t * 0.6) + Math.sin(y * 0.0027 - t * 0.4) + Math.sin((x + y) * 0.0013 + t * 0.25)) * Math.PI * 0.6;

    const step = () => {
      t += 0.004;
      ctx.fillStyle = 'rgba(8,9,10,0.06)';
      ctx.fillRect(0, 0, w, h);
      for (const p of pts) {
        let a = field(p.x, p.y);
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 22000) a = Math.atan2(dy, dx); // swirl away from the cursor
        const nx = p.x + Math.cos(a) * 1.3;
        const ny = p.y + Math.sin(a) * 1.3;
        ctx.strokeStyle = p.hue > 0.85 ? 'rgba(246,195,107,0.55)' : p.hue > 0.4 ? 'rgba(240,138,75,0.45)' : 'rgba(217,115,58,0.35)';
        ctx.lineWidth = p.hue > 0.9 ? 1.4 : 0.9;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; p.life -= 1;
        if (p.life < 0 || p.x < -5 || p.x > w + 5 || p.y < -5 || p.y > h + 5) {
          p.x = Math.random() * w; p.y = Math.random() * h; p.life = 120 + Math.random() * 160;
        }
      }
    };

    const loop = () => { step(); raf = requestAnimationFrame(loop); };

    resize();
    if (prefersReducedMotion()) {
      for (let i = 0; i < 180; i++) step();
      return;
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    });
    io.observe(c);
    const onMove = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
    };
  }, [density]);

  return <canvas ref={canvas} className={`absolute inset-0 w-full h-full ${className}`} aria-hidden="true" />;
}
