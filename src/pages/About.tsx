import { Link } from 'react-router-dom';
import { Sparkles, Heart, HandHeart, Globe, ArrowRight } from 'lucide-react';
import CreatorSignature from '@/components/brand/CreatorSignature';

export default function About() {
  const values = [
    { icon: Heart, title: 'Made with Love', desc: 'Every piece is chosen with care, for the woman who values elegance and comfort.' },
    { icon: Sparkles, title: 'Curated Quality', desc: 'We handpick each item to ensure it meets our standards of style and wearability.' },
    { icon: HandHeart, title: 'Customer First', desc: 'From browsing to delivery, we make your experience smooth and joyful.' },
    { icon: Globe, title: 'Rooted in Bangladesh', desc: 'Proudly designed in Dhaka, celebrating the modern Bangladeshi woman.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blush-100 via-ivory to-lavender-100 py-16 md:py-24">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-berry-200/30 blur-3xl" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <p className="section-eyebrow mb-4">Our Story</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-plum-500 leading-tight text-balance">
            Fashion that feels <span className="italic text-berry-500">like you</span>.
          </h1>
          <p className="mt-6 text-lg text-plum-400 leading-relaxed max-w-2xl mx-auto">
            ZOVIA was born from a simple belief — that fashion should feel personal, graceful, and joyful. We curate elegant, wearable pieces for the modern Bangladeshi woman who knows her style.
          </p>
        </div>
      </section>

      {/* Image + story */}
      <section className="py-16 md:py-24">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/27560852/pexels-photo-27560852.jpeg?auto=compress&cs=tinysrgb&h=900&w=700"
                alt="ZOVIA elegant fashion"
                className="w-full rounded-3xl object-cover shadow-float aspect-[4/5]"
                loading="lazy"
              />
              <div className="absolute -bottom-6 -right-6 hidden md:block">
                <div className="rounded-2xl bg-white shadow-float p-5 max-w-[200px]">
                  <p className="font-display text-3xl text-berry-500">2024</p>
                  <p className="text-xs text-plum-400 mt-1">Founded in Dhaka with a dream of elegant, accessible fashion.</p>
                </div>
              </div>
            </div>

            <div>
              <p className="section-eyebrow mb-4">The Journey</p>
              <h2 className="font-display text-3xl text-plum-500 leading-tight mb-6">
                From a small idea to a boutique you can trust.
              </h2>
              <div className="space-y-4 text-plum-400 leading-relaxed">
                <p>
                  ZOVIA started as a passion project — a love letter to fashion that celebrates femininity without compromising on comfort. We saw a gap in the market for elegant, modest clothing that feels modern and youthful, and we set out to fill it.
                </p>
                <p>
                  Today, we offer a carefully curated collection of long and midi dresses, tunics, two-piece sets, wide-leg trousers, handbags, shoes, and accessories. Each piece is selected for its quality, style, and the way it makes you feel.
                </p>
                <p>
                  Based in Dhaka and delivering across all 64 districts of Bangladesh, we are proud to bring boutique fashion to your doorstep with Cash on Delivery.
                </p>
              </div>
              <Link to="/shop" className="mt-8 btn-primary">
                Explore Our Collection <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-blush-50/50">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-eyebrow mb-3">What We Stand For</p>
            <h2 className="font-display text-3xl sm:text-4xl text-plum-500">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <div key={v.title} className="card p-6 text-center animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-berry-50 text-berry-500 mx-auto mb-4">
                  <v.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-lg text-plum-500 mb-2">{v.title}</h3>
                <p className="text-sm text-plum-400 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery strip */}
      <section className="py-16 md:py-24">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-eyebrow mb-3">Our World</p>
            <h2 className="font-display text-3xl sm:text-4xl text-plum-500">Crafted with Care</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'https://images.pexels.com/photos/27133206/pexels-photo-27133206.jpeg?auto=compress&cs=tinysrgb&h=500&w=400',
              'https://images.pexels.com/photos/8450071/pexels-photo-8450071.jpeg?auto=compress&cs=tinysrgb&h=500&w=400',
              'https://images.pexels.com/photos/10686399/pexels-photo-10686399.jpeg?auto=compress&cs=tinysrgb&h=500&w=400',
              'https://images.pexels.com/photos/27954772/pexels-photo-27954772.jpeg?auto=compress&cs=tinysrgb&h=500&w=400',
            ].map((src, i) => (
              <div key={i} className="overflow-hidden rounded-2xl aspect-[3/4]">
                <img src={src} alt={`ZOVIA collection ${i + 1}`} className="h-full w-full object-cover hover:scale-105 transition-transform duration-700" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signature */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-lavender-100/40 via-ivory to-blush-50/50">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="section-eyebrow mb-6">A Note From the Founder</p>
          <p className="font-display text-2xl sm:text-3xl text-plum-500 leading-relaxed italic text-balance">
            "Thank you for choosing ZOVIA. Every piece in our collection is a reflection of my love for fashion that empowers and celebrates you. I hope you feel as beautiful wearing our designs as I felt curating them."
          </p>
          <CreatorSignature size="lg" className="mt-8" />
        </div>
      </section>
    </div>
  );
}
