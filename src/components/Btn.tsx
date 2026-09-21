import { useRef, type ReactNode, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

interface BtnProps {
  to?: string;
  href?: string;
  variant?: 'solid' | 'line';
  children: string;
  icon?: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * Signature button: notched corner, rolling label, a separate arrow block that
 * ejects its arrow on hover, and a slight magnetic pull toward the cursor.
 */
export default function Btn({ to, href, variant = 'solid', children, icon, className = '', type = 'button', disabled, onClick }: BtnProps) {
  const ref = useRef<HTMLElement>(null);

  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia('(pointer: coarse)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.18;
    const y = (e.clientY - r.top - r.height / 2) * 0.28;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ''; };

  const inner = (
    <>
      <span className="kbtn-label">
        <span className="kbtn-roll" data-text={children}>{children}</span>
      </span>
      <span className="kbtn-icon" aria-hidden="true">
        <span className="kbtn-arrow">{icon ?? <ArrowUpRight className="w-4 h-4" />}</span>
        <span className="kbtn-arrow kbtn-arrow-next">{icon ?? <ArrowUpRight className="w-4 h-4" />}</span>
      </span>
    </>
  );

  const cls = `kbtn kbtn-${variant} ${className}`;
  const common = { className: cls, onMouseMove: onMove, onMouseLeave: onLeave };

  if (to) return <Link ref={ref as React.Ref<HTMLAnchorElement>} to={to} {...common}>{inner}</Link>;
  if (href) return <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} {...common}>{inner}</a>;
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type={type} disabled={disabled} onClick={onClick} {...common}>
      {inner}
    </button>
  );
}
