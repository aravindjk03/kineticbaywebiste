import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  ArrowUpRight,
  Ticket,
  Search,
  FileText,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { processChatQuery, ActionButton } from '../../lib/chatbotEngine';
import { ChatMessage } from '../../types/cms';
import LeadCaptureCard from './LeadCaptureCard';
import TicketCreationCard from './TicketCreationCard';
import TicketTrackingCard from './TicketTrackingCard';
import ServicesCard from './ServicesCard';
import type { MascotMood } from './ChatMascot';

const ChatMascot = lazy(() => import('./ChatMascot'));
const GREETING = 'I am your deterministic service guide. How can I assist you today?';

function FormattedChatMessage({ content, isBot }: { content: string; isBot: boolean }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    try {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const lines = content.split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Check if line is a prominent Ticket ID reference heading: e.g. # **`KB-XXXXXXXX`**
        const ticketMatch = trimmed.match(/^#\s*(?:\*\*)?(?:`|')?(KB-[A-Z0-9]{4,12})(?:`|')?(?:\*\*)?/i);
        if (ticketMatch) {
          const tktId = ticketMatch[1].toUpperCase();
          return (
            <div
              key={idx}
              className="my-2.5 p-3 bg-emerald-950/50 rounded-xl border border-emerald-500/50 flex items-center justify-between shadow-inner"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div>
                  <span className="text-[10px] text-emerald-400/90 uppercase tracking-wider block font-semibold">
                    Ticket Reference ID
                  </span>
                  <span className="font-mono font-bold text-base text-emerald-300 tracking-wider">
                    {tktId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(tktId)}
                className="px-2.5 py-1.5 rounded-lg bg-surface/90 border border-emerald-500/40 hover:border-emerald-400 text-ink hover:text-emerald-300 text-xs font-mono flex items-center gap-1 transition-all shadow-sm"
                title="Copy Reference ID to clipboard"
              >
                {copiedId === tktId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-text-secondary" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>
          );
        }

        // Markdown inline parser for bold and code
        const renderFormattedSpans = (text: string) => {
          const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
          const parts = text.split(regex);

          return parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-semibold text-ink">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code
                  key={pIdx}
                  className="px-1.5 py-0.5 rounded bg-surface-raised border border-border/80 font-mono text-[11px] text-primary"
                >
                  {part.slice(1, -1)}
                </code>
              );
            }
            return <span key={pIdx}>{part}</span>;
          });
        };

        if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-1 text-xs">
              <span className="text-primary font-bold mt-0.5">•</span>
              <div className="flex-1 leading-relaxed">{renderFormattedSpans(trimmed.slice(2))}</div>
            </div>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            {renderFormattedSpans(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mood = useRef<MascotMood>({ hover: false, thinking: false });
  mood.current.thinking = isTyping;
  const [showHello, setShowHello] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowHello(true), 3500);
    const h = setTimeout(() => setShowHello(false), 11000);
    return () => { clearTimeout(t); clearTimeout(h); };
  }, []);

  const [activeTicket, setActiveTicket] = useState<{ public_id: string; subject: string; status: string } | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('kb_user_tickets');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            return {
              public_id: list[0].public_id,
              subject: list[0].subject || 'Support Ticket',
              status: list[0].status || 'NEW',
            };
          }
        }
      }
    } catch {}
    return null;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // 1. Try restore from sessionStorage
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const saved = sessionStorage.getItem('kb_chat_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {}

    // 2. Check if recent tickets exist in localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('kb_user_tickets');
        if (raw) {
          const userTickets = JSON.parse(raw);
          if (Array.isArray(userTickets) && userTickets.length > 0) {
            const latest = userTickets[0];
            return [
              {
                id: 'msg-init',
                sender: 'bot',
                content: GREETING,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                actionButtons: [
                  { label: `🔍 Track Ticket ${latest.public_id}`, action: 'track', payload: latest.public_id },
                  { label: '🎫 Support Ticket', action: 'ticket' },
                  { label: '🚀 Explore Services', action: 'services' },
                  { label: '📋 Request Proposal', action: 'proposal' },
                ],
              },
            ];
          }
        }
      }
    } catch {}

    return [
      {
        id: 'msg-init',
        sender: 'bot',
        content: GREETING,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionButtons: [
          { label: '🚀 Explore Services', action: 'services' },
          { label: '📋 Request Proposal', action: 'proposal' },
          { label: '🎫 Support Ticket', action: 'ticket' },
          { label: '🔍 Track Ticket', action: 'track' },
        ],
      },
    ];
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [isOpen, messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const history = [...messages, userMsg].map((m) => ({
      sender: m.sender,
      text: m.content,
    }));

    try {
      // Deterministic processing with natural typing cadence (350ms)
      await new Promise((res) => setTimeout(res, 350));
      const res = await processChatQuery(query, history);

      const botMsg: ChatMessage = {
        id: 'msg_bot_' + Date.now(),
        sender: 'bot',
        content: res.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionButtons: res.actionButtons,
      };

      if (res.triggerCard) {
        let prefillId: string | undefined;
        let prefillMail: string | undefined;

        // Check if query contains a ticket ID
        const match = query.match(/\b(kb-[a-z0-9]{4,12})\b/i);
        if (match) {
          prefillId = match[1].toUpperCase();
        } else if (activeTicket) {
          prefillId = activeTicket.public_id;
        }

        try {
          prefillMail = localStorage.getItem('kb_last_ticket_email') || undefined;
        } catch {}

        const cardMsg: ChatMessage = {
          id: 'card_' + Date.now(),
          sender: 'system',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCard: true,
          cardType: res.triggerCard,
          prefillTicketId: prefillId,
          prefillEmail: prefillMail,
        };
        setMessages((prev) => [...prev, botMsg, cardMsg]);
      } else {
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err) {
      console.error('Deterministic Chat error', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'bot',
          content: 'I encountered an unexpected issue while retrieving that information. Our engineering team is available directly at Kineticbay@gmail.com.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionButton = (btn: ActionButton) => {
    switch (btn.action) {
      case 'services':
        handleSend('What services do you offer?');
        break;
      case 'services_tech':
        handleSend('Tell me about your IT services');
        break;
      case 'services_training':
        handleSend('Tell me about your products');
        break;
      case 'proposal':
        handleSend('I would like to request a 24-hour project proposal');
        break;
      case 'ticket':
        handleSend('I want to raise a support ticket');
        break;
      case 'track':
        if (btn.payload) {
          handleSend(`Track ticket ${btn.payload}`);
        } else if (activeTicket) {
          handleSend(`Track ticket ${activeTicket.public_id}`);
        } else {
          handleSend('Track existing ticket status');
        }
        break;
      case 'integration':
        handleSend('How does Kinetic Bay integrate with our project?');
        break;
      default:
        handleSend(btn.label);
    }
  };

  const handleResetChat = () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('kb_chat_history');
      }
    } catch {}

    const initialGreeting = GREETING;
    let initialButtons: ActionButton[] = [
      { label: '🚀 Explore Services', action: 'services' },
      { label: '📋 Request Proposal', action: 'proposal' },
      { label: '🎫 Support Ticket', action: 'ticket' },
      { label: '🔍 Track Ticket', action: 'track' },
    ];

    if (activeTicket) {
      initialButtons = [
        { label: `🔍 Track Ticket ${activeTicket.public_id}`, action: 'track', payload: activeTicket.public_id },
        { label: '🎫 Support Ticket', action: 'ticket' },
        { label: '🚀 Explore Services', action: 'services' },
        { label: '📋 Request Proposal', action: 'proposal' },
      ];
    }

    setMessages([
      {
        id: 'msg-init-' + Date.now(),
        sender: 'bot',
        content: initialGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionButtons: initialButtons,
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            data-lenis-prevent
            className="w-[92vw] sm:w-[440px] h-[610px] max-h-[85vh] bg-[#0c0d10]/95 backdrop-blur-2xl border border-border/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 border-primary/20"
          >
            {/* ── HEADER ── */}
            <div className="px-4 py-3 bg-surface/80 border-b border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 -my-1">
                  <Suspense fallback={<Bot className="w-6 h-6 text-primary m-3" />}>
                    <ChatMascot mood={mood} className="absolute inset-[-6px]" />
                  </Suspense>
                  <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-surface" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-heading font-bold text-sm text-ink">KAI</h3>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-medium">
                      Deterministic
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Kinetic Bay service guide</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleResetChat}
                  title="Reset conversation"
                  className="p-1.5 rounded-lg text-text-secondary hover:text-ink hover:bg-surface-raised transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Minimize chat"
                  className="p-1.5 rounded-lg text-text-secondary hover:text-ink hover:bg-surface-raised transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── ACTIVE TICKET PERSISTENT BANNER ── */}
            {activeTicket && (
              <div className="px-3.5 py-2 bg-emerald-950/40 border-b border-emerald-500/20 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-400 font-medium truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[11px] text-text-secondary">Logged Ticket:</span>
                  <span className="font-mono font-bold text-emerald-300">{activeTicket.public_id}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase font-semibold">
                    {activeTicket.status || 'NEW'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSend(`Track ticket ${activeTicket.public_id}`)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold border border-emerald-500/40 shrink-0 ml-2 transition-colors flex items-center gap-1"
                >
                  <Search className="w-2.5 h-2.5" />
                  <span>Track Status</span>
                </button>
              </div>
            )}

            {/* ── CHAT MESSAGES BODY ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-border">
              {messages.map((msg) => {
                if (msg.isCard) {
                  return (
                    <div key={msg.id} className="space-y-2">
                      {msg.cardType === 'lead' && (
                        <LeadCaptureCard
                          defaultService={msg.selectedService}
                          conversationSnippet={messages
                            .filter((m) => !m.isCard)
                            .map((m) => ({ sender: m.sender, text: m.content }))}
                          onSubmitted={({ name, service }) => {
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: 'msg_ack_' + Date.now(),
                                sender: 'bot',
                                content: `Thank you, ${name}! Your request regarding **${service}** has been logged into our engineering dispatch queue. We'll be in touch with your scoped proposal within 24 hours.`,
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              },
                            ]);
                          }}
                        />
                      )}

                      {msg.cardType === 'ticket' && (
                        <TicketCreationCard
                          defaultSubject={msg.ticketInitialSubject}
                          onSubmitted={({ public_id, subject, email }) => {
                            setActiveTicket({
                              public_id,
                              subject,
                              status: 'NEW',
                            });
                            setMessages((prev) => {
                              if (prev.some((m) => m.content.includes(public_id))) return prev;
                              return [
                                ...prev,
                                {
                                  id: 'msg_tkt_ack_' + Date.now(),
                                  sender: 'bot',
                                  content: `🎉 **Ticket Confirmed & Logged!**\n\nYour Ticket Reference ID is:\n# **\`${public_id}\`**\n\n• **Subject:** ${subject}\n• **Status:** \`NEW\` (Queued in Dispatch Queue)\n• **SLA:** First engineering response within 24 hours\n\nPlease keep note of reference **\`${public_id}\`**. You can verify and track live updates at any time right here in this chat!`,
                                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                  actionButtons: [
                                    { label: `🔍 Track Ticket ${public_id}`, action: 'track', payload: public_id },
                                    { label: '🚀 Explore Services', action: 'services' },
                                  ],
                                },
                              ];
                            });
                          }}
                          onTrackRequested={(trackId, trackEmail) => {
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: 'card_track_' + Date.now(),
                                sender: 'system',
                                content: '',
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                isCard: true,
                                cardType: 'track',
                                prefillTicketId: trackId,
                                prefillEmail: trackEmail,
                              },
                            ]);
                          }}
                        />
                      )}

                      {msg.cardType === 'track' && (
                        <TicketTrackingCard
                          initialTicketId={msg.prefillTicketId}
                          initialEmail={msg.prefillEmail}
                        />
                      )}

                      {msg.cardType === 'services_tech' && (
                        <ServicesCard
                          category="technology"
                          onSelectService={(serviceName) => {
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: 'msg_sel_' + Date.now(),
                                sender: 'user',
                                content: `I'm interested in ${serviceName}`,
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              },
                              {
                                id: 'msg_prop_' + Date.now(),
                                sender: 'bot',
                                content: `Excellent choice. We have built high-scale architectures for **${serviceName}**. Please fill out your contact details below to receive a free 24-hour scoped roadmap:`,
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              },
                              {
                                id: 'card_lead_' + Date.now(),
                                sender: 'system',
                                content: '',
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                isCard: true,
                                cardType: 'lead',
                                selectedService: serviceName,
                              },
                            ]);
                          }}
                        />
                      )}

                      {msg.cardType === 'services_training' && (
                        <ServicesCard
                          category="training"
                          onSelectService={(serviceName) => {
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: 'msg_sel_' + Date.now(),
                                sender: 'user',
                                content: `I'm interested in ${serviceName}`,
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              },
                              {
                                id: 'msg_prop_' + Date.now(),
                                sender: 'bot',
                                content: `Transform your team's operational momentum with **${serviceName}**. Please enter your squad details below:`,
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              },
                              {
                                id: 'card_lead_' + Date.now(),
                                sender: 'system',
                                content: '',
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                isCard: true,
                                cardType: 'lead',
                                selectedService: serviceName,
                              },
                            ]);
                          }}
                        />
                      )}
                    </div>
                  );
                }

                const isBot = msg.sender === 'bot';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isBot ? '' : 'flex-row-reverse'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                        isBot
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-surface-raised text-ink border border-border'
                      }`}
                    >
                      {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div className={`max-w-[84%] ${isBot ? 'items-start' : 'items-end'}`}>
                      <div
                        className={`p-3 rounded-2xl text-[13px] leading-relaxed ${
                          isBot
                            ? 'bg-surface text-ink border border-border/80 rounded-tl-sm'
                            : 'bg-primary text-ink font-medium rounded-tr-sm shadow-ember-sm'
                        }`}
                      >
                        <FormattedChatMessage content={msg.content} isBot={isBot} />
                      </div>

                      {/* Action buttons attached to bot response */}
                      {isBot && msg.actionButtons && msg.actionButtons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {msg.actionButtons.map((btn, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleActionButton(btn)}
                              className="px-2.5 py-1 rounded-lg bg-surface-raised/90 border border-primary/30 text-[11px] font-medium text-text-primary hover:text-primary hover:border-primary transition-all flex items-center gap-1 shadow-sm"
                            >
                              <span>{btn.label}</span>
                              <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          ))}
                        </div>
                      )}

                      <span className="text-[10px] text-text-secondary/50 mt-1 px-1 block">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl bg-surface border border-border/80 rounded-tl-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── QUICK SUGGESTION CHIPS ── */}
            <div className="px-3 py-2 border-t border-border/40 bg-surface/40 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
              <button
                onClick={() => handleSend('What services do you offer?')}
                className="px-2.5 py-1 rounded-full bg-surface-raised border border-border text-[11px] text-text-secondary hover:text-ink hover:border-primary/50 whitespace-nowrap transition-all flex items-center gap-1"
              >
                <Layers className="w-3 h-3 text-primary" />
                <span>Services</span>
              </button>
              <button
                onClick={() => handleSend('I would like to request a 24-hour proposal')}
                className="px-2.5 py-1 rounded-full bg-surface-raised border border-border text-[11px] text-text-secondary hover:text-ink hover:border-primary/50 whitespace-nowrap transition-all flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-primary" />
                <span>Proposal</span>
              </button>
              <button
                onClick={() => handleSend('I want to raise a support ticket')}
                className="px-2.5 py-1 rounded-full bg-surface-raised border border-border text-[11px] text-text-secondary hover:text-ink hover:border-primary/50 whitespace-nowrap transition-all flex items-center gap-1"
              >
                <Ticket className="w-3 h-3 text-primary" />
                <span>Raise Ticket</span>
              </button>
              <button
                onClick={() => handleSend('Track existing ticket')}
                className="px-2.5 py-1 rounded-full bg-surface-raised border border-border text-[11px] text-text-secondary hover:text-ink hover:border-primary/50 whitespace-nowrap transition-all flex items-center gap-1"
              >
                <Search className="w-3 h-3 text-primary" />
                <span>Track Ticket</span>
              </button>
            </div>

            {/* ── INPUT BOX ── */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-surface/90 border-t border-border/80 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about services, raise a ticket, or enter KB-XXXXXXXX..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-surface-raised rounded-xl border border-border text-ink placeholder-text-secondary/50 text-xs focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="p-2.5 rounded-xl bg-primary hover:bg-primary-light text-ink transition-colors disabled:opacity-40 shadow-ember-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLOATING LAUNCHER: KAI ── */}
      <div className="relative flex justify-end">
        <AnimatePresence>
          {showHello && !isOpen && (
            <motion.button
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              onClick={() => { setShowHello(false); setIsOpen(true); }}
              className="absolute right-[84px] bottom-5 whitespace-nowrap px-4 py-2.5 bg-[#111214] text-[13px] text-ink shadow-[0_0_0_1px_rgba(249,115,22,0.45),0_14px_40px_-10px_rgba(0,0,0,0.9)] [clip-path:polygon(0_0,100%_0,100%_calc(100%_-_10px),calc(100%_-_10px)_100%,0_100%)]"
            >
              Hi, I'm <span className="text-primary font-semibold">KAI</span>. Need a hand?
            </motion.button>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onMouseEnter={() => { mood.current.hover = true; }}
          onMouseLeave={() => { mood.current.hover = false; }}
          onClick={() => { setIsOpen(!isOpen); setShowHello(false); }}
          className="relative w-[72px] h-[72px] bg-[#0e0f12] shadow-[0_0_0_1px_rgba(249,115,22,0.55),0_18px_40px_-8px_rgba(249,115,22,0.45)] [clip-path:polygon(0_0,calc(100%_-_14px)_0,100%_14px,100%_100%,14px_100%,0_calc(100%_-_14px))]"
          aria-label={isOpen ? 'Close KAI, the Kinetic Bay assistant' : 'Chat with KAI, the Kinetic Bay assistant'}
        >
          <Suspense fallback={<MessageSquare className="w-6 h-6 text-primary m-auto" />}>
            <ChatMascot mood={mood} className="absolute inset-0" />
          </Suspense>
          {isOpen && (
            <span className="absolute top-1.5 right-1.5 w-5 h-5 grid place-items-center bg-primary text-bg">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          {!isOpen && hasUnread && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
}
