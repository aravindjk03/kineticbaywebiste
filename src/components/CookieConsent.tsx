import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, ShieldCheck, Check, Settings2, X } from 'lucide-react';
import { getCookieConsent, saveCookieConsent } from '../lib/analytics';
import { CookieConsentState } from '../types/cms';

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [preferences, setPreferences] = useState({
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    const current = getCookieConsent();
    if (current.status === 'pending') {
      // Delay slightly for smooth page entrance
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const updated: CookieConsentState = {
      necessary: true,
      analytics: true,
      marketing: true,
      status: 'accepted',
    };
    saveCookieConsent(updated);
    setShow(false);
  };

  const handleDecline = () => {
    const updated: CookieConsentState = {
      necessary: true,
      analytics: false,
      marketing: false,
      status: 'declined',
    };
    saveCookieConsent(updated);
    setShow(false);
  };

  const handleSaveCustom = () => {
    const updated: CookieConsentState = {
      necessary: true,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      status: 'custom',
    };
    saveCookieConsent(updated);
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-6 z-40 max-w-md w-[calc(100vw-3rem)] font-sans"
        >
          <div className="p-5 rounded-2xl bg-[#0e0f13]/95 backdrop-blur-xl border border-border shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <Cookie className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm text-ink">Cookie & Privacy Preferences</h4>
                  <p className="text-[11px] text-text-secondary">Kinetic Bay Data Policy</p>
                </div>
              </div>
              <button
                onClick={handleDecline}
                className="text-text-secondary hover:text-ink p-1 transition-colors"
                title="Decline and close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              We use necessary cookies to maintain session integrity, and optional cookies to analyze site traffic, optimize conversational AI interactions, and measure project inquiry conversions.
            </p>

            {customize && (
              <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-ink block">Strictly Necessary</span>
                    <span className="text-[11px] text-text-secondary">Core platform security & functionality.</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                    Required
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div>
                    <span className="font-medium text-ink block">Analytics & Performance</span>
                    <span className="text-[11px] text-text-secondary">Visit counts & feature usage telemetry.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="accent-primary w-4 h-4 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div>
                    <span className="font-medium text-ink block">Marketing & Personalization</span>
                    <span className="text-[11px] text-text-secondary">Customized proposal insights and referrals.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                    className="accent-primary w-4 h-4 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {customize ? (
                <>
                  <button
                    onClick={handleSaveCustom}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-ember-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Custom</span>
                  </button>
                  <button
                    onClick={() => setCustomize(false)}
                    className="py-2 px-3 rounded-xl bg-surface hover:bg-surface-raised border border-border text-ink text-xs font-medium transition-colors"
                  >
                    Back
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleAcceptAll}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-ember-sm"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Accept All</span>
                  </button>
                  <button
                    onClick={handleDecline}
                    className="py-2 px-3 rounded-xl bg-surface hover:bg-surface-raised border border-border text-text-secondary hover:text-ink text-xs font-medium transition-colors"
                  >
                    Essential Only
                  </button>
                  <button
                    onClick={() => setCustomize(true)}
                    className="p-2 rounded-xl bg-surface hover:bg-surface-raised border border-border text-text-secondary hover:text-ink text-xs transition-colors"
                    title="Customize"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
