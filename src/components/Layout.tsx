import { type ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ChatbotWidget from './Chatbot/ChatbotWidget';
import CookieConsent from './CookieConsent';
import { recordVisit } from '../lib/analytics';

const PUBLIC_PREFIXES = ['/', '/services', '/solutions', '/team', '/contact'];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const path = location.pathname;

  const isPublic =
    PUBLIC_PREFIXES.includes(path) ||
    path.startsWith('/services/');

  useEffect(() => {
    if (isPublic) {
      recordVisit(path);
    }
  }, [path, isPublic]);

  if (!isPublic) {
    return <div className="min-h-screen bg-[#07080a] text-ink">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between">
      <Header />
      <main className="relative flex-1">{children}</main>
      <Footer />
      <ChatbotWidget />
      <CookieConsent />
    </div>
  );
}
