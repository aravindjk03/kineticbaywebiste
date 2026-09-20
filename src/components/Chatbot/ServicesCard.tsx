import { useState, useEffect } from 'react';
import { Cloud, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';

interface ServiceItem {
  slug: string;
  category: string;
  name: string;
  short: string;
  price: string;
}

interface ServicesCardProps {
  category: 'technology' | 'training';
  onSelectService: (serviceName: string) => void;
}

export default function ServicesCard({ category, onSelectService }: ServicesCardProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await api.getPublicServices(category);
        if (isMounted && res.services) {
          setServices(res.services);
        }
      } catch (err) {
        console.warn('Fallback to local services view', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [category]);

  if (loading) {
    return (
      <div className="p-3 bg-surface rounded-xl border border-border text-center text-xs text-text-secondary flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 animate-spin text-primary" />
        <span>Loading service catalogue...</span>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-surface/90 border border-primary/20 space-y-2.5">
      <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
        <h5 className="font-heading font-semibold text-xs text-primary flex items-center gap-1.5">
          <Cloud className="w-3.5 h-3.5" />
          <span>{category === 'technology' ? 'Technology Solutions' : 'Training Programs'}</span>
        </h5>
        <span className="text-[10px] text-text-secondary">{services.length} Offerings</span>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {services.map((item) => (
          <div
            key={item.slug}
            className="p-2.5 rounded-lg bg-surface-raised border border-border/80 hover:border-primary/40 transition-colors space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-ink">{item.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                {item.price}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-snug">{item.short}</p>
            <div className="pt-1 flex items-center justify-end">
              <button
                onClick={() => onSelectService(item.name)}
                className="text-[10px] text-primary hover:text-primary-light font-medium flex items-center gap-1 transition-colors"
              >
                <span>Enquire about this</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
