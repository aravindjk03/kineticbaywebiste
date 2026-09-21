import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Linkedin, MapPin, Send, CheckCircle2, Clock, ShieldCheck, MessageSquare } from 'lucide-react';
import { ContactHero } from '../components/fx/HeroScenes';
import Btn from '../components/Btn';
import Reveal from '../components/Reveal';
import { addLead } from '../lib/cmsStore';
import { brand, contactCopy, finalCta } from '../data/site';
import { useSeo } from '../lib/seo';

const empty = { name: '', email: '', phone: '', company: '', help: '', message: '' };

const inputClass = (err?: string) =>
  `w-full px-4 py-3.5 rounded-xl bg-bg/70 border text-ink placeholder-text-secondary/40 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-[15px] ${err ? 'border-red-500/60' : 'border-border'}`;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-ink/80 mb-2">{label}</label>
      {children}
      {error && <p className="text-[12px] text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}

export default function Contact() {
  useSeo(
    'Contact Kinetic Bay | Book a Free Consultation',
    "Tell us about your challenge. Free discovery call, NDA on request, and a response within 24 hours from Kinetic Bay's Chennai team.",
  );
  const [params] = useSearchParams();
  const topic = params.get('topic');
  const [form, setForm] = useState({ ...empty, help: topic && contactCopy.helpOptions.includes(topic) ? topic : '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Please tell us your name';
    if (!form.email.trim()) e.email = 'Work email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email address';
    if (form.phone && !/^[+\d][\d\s-]{6,}$/.test(form.phone.trim())) e.phone = 'Please enter a valid phone number';
    if (!form.help) e.help = 'Please choose an option';
    if (form.message.trim().length < 10) e.message = 'A few more words help us prepare (min 10 characters)';
    return e;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    setStatus('submitting');
    try {
      await addLead({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        service: form.help,
        message: form.message.trim(),
        source: 'contact_form',
      });
      setStatus('success');
      setForm(empty);
    } catch (err) {
      console.error('Contact form error:', err);
      setStatus('error');
    }
  };

  return (
    <div className="bg-bg">
      <ContactHero eyebrow={finalCta.eyebrow} title="Let's start" highlight="a conversation." body={finalCta.body} />

      <section className="section-py">
        <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-[1.35fr_0.65fr] gap-8">
          <Reveal>
            <div className="relative rounded-3xl border border-border bg-surface/70 p-7 md:p-10 overflow-hidden">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative text-center py-16">
                    <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-6" />
                    <h2 className="font-heading font-bold text-ink text-2xl md:text-3xl mb-4">Message sent.</h2>
                    <p className="text-text-secondary max-w-md mx-auto mb-8">{contactCopy.success}</p>
                    <Btn variant="line" onClick={() => setStatus('idle')}>Send another message</Btn>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={submit} noValidate className="relative space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h2 className="font-heading font-bold text-ink text-2xl md:text-3xl mb-2">{contactCopy.headline}</h2>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field id="c-name" label="Name" error={errors.name}>
                        <input id="c-name" autoComplete="name" value={form.name} onChange={set('name')} className={inputClass(errors.name)} placeholder="Your full name" />
                      </Field>
                      <Field id="c-email" label="Work Email" error={errors.email}>
                        <input id="c-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={inputClass(errors.email)} placeholder="you@company.com" />
                      </Field>
                      <Field id="c-phone" label="Phone (optional)" error={errors.phone}>
                        <input id="c-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className={inputClass(errors.phone)} placeholder="+91" />
                      </Field>
                      <Field id="c-company" label="Company (optional)">
                        <input id="c-company" autoComplete="organization" value={form.company} onChange={set('company')} className={inputClass()} placeholder="Company name" />
                      </Field>
                    </div>
                    <Field id="c-help" label="How can we help?" error={errors.help}>
                      <select id="c-help" value={form.help} onChange={set('help')} className={`${inputClass(errors.help)} appearance-none cursor-pointer`}>
                        <option value="" disabled>Choose a topic</option>
                        {contactCopy.helpOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </Field>
                    <Field id="c-message" label="Message" error={errors.message}>
                      <textarea id="c-message" rows={5} value={form.message} onChange={set('message')} className={`${inputClass(errors.message)} resize-none`} placeholder="Tell us about the process that's slowing you down…" />
                    </Field>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                      <p className="text-[12px] text-text-secondary/70">We use your details only to reply to this enquiry.</p>
                      <Btn type="submit" disabled={status === 'submitting'} icon={<Send className="w-4 h-4" />}>{status === 'submitting' ? 'Sending…' : 'Send Message'}</Btn>
                    </div>
                    {status === 'error' && <p className="text-[14px] text-red-400">Something went wrong. Please try again or email us at {brand.email}.</p>}
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>

          <div className="space-y-5">
            <Reveal delay={100}>
              <div className="kb-card p-7">
                <p className="eyebrow mb-5">Reach us directly</p>
                <ul className="space-y-4 text-[14px]">
                  <li><a href={`mailto:${brand.email}`} className="flex items-center gap-3 text-ink hover:text-primary transition-colors"><Mail className="w-4 h-4 text-primary" />{brand.email}</a></li>
                  <li><a href={brand.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-ink hover:text-primary transition-colors"><Linkedin className="w-4 h-4 text-primary" />LinkedIn</a></li>
                  <li className="flex items-center gap-3 text-ink"><MapPin className="w-4 h-4 text-primary" />{brand.city}</li>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={180}>
              <div className="kb-card p-7">
                <p className="eyebrow mb-5">What happens next</p>
                <ul className="space-y-4">
                  {[
                    { icon: Clock, t: 'Response within 24 hours', s: 'Usually much sooner.' },
                    { icon: MessageSquare, t: 'Free discovery call', s: 'No obligation, just clarity.' },
                    { icon: ShieldCheck, t: 'NDA on request', s: 'Before we see any of your data.' },
                  ].map(({ icon: Icon, t, s }) => (
                    <li key={t} className="flex gap-3">
                      <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div><p className="text-ink text-[14px] font-semibold">{t}</p><p className="text-text-secondary text-[13px]">{s}</p></div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
