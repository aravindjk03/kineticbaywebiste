import { type ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ChatbotWidget from './Chatbot/ChatbotWidget';
import CookieConsent from './CookieConsent';
import { recordVisit } from '../lib/analytics';
import { useSmoothScroll } from '../lib/motion';

const PUBLIC_PATHS = ['/', '/services', '/products', '/solutions', '/about', '/team', '/contact'];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const path = location.pathname;

  const isPublic =
    PUBLIC_PATHS.includes(path) ||
    path.startsWith('/services/') ||
    path.startsWith('/products/');

  useSmoothScroll(isPublic);

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
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white">Skip to content</a>
      <Header />
      <main id="main" className="relative flex-1">{children}</main>
      <Footer />
      <ChatbotWidget />
      <CookieConsent />
    </div>
  );
}
