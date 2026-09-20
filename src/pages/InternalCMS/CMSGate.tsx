import { useState, type FormEvent } from 'react';
import { Shield, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { authenticateCMS } from '../../lib/cmsStore';

interface CMSGateProps {
  onAuthenticated: () => void;
}

export default function CMSGate({ onAuthenticated }: CMSGateProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter the access passcode.');
      return;
    }

    setLoading(true);
    setError('');

    setTimeout(() => {
      const ok = authenticateCMS(passcode);
      if (ok) {
        onAuthenticated();
      } else {
        setError('Invalid passcode. Access denied to internal portal.');
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-ink flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="flex flex-col items-center justify-center mb-4">
          <img
            src="/kb-nexus-logo.png"
            alt="KB NEXUS"
            className="h-16 w-auto object-contain drop-shadow-[0_0_20px_rgba(249,115,22,0.3)]"
          />
        </div>

        <div className="p-8 rounded-3xl bg-surface/80 border border-border/80 backdrop-blur-2xl shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-raised border border-primary/40 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(249,115,22,0.25)] p-2">
              <img src="/favicon.png" alt="KB NEXUS Icon" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">
                Internal Enterprise Hub
              </span>
              <h1 className="font-heading font-bold text-2xl text-ink mt-1">
                KB NEXUS
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Restricted access. Internal team authentication required.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Master Passcode
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-text-secondary/60 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter internal passcode..."
                  className="w-full pl-10 pr-4 py-3 bg-surface-raised rounded-xl border border-border text-ink text-sm placeholder-text-secondary/40 focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-text-secondary/50 mt-1.5 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Requires authorized internal security key</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-light text-ink font-heading font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-ember-sm disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Enter CMS System</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-border/60 text-center">
            <p className="text-[11px] text-text-secondary/50">
              Kinetic Bay Internal Administration • Isolated Channel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
