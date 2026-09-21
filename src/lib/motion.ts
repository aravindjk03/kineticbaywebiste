import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Inertial smooth scrolling, kept in lock-step with GSAP ScrollTrigger. */
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    document.documentElement.style.scrollBehavior = 'auto';
    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
      document.documentElement.style.scrollBehavior = '';
    };
  }, [enabled]);
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

/** True once the element is within `margin` of the viewport; flips back when it leaves. */
export function useNearViewport<T extends Element>(margin = '200px') {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, near] as const;
}

export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return mobile;
}

export { gsap, ScrollTrigger };
