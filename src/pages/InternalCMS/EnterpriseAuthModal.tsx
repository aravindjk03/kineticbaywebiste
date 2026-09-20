import { useState, type FormEvent } from 'react';
import { Shield, KeyRound, Lock, AlertCircle, ArrowRight, Smartphone, RefreshCw, Key } from 'lucide-react';
import { api } from '../../lib/api';

interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

interface EnterpriseAuthModalProps {
  onAuthenticated: (user: AuthUser) => void;
}

export default function EnterpriseAuthModal({ onAuthenticated }: EnterpriseAuthModalProps) {
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [demoTotp, setDemoTotp] = useState('');
  const [demoRecovery, setDemoRecovery] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; reference?: string } | null>(null);

  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError({ message: 'Username and password are required.' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(username.trim(), password);
      if (res.mfaRequired) {
        setMfaToken(res.mfaToken);
        setDemoTotp(res.demoTotp || '');
        setDemoRecovery(res.demoRecoveryCode || '');
        setStep('mfa');
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Authentication failed. Please verify your credentials.',
        reference: err.reference,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) {
      setError({ message: isRecovery ? 'Recovery code required.' : '6-digit authenticator code required.' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.verifyMfa(mfaToken, mfaCode.trim());
      if (res.success && res.user) {
        onAuthenticated(res.user);
      }
    } catch (err: any) {
      setError({
        message: err.message || 'MFA verification failed.',
        reference: err.reference,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-ink flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="p-8 rounded-3xl bg-surface/90 border border-border/80 backdrop-blur-2xl shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary shadow-ember-sm">
              {step === 'credentials' ? <Lock className="w-7 h-7" /> : <Smartphone className="w-7 h-7" />}
            </div>
            <div>
              <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">
                Enterprise Zero-Trust Boundary
              </span>
              <h1 className="font-heading font-bold text-2xl text-ink mt-1">
                {step === 'credentials' ? 'Internal CMS Authentication' : 'Two-Factor Challenge'}
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                {step === 'credentials'
                  ? 'Server-side scrypt credential verification and session protection.'
                  : 'RFC 6238 Time-Based One-Time Password (TOTP) verification.'}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{error.message}</span>
              </div>
              {error.reference && (
                <span className="text-[10px] text-text-secondary font-mono block pl-6">
                  Reference: {error.reference}
                </span>
              )}
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-text-secondary/60 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. superadmin, admin, marketing"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-raised rounded-xl border border-border text-ink text-xs placeholder-text-secondary/40 focus:outline-none focus:border-primary transition-colors"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-secondary/60 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-raised rounded-xl border border-border text-ink text-xs placeholder-text-secondary/40 focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-ink font-heading font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-ember-sm disabled:opacity-50"
              >
                {loading ? (
                  <span>Validating Credentials...</span>
                ) : (
                  <>
                    <span>Continue to MFA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="p-3 rounded-xl bg-surface-raised/40 border border-border/50 text-[11px] text-text-secondary/70 space-y-1">
                <span className="font-semibold text-text-secondary block">Provisioned Usernames:</span>
                <div>• Super Admin: <code className="text-primary font-mono">superadmin</code></div>
                <div>• Platform Admin: <code className="text-primary font-mono">admin</code></div>
                <div>• Marketing: <code className="text-primary font-mono">marketing</code></div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  {isRecovery ? 'Single-Use Recovery Code' : '6-Digit Authenticator Code (TOTP)'}
                </label>
                <div className="relative">
                  {isRecovery ? (
                    <Key className="w-4 h-4 text-text-secondary/60 absolute left-3.5 top-3.5" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-text-secondary/60 absolute left-3.5 top-3.5" />
                  )}
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder={isRecovery ? 'XXXX-XXXX-XXXX-XXXX' : '123456'}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-raised rounded-xl border border-border text-ink text-xs font-mono tracking-widest placeholder-text-secondary/40 focus:outline-none focus:border-primary transition-colors"
                    maxLength={30}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Live TOTP & Recovery Code Demo Helper */}
              <div className="p-3.5 rounded-2xl bg-surface-raised border border-primary/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    Current 6-Digit TOTP
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Live RFC 6238
                  </span>
                </div>
                <div className="flex items-center justify-between bg-surface p-2.5 rounded-xl border border-border">
                  <span className="font-mono text-lg font-bold tracking-widest text-emerald-400">
                    {demoTotp || '123456'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (demoTotp) {
                        setMfaCode(demoTotp);
                        setIsRecovery(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-light text-ink text-xs font-medium transition-colors"
                  >
                    Click to Fill TOTP
                  </button>
                </div>
                {demoRecovery && (
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-text-secondary">
                    <span>
                      Recovery Code: <code className="text-ink font-mono">{demoRecovery}</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMfaCode(demoRecovery);
                        setIsRecovery(true);
                      }}
                      className="text-primary hover:underline text-xs"
                    >
                      Fill Recovery
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-ink font-heading font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-ember-sm disabled:opacity-50"
              >
                {loading ? (
                  <span>Verifying Code...</span>
                ) : (
                  <>
                    <span>Authenticate & Establish Session</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecovery(!isRecovery)}
                  className="text-primary hover:underline text-[11px]"
                >
                  {isRecovery ? 'Use Authenticator Code' : 'Lost device? Use Recovery Code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setError(null);
                  }}
                  className="text-text-secondary hover:text-ink text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restart Login</span>
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-border/60 flex items-center justify-between text-[10px] text-text-secondary/60">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>TLS 1.3 • HttpOnly Session</span>
            </span>
            <span>Fail-Closed RBAC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
