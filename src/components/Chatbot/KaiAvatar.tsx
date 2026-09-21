/** Flat KAI face for message avatars — matches the 3D mascot without spinning up WebGL per message. */
export default function KaiAvatar({ className = 'w-7 h-7', blink = true }: { className?: string; blink?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="KAI">
      <defs>
        <radialGradient id="kai-shell" cx="45%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F7F1EA" />
          <stop offset="100%" stopColor="#E6D9CC" />
        </radialGradient>
      </defs>
      <line x1="32" y1="12" x2="32" y2="5" stroke="#C9C2BA" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="5" r="3.2" fill="#F6C36B" />
      <rect x="4" y="27" width="6" height="12" rx="3" fill="#F08A4B" />
      <rect x="54" y="27" width="6" height="12" rx="3" fill="#F08A4B" />
      <ellipse cx="32" cy="34" rx="24" ry="21" fill="url(#kai-shell)" />
      <rect x="13" y="23" width="38" height="22" rx="11" fill="#1C1D22" />
      <g className={blink ? 'kai-blink' : undefined}>
        <ellipse cx="24.5" cy="32" rx="3.4" ry="4.2" fill="#FFD9B8" />
        <ellipse cx="39.5" cy="32" rx="3.4" ry="4.2" fill="#FFD9B8" />
      </g>
      <path d="M27 39 Q32 43 37 39" stroke="#F5A76E" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="13" cy="44" r="3" fill="#F7A98A" opacity="0.8" />
      <circle cx="51" cy="44" r="3" fill="#F7A98A" opacity="0.8" />
    </svg>
  );
}
