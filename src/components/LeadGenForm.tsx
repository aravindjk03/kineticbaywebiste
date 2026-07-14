import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Reveal from './Reveal';

const serviceOptions = [
  'Custom Software & Projects',
  'Website Design & Development',
  'Brand Building & Identity',
  'AI & Agent-Based Solutions',
  'Cloud & DevOps Infrastructure',
];

export default function LeadGenForm() {
  const [form, setForm] = useState({ name: '', email: '', service: '', details: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full Name is required';
    if (!form.email.trim()) e.email = 'Email Address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email address';
    if (!form.service) e.service = 'Please select a service of interest';
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const valErrors = validate();
    if (Object.keys(valErrors).length > 0) {
      setErrors(valErrors);
      return;
    }
    setErrors({});
    setStatus('submitting');

    try {
      const { error } = await supabase.from('contact_inquiries').insert({
        name: form.name.trim(),
        email: form.email.trim(),
        service: form.service,
        message: form.details.trim() || 'Lead submission — Scoped Proposal request.',
      });

      if (error) throw error;
      setStatus('success');
      setForm({ name: '', email: '', service: '', details: '' });
    } catch (err) {
      console.error('Lead Gen submission error:', err);
      setStatus('error');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative p-8 md:p-12 rounded-3xl bg-surface/50 border border-border/80 backdrop-blur-xl overflow-hidden shadow-ember-sm hover:border-primary/30 transition-all duration-500">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
          {/* Left Text */}
          <div className="lg:col-span-2 space-y-4">
            <Reveal>
              <span className="eyebrow">Zero-to-Launch</span>
              <h3 className="font-heading font-bold text-ink text-2xl md:text-3xl leading-tight mt-2">
                Get a Free Scoped Proposal
              </h3>
              <p className="text-text-secondary text-sm md:text-base leading-relaxed">
                Tell us about your project, website, or brand idea. Our engineers and designers will review it and send you a structured architecture roadmap and budget scope within 24 hours — free of charge.
              </p>
            </Reveal>
          </div>

          {/* Right Form */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center text-center p-8 border border-primary/20 rounded-2xl bg-primary/5 space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="font-heading font-semibold text-ink text-xl">Proposal Request Received!</h4>
                  <p className="text-text-secondary text-sm max-w-sm">
                    We've logged your request. One of our lead chaps will reach out to schedule your scoping call or send over the roadmap draft.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink/75 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl bg-[#090A0C] border text-ink placeholder-text-secondary/35 focus:outline-none focus:border-primary transition-colors text-sm ${
                          errors.name ? 'border-red-500/50' : 'border-border'
                        }`}
                      />
                      {errors.name && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink/75 uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl bg-[#090A0C] border text-ink placeholder-text-secondary/35 focus:outline-none focus:border-primary transition-colors text-sm ${
                          errors.email ? 'border-red-500/50' : 'border-border'
                        }`}
                      />
                      {errors.email && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.email}</p>}
                    </div>
                  </div>

                  {/* Service Interest */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink/75 uppercase tracking-wider">Interest Area</label>
                    <select
                      value={form.service}
                      onChange={e => setForm({ ...form, service: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl bg-[#090A0C] border text-ink focus:outline-none focus:border-primary transition-colors text-sm ${
                        errors.service ? 'border-red-500/50' : 'border-border'
                      }`}
                    >
                      <option value="" disabled className="bg-[#090A0C] text-text-secondary/40">Select a service...</option>
                      {serviceOptions.map(opt => (
                        <option key={opt} value={opt} className="bg-[#090A0C]">{opt}</option>
                      ))}
                    </select>
                    {errors.service && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.service}</p>}
                  </div>

                  {/* Message/Details */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink/75 uppercase tracking-wider">Brief details (Optional)</label>
                    <textarea
                      rows={3}
                      placeholder="Give us a brief description of your project/timeline goals..."
                      value={form.details}
                      onChange={e => setForm({ ...form, details: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#090A0C] border border-border text-ink placeholder-text-secondary/35 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="btn-accent w-full justify-center py-3 rounded-xl text-sm font-semibold flex items-center gap-2"
                  >
                    {status === 'submitting' ? 'Submitting...' : (
                      <>
                        Get Scoped Proposal <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {status === 'error' && (
                    <p className="text-xs text-red-400 text-center flex items-center justify-center gap-1.5 mt-2">
                      <AlertCircle className="w-4 h-4" /> Something went wrong. Please check your credentials or connection and try again.
                    </p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
