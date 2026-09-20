import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { processChatQuery, ActionButton } from '../../lib/chatbotEngine';
import { getChatbotConfig } from '../../lib/cmsStore';
import { ChatMessage } from '../../types/cms';
import LeadCaptureCard from './LeadCaptureCard';
import TicketCreationCard from './TicketCreationCard';
import TicketTrackingCard from './TicketTrackingCard';
import ServicesCard from './ServicesCard';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(getChatbotConfig());
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-init',
      sender: 'bot',
      content: `${config.greetingMessage}\n\nI am your deterministic service guide. How can I assist you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionButtons: [
        { label: '🚀 Explore Services', action: 'services' },
        { label: '📋 Request Proposal', action: 'proposal' },
        { label: '🎫 Support Ticket', action: 'ticket' },
        { label: '🔍 Track Ticket', action: 'track' },
      ],
    },
  ]);

  // Sync config when CMS updates it
  useEffect(() => {
    const handleConfigUpdate = () => {
      setConfig(getChatbotConfig());
    };
    window.addEventListener('kb:chatbot_updated', handleConfigUpdate);
    return () => window.removeEventListener('kb:chatbot_updated', handleConfigUpdate);
  }, []);

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
        const cardMsg: ChatMessage = {
          id: 'card_' + Date.now(),
          sender: 'system',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCard: true,
          cardType: res.triggerCard,
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
        handleSend('Tell me about Technology & Engineering Services');
        break;
      case 'services_training':
        handleSend('Tell me about Human & Organizational Training');
        break;
      case 'proposal':
        handleSend('I would like to request a 24-hour project proposal');
        break;
      case 'ticket':
        handleSend('I want to raise a support ticket');
        break;
      case 'track':
        handleSend('Track existing ticket status');
        break;
      case 'integration':
        handleSend('How does Kinetic Bay integrate with our project?');
        break;
      default:
        handleSend(btn.label);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'msg-init-' + Date.now(),
        sender: 'bot',
        content: `${config.greetingMessage}\n\nI am your deterministic service guide. How can I assist you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionButtons: [
          { label: '🚀 Explore Services', action: 'services' },
          { label: '📋 Request Proposal', action: 'proposal' },
          { label: '🎫 Support Ticket', action: 'ticket' },
          { label: '🔍 Track Ticket', action: 'track' },
        ],
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
            className="w-[92vw] sm:w-[440px] h-[610px] max-h-[85vh] bg-[#0c0d10]/95 backdrop-blur-2xl border border-border/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 border-primary/20"
          >
            {/* ── HEADER ── */}
            <div className="px-4 py-3 bg-surface/80 border-b border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-ember-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-surface" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-heading font-semibold text-sm text-ink">{config.botName || 'Kinetic Assistant'}</h3>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-medium">
                      Deterministic
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Confidentiality Protected • Zero-AI</span>
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
                          onSubmitted={({ public_id, subject }) => {
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: 'msg_tkt_ack_' + Date.now(),
                                sender: 'bot',
                                content: `Support ticket **${public_id}** ("${subject}") has been assigned to our rapid dispatch queue. You can check its live status at any time right here in this chat!`,
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                actionButtons: [{ label: '🔍 Track This Ticket', action: 'track' }],
                              },
                            ]);
                          }}
                        />
                      )}

                      {msg.cardType === 'track' && <TicketTrackingCard />}

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
                        className={`p-3 rounded-2xl text-[13px] leading-relaxed whitespace-pre-line ${
                          isBot
                            ? 'bg-surface text-ink border border-border/80 rounded-tl-sm'
                            : 'bg-primary text-ink font-medium rounded-tr-sm shadow-ember-sm'
                        }`}
                      >
                        {msg.content}
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

      {/* ── FLOATING LAUNCHER BUTTON ── */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative group p-4 rounded-full bg-primary text-ink shadow-ember flex items-center justify-center transition-transform"
        aria-label="Toggle Kinetic Bay Service Assistant"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-accent border-2 border-bg" />
              </span>
            )}
          </>
        )}

        {/* Ambient pulse ring */}
        <span className="absolute -inset-1 rounded-full bg-primary/20 -z-10 animate-pulse-slow" />
      </motion.button>
    </div>
  );
}
