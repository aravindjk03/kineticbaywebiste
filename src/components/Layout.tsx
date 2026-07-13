import { type ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <Header />
      <main className="relative">{children}</main>
      <Footer />
    </div>
  );
}
