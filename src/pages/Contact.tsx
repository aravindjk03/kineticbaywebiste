import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DecryptedText from '../components/DecryptedText';
import { Mail, Linkedin, Github, Send, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import Reveal from '../components/Reveal';
import PageHero3D from '../components/PageHero3D';
import { supabase } from '../lib/supabase';

const interestOptions = [
  'Custom Project',
  'Partnership — NGO, Government, Academic',
  'General Inquiry',
];

const inputClass = (err?: string) =>
  `w-full px-4 py-3 rounded-lg bg-surface border text-ink placeholder-text-secondary/50 focus:outline-none focus:border-primary transition-colors text-[15px] ${err ? 'border-red-500/60' : 'border-border'}`;

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', interest: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    if (!form.interest) e.interest = 'Please select an option';
    if (!form.message.trim()) e.message = 'Message is required';
    else if (form.message.trim().length < 10) e.message = 'Message too short (min 10 chars)';
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setErrors({});
    setStatus('submitting');
    try {
      const { error } = await supabase.from('contact_inquiries').insert({
        name: form.name.trim(),
        email: form.email.trim(),
        service: form.interest,
        message: form.message.trim(),
      });
      if (error) throw error;
      setStatus('success');
      setForm({ name: '', email: '', interest: '', message: '' });
    } catch (err) {
      console.error('Contact form error:', err);
      setStatus('error');
    }
  };

  return (
    <div className="overflow-hidden bg-bg">

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative min-h-[48vh] flex items-end pb-16 pt-32 border-b border-border overflow-hidden">
        <div className="glow-orb w-[400px] h-[400px] bg-primary/10 top-1/2 right-0 -translate-y-1/2" />
        <PageHero3D shape="icosahedron" />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 w-full">
          <Reveal>
            <p className="eyebrow mb-4">Contact</p>
            <h1
              className="font-heading font-bold text-ink leading-[1.05] tracking-[-0.02em] mb-5 max-w-xl"
              style={{ fontSize: 'clamp(34px, 5vw, 64px)' }}
            >
              <DecryptedText
                text="Let's build something "
                animateOn="view"
                sequential
                revealDirection="start"
                speed={35}
                encryptedClassName="decrypt-encrypted"
              />
              <span className="text-gradient-primary">
                <DecryptedText
                  text="that matters."
                  animateOn="view"
                  sequential
                  revealDirection="start"
                  speed={35}
                  encryptedClassName="decrypt-encrypted"
                />
              </span>
            </h1>
            <p className="text-text-secondary leading-relaxed max-w-xl text-base sm:text-lg md:text-xl">
              Whether you're exploring a custom project, a partnership, or just want to talk tech — reach out.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FORM + SIDEBAR ───────────────────────── */}
      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* Form */}
            <div className="lg:col-span-3">
              <Reveal>
                {/* Trust callout */}
                <div className="mb-6 p-4 rounded-xl bg-primary/8 border border-primary/20 flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[13px] sm:text-[14px] text-text-secondary leading-relaxed">
                    <span className="font-semibold text-ink">Interested in an SDG-aligned partnership?</span>{' '}
                    We work with NGOs, government pilots, and academic institutions — mention your use case below.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="kb-card p-6 sm:p-8 space-y-5" noValidate>
                  <div>
                    <h2 className="font-heading font-semibold text-ink text-xl sm:text-2xl leading-[1.25] mb-1">Send us a message</h2>
                    <p className="text-[13px] text-text-secondary">We typically reply within 24–48 hours.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-ink/80 mb-1.5" htmlFor="contact-name">Name</label>
                      <input
                        id="contact-name"
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Your full name"
                        className={inputClass(errors.name)}
                      />
                      {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-ink/80 mb-1.5" htmlFor="contact-email">Email</label>
                      <input
                        id="contact-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@company.com"
                        className={inputClass(errors.email)}
                      />
                      {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-ink/80 mb-1.5" htmlFor="contact-interest">I'm interested in</label>
                    <select
                      id="contact-interest"
                      title="Select your area of interest"
                      value={form.interest}
                      onChange={(e) => setForm({ ...form, interest: e.target.value })}
                      className={`${inputClass(errors.interest)} bg-surface`}
                    >
                      <option value="" disabled>Select an option…</option>
                      {interestOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {errors.interest && <p className="text-[11px] text-red-400 mt-1">{errors.interest}</p>}
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-ink/80 mb-1.5" htmlFor="contact-message">Message</label>
                    <textarea
                      id="contact-message"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us about your project or use case…"
                      rows={5}
                      className={`${inputClass(errors.message)} resize-none`}
                    />
                    {errors.message && <p className="text-[11px] text-red-400 mt-1">{errors.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="btn-accent w-full justify-center rounded-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {status === 'submitting' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>Send Message <Send className="w-4 h-4" /></>
                    )}
                  </button>

                  <AnimatePresence>
                    {status === 'success' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/30"
                      >
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        <p className="text-[14px] text-ink">Message sent! We'll be in touch within 24–48 hours.</p>
                      </motion.div>
                    )}
                    {status === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 rounded-lg bg-red-500/10 border border-red-500/30"
                      >
                        <p className="text-[14px] text-red-400">Something went wrong. Please try again or email us directly.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </Reveal>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-5">
              <Reveal delay={100}>
                <div className="kb-card p-6 sm:p-7">
                  <h3 className="font-heading font-semibold text-ink text-[18px] sm:text-[20px] leading-[1.25] mb-5">Direct contact</h3>
                  <ul className="space-y-5">
                    <li>
                      <a href="mailto:hello@kineticbay.io" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-[14px] text-text-secondary group-hover:text-primary transition-colors">hello@kineticbay.io</span>
                      </a>
                    </li>
                    <li>
                      <a href="https://linkedin.com/company/kineticbay" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Linkedin className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-[14px] text-text-secondary group-hover:text-primary transition-colors">LinkedIn</span>
                      </a>
                    </li>
                    <li>
                      <a href="https://github.com/kineticbay" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Github className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-[14px] text-text-secondary group-hover:text-primary transition-colors">GitHub</span>
                      </a>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-[13px] text-text-secondary">Typically reply within 24–48 hours.</span>
                    </li>
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
