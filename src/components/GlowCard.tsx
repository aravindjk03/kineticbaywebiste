import { ReactNode } from 'react';
import './GlowCard.css';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function GlowCard({ children, className = '', style }: GlowCardProps) {
  return (
    <div className={`glow-card ${className}`} style={style}>
      {children}
    </div>
  );
}
