import { useState, type FormEvent } from 'react';
import { Send, CheckCircle2, Sparkles, Building, Mail, User, Phone } from 'lucide-react';
import { addLead } from '../../lib/cmsStore';
import { api } from '../../lib/api';

interface LeadCaptureCardProps {
  onSubmitted: (leadDetails: { name: string; service: string }) => void;
  conversationSnippet?: { sender: string; text: string }[];
  defaultService?: string;
}

const serviceOptions = [
  'SaaS Platforms',
  'Custom Enterprise Software',
  'AI Agents & Automation',
  'Brand Making & Design',
  'SEO & AI Optimization (AIO)',
  'Management Software (PaaS)',
  'Team & Leadership Training',
  'Other / Scoped Roadmap',
];

export default function LeadCaptureCard({ onSubmitted, conversationSnippet, defaultService }: LeadCaptureCardProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service: defaultService || 'SaaS Platforms',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please provide your name and email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      // 1. Submit to backend API endpoint
      await api.submitPublicEnquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || undefined,
        service_slug: form.service.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        message: form.message.trim() || `Proposal request for ${form.service}`,
      }).catch((err) => console.warn('Backend enquiry submission sync warning:', err));

      // 2. Also log to local CMS store for redundancy
      await addLead({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        service: form.service,
        message: form.message.trim() || 'Chatbot interactive lead submission for project roadmap & scoping.',
        source: 'chatbot',
        conversationTranscript: conversationSnippet,
      });

      setSubmitted(true);
      onSubmitted({ name: form.name, service: form.service });
    } catch (err) {
      console.error('Lead submission failed', err);
      setError('Something went wrong. Please try again or email us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-ink space-y-2 text-center animate-in fade-in">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto text-primary">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <p className="font-heading font-semibold text-sm">Proposal Request Submitted!</p>
        <p className="text-xs text-text-secondary leading-relaxed">
          Our engineering team has logged your requirements and will reach out to <b>{form.email}</b> within 24 hours with your Scoped Architecture Roadmap.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-surface-raised border border-border text-ink space-y-3 shadow-card mt-2">
      <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Get Free 24-Hour Scoped Proposal</span>
      </div>

      <p className="text-xs text-text-secondary leading-relaxed">
        Leave your details and our senior engineers will prepare an architectural roadmap, stack selection, and milestone estimate for your project.
      </p>

      {error && (
        <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="relative">
          <User className="w-3.5 h-3.5 text-text-secondary/60 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Your Full Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-surface text-xs rounded-lg border border-border text-ink placeholder-text-secondary/50 focus:outline-none focus:border-primary transition-colors"
            required
          />
        </div>

        <div className="relative">
          <Mail className="w-3.5 h-3.5 text-text-secondary/60 absolute left-3 top-3" />
          <input
            type="email"
            placeholder="Your Email Address *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-surface text-xs rounded-lg border border-border text-ink placeholder-text-secondary/50 focus:outline-none focus:border-primary transition-colors"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Building className="w-3.5 h-3.5 text-text-secondary/60 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Company / Startup"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full pl-9 pr-3 py-2 bg-surface text-xs rounded-lg border border-border text-ink placeholder-text-secondary/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="relative">
            <Phone className="w-3.5 h-3.5 text-text-secondary/60 absolute left-3 top-3" />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full pl-9 pr-3 py-2 bg-surface text-xs rounded-lg border border-border text-ink placeholder-text-secondary/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-text-secondary mb-1">Service of Interest</label>
          <select
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })}
            className="w-full px-3 py-2 bg-surface text-xs rounded-lg border border-border text-ink focus:outline-none focus:border-primary transition-colors"
          >
            {serviceOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-surface text-ink">
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <textarea
            placeholder="Brief project details or goals..."
            rows={2}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full p-2.5 bg-surface text-xs rounded-lg border border-border text-ink placeholder-text-secondary/50 focus:outline-none focus:border-primary transition-colors resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary-light text-ink font-heading font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-ember-sm disabled:opacity-50"
        >
          {submitting ? (
            <span>Transmitting...</span>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Submit for 24h Roadmap Review</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
