import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import { scrollToTop, ScrollTrigger } from './lib/motion';

const Services = lazy(() => import('./pages/Services'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Solutions = lazy(() => import('./pages/Solutions'));
const About = lazy(() => import('./pages/About'));
const Team = lazy(() => import('./pages/Team'));
const Contact = lazy(() => import('./pages/Contact'));
const DynamicCMSEntry = lazy(() => import('./pages/InternalCMS/DynamicCMSEntry'));

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // wait for the lazily-loaded page to paint, then glide to the anchor
      const t = setTimeout(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
        ScrollTrigger.refresh();
      }, 350);
      return () => clearTimeout(t);
    }
    scrollToTop();
  }, [pathname, hash]);
  return null;
}

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <span className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" aria-label="Loading" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Layout>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/about" element={<About />} />
            <Route path="/team" element={<Team />} />
            <Route path="/contact" element={<Contact />} />
            {/* Obfuscated non-obvious CMS entry route dynamically resolved by the server */}
            <Route path="/:cmsRoute" element={<DynamicCMSEntry />} />
            <Route path="*" element={<DynamicCMSEntry />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
