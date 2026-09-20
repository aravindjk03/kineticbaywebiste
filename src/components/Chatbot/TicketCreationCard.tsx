import { useState, type FormEvent } from 'react';
import { Send, CheckCircle2, Ticket, AlertCircle, Copy, Check } from 'lucide-react';
import { api } from '../../lib/api';

interface TicketCreationCardProps {
  onSubmitted: (ticketInfo: { public_id: string; subject: string }) => void;
}

export default function TicketCreationCard({ onSubmitted }: TicketCreationCardProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    category: 'technical_support',
    priority: 'medium',
    subject: '',
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<{
    public_id: string;
    subject: string;
    status: string;
    created_at: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.description.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please provide a valid email address.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await api.submitPublicTicket({
        name: form.name.trim(),
        email: form.email.trim(),
        category: form.category,
        priority: form.priority,
        subject: form.subject.trim(),
        description: form.description.trim(),
      });

      if (res.ticket) {
        setCreatedTicket(res.ticket);
        onSubmitted({
          public_id: res.ticket.public_id,
          subject: res.ticket.subject,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyTicketId = () => {
    if (!createdTicket) return;
    navigator.clipboard.writeText(createdTicket.public_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdTicket) {
    return (
      <div className="p-4 rounded-xl bg-surface border border-emerald-500/30 text-ink space-y-3 animate-in fade-in">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <h4 className="font-heading font-semibold text-sm">Ticket Successfully Raised!</h4>
        </div>

        <p className="text-xs text-text-secondary">
          Your ticket has been logged directly into our engineering dispatch queue. Please save your reference ID to track progress:
        </p>

        <div className="p-3 bg-surface-raised rounded-lg border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Ticket Reference</span>
            <span className="font-mono font-bold text-sm text-primary">{createdTicket.public_id}</span>
          </div>
          <button
            onClick={copyTicketId}
            className="p-1.5 rounded-lg bg-surface border border-border hover:text-primary transition-colors flex items-center gap-1 text-xs"
            title="Copy Reference ID"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="text-[11px] text-text-secondary space-y-1">
          <p>• <b>Status:</b> <span className="text-emerald-400 font-semibold">{createdTicket.status}</span></p>
          <p>• <b>Subject:</b> {createdTicket.subject}</p>
          <p className="text-[10px] text-text-secondary/70 pt-1">
            You can track this ticket anytime in this chat using your Ticket Reference and email address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-surface/90 border border-primary/20 shadow-lg text-ink space-y-3">
      <div className="flex items-center gap-2 text-primary border-b border-border/60 pb-2">
        <Ticket className="w-4 h-4" />
        <h4 className="font-heading font-semibold text-xs tracking-wide">Raise Support / Service Ticket</h4>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-text-secondary block mb-1">Your Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-raised border border-border rounded-lg text-ink focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[10px] text-text-secondary block mb-1">Your Email *</label>
            <input
              type="email"
              required
              placeholder="john@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-raised border border-border rounded-lg text-ink focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-text-secondary block mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-surface-raised border border-border rounded-lg text-ink focus:outline-none focus:border-primary"
            >
              <option value="technical_support">Technical Support</option>
              <option value="project_enquiry">Project Enquiry</option>
              <option value="consultation">Consultation</option>
              <option value="bug_report">Bug Report</option>
              <option value="billing">Billing</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-text-secondary block mb-1">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-surface-raised border border-border rounded-lg text-ink focus:outline-none focus:border-primary"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-text-secondary block mb-1">Subject *</label>
          <input
            type="text"
            required
            placeholder="Brief description of the request"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-surface-raised border border-border rounded-lg text-ink focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-[10px] text-text-secondary block mb-1">Details & Context *</label>
          <textarea
            required
            rows={3}
            placeholder="Describe the issue, environment, or assistance required..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-surface-raised border border-border rounded-lg text-ink focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 bg-primary hover:bg-primary-light text-ink text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-ember-sm disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{submitting ? 'Submitting Ticket...' : 'Submit Support Ticket'}</span>
        </button>
      </form>
    </div>
  );
}
