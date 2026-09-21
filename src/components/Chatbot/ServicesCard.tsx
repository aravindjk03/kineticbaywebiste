import { Cloud, Package, ArrowRight } from 'lucide-react';
import { pillars, products } from '../../data/site';

interface ServicesCardProps {
  /** 'technology' lists the four service pillars; 'training' is kept as the key for the products card. */
  category: 'technology' | 'training';
  onSelectService: (serviceName: string) => void;
}

export default function ServicesCard({ category, onSelectService }: ServicesCardProps) {
  const isServices = category === 'technology';
  const items = isServices
    ? pillars.map((p) => ({ key: p.slug, name: p.name, short: p.tagline, href: `/services/${p.slug}` }))
    : products.map((p) => ({ key: p.slug, name: p.name, short: p.tagline, href: `/products/${p.slug}` }));
  const Icon = isServices ? Cloud : Package;

  return (
    <div className="p-3.5 rounded-xl bg-surface/90 border border-primary/20 space-y-2.5">
      <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
        <h5 className="font-heading font-semibold text-xs text-primary flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span>{isServices ? 'Our Services' : 'Our Products'}</span>
        </h5>
        <span className="text-[10px] text-text-secondary">{items.length} {isServices ? 'Pillars' : 'Platforms'}</span>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.key}
            className="p-2.5 rounded-lg bg-surface-raised border border-border/80 hover:border-primary/40 transition-colors space-y-1"
          >
            <a href={item.href} className="font-semibold text-xs text-ink hover:text-primary transition-colors">{item.name}</a>
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
