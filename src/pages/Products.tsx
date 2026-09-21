import { Blocks, Cloud, Palette, Server } from 'lucide-react';
import { ProductsHero } from '../components/fx/HeroScenes';
import Btn from '../components/Btn';
import DeviceShowcase from '../components/fx/DeviceShowcase';
import Reveal from '../components/Reveal';
import TiltCard from '../components/TiltCard';
import { FinalCta } from '../components/ui';
import { productsIntro } from '../data/site';
import { useSeo } from '../lib/seo';

const deploy = [
  { icon: Palette, title: 'White-labelled', body: 'Your logo, your colours, your domain.' },
  { icon: Blocks, title: 'Integrated', body: 'Connected to the systems you already run.' },
  { icon: Cloud, title: 'Cloud hosted', body: 'Managed, monitored and scaled for you.' },
  { icon: Server, title: 'Or on-premise', body: 'Hosted on your own servers if you prefer.' },
];

export default function Products() {
  useSeo(
    'Products: HRMS, VMS, PMS, CRM & Attendance | Kinetic Bay',
    'Ready-to-deploy HRMS, visitor management, project management, CRM and smart attendance platforms — customised to your industry, workflows and brand.',
  );

  return (
    <div className="bg-bg">
      <ProductsHero eyebrow={productsIntro.eyebrow} title="Proven platforms." highlight="Customised for you." body={productsIntro.body}>
        <div className="flex flex-wrap gap-3">
          <Btn to="/contact?topic=Our%20Products">Request a Demo</Btn>
          <Btn href="#tour" variant="line">Take the tour</Btn>
        </div>
      </ProductsHero>
      <div id="tour" />

      <DeviceShowcase />

      <section className="section-py border-t border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal className="max-w-3xl mb-12">
            <p className="eyebrow mb-4">Deploy your way</p>
            <h2 className="font-heading font-bold text-ink text-3xl md:text-5xl leading-[1.05] tracking-[-0.025em]">{productsIntro.closer}</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {deploy.map((d, i) => (
              <Reveal key={d.title} delay={i * 80}>
                <TiltCard className="kb-card p-7 h-full" maxTilt={8}>
                  <d.icon className="w-7 h-7 text-primary mb-5" />
                  <h3 className="font-heading font-semibold text-ink text-lg mb-1">{d.title}</h3>
                  <p className="text-text-secondary text-[14px]">{d.body}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center">
            <Btn to="/contact?topic=Our%20Products">{productsIntro.cta}</Btn>
          </Reveal>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
