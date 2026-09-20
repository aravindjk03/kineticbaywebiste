export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  order: number;
}

export interface SiteContent {
  companyName: string;
  tagline: string;
  heroHeading: string;
  heroHighlight: string;
  heroSubtext: string;
  companyOverview: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  yearsInBusiness: string;
  projectsCompleted: string;
  satisfactionRate: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'services' | 'integration' | 'pricing' | 'company' | 'general';
}

export interface GuardrailRule {
  id: string;
  topic: string;
  description: string;
  refusalMessage: string;
  keywords: string[];
  enabled: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  content: string;
  timestamp: string;
  isCard?: boolean;
  cardType?: 'lead' | 'ticket' | 'track' | 'services_tech' | 'services_training';
  actionButtons?: { label: string; action: string; payload?: string }[];
  selectedService?: string;
  prefillTicketId?: string;
  prefillEmail?: string;
  ticketInitialSubject?: string;
}

export interface ChatbotConfig {
  botName: string;
  greetingMessage: string;
  tone: 'professional' | 'consultative' | 'friendly' | 'concise';
  companyBio: string;
  integrationCapabilities: string;
  pricingPolicy: string;
  quickSuggestions: string[];
  faqs: FAQItem[];
  guardrails: GuardrailRule[];
  fallbackMessage: string;
  geminiApiKey?: string;
}

export type LeadStatus = 'new' | 'contacted' | 'proposal_sent' | 'won' | 'lost';
export type LeadSource = 'chatbot' | 'contact_form' | 'lead_gen_form';

export interface CapturedLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service: string;
  budget?: string;
  timeline?: string;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  adminNotes?: string;
  conversationTranscript?: { sender: string; text: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface VisitEvent {
  id: string;
  path: string;
  timestamp: string;
  referrer: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

export interface VisitAnalytics {
  totalVisits: number;
  uniqueVisitors: number;
  pageViews: Record<string, number>;
  dailyVisits: { date: string; count: number }[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  recentVisits: VisitEvent[];
}

export interface CookieConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  status: 'pending' | 'accepted' | 'declined' | 'custom';
  timestamp?: string;
}
