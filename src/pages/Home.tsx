import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, Sparkles, ShoppingBag, Mail, Send, CheckCircle, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Category } from '@/types';
import ProductCard from '@/components/shop/ProductCard';
import Spinner from '@/components/common/Spinner';
import CreatorSignature from '@/components/brand/CreatorSignature';
import { useToast } from '@/context/ToastContext';

export default function Home() {
  const { show } = useToast();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSent, setNewsletterSent] = useState(false);

  useEffect(() => {
    async function load() {
      const [featuredRes, newestRes, catRes, bestSellerRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('featured', true)
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('products')
          .select('*, category:categories(*)')
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true })
          .limit(8),
        supabase
          .from('order_items')
          .select('product_id, quantity'),
      ]);

      setFeatured((featuredRes.data as Product[]) ?? []);
      setNewArrivals((newestRes.data as Product[]) ?? []);
      setCategories((catRes.data as Category[]) ?? []);

      // Compute best sellers from order history
      const items = bestSellerRes.data ?? [];
      if (items.length > 0) {
        const salesMap: Record<string, number> = {};
        items.forEach((item) => {
          if (item.product_id) {
            salesMap[item.product_id] = (salesMap[item.product_id] ?? 0) + item.quantity;
          }
        });
        const topIds = Object.entries(salesMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4)
          .map(([id]) => id);

        if (topIds.length > 0) {
          const { data: topProducts } = await supabase
            .from('products')
            .select('*, category:categories(*)')
            .in('id', topIds);
          // Preserve sort order by sales volume
          const sorted = (topProducts as Product[] ?? []).sort(
            (a, b) => (salesMap[b.id] ?? 0) - (salesMap[a.id] ?? 0),
          );
          setBestSellers(sorted);
        }
      }

      // Fallback: if no sales data, use featured as best sellers
      setBestSellers((prev) => {
        if (prev.length > 0) return prev;
        return (featuredRes.data as Product[]) ?? [];
      });

      setLoading(false);
    }
    load();
  }, []);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      show('Please enter a valid email address.', 'error');
      return;
    }
    setNewsletterSent(true);
    show('Thank you for subscribing to ZOVIA!', 'success');
    setNewsletterEmail('');
    setTimeout(() => setNewsletterSent(false), 4000);
  };

  return (
    <div>
      {/* 1. Hero banner */}
      <section className="relative overflow-hidden bg-ivory">
        {/* Ambient atmospheric gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-blush-50/80 via-ivory to-lavender-100/40 pointer-events-none" />
        <div className="absolute -top-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-berry-200/25 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-32 h-80 w-80 rounded-full bg-peach-200/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-lavender-200/25 blur-3xl pointer-events-none" />

        <div className="relative max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-up text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-plum-500 shadow-soft backdrop-blur-sm mb-6">
                <Sparkles className="h-3.5 w-3.5 text-gold-400" />
                <span>Spring / Summer 2026</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.08] text-plum-500 text-balance tracking-tight">
                Fashion that <span className="font-normal italic text-berry-500">feels</span> like you.
              </h1>
              <p className="mt-6 max-w-lg text-base sm:text-lg leading-relaxed text-plum-400 mx-auto lg:mx-0 font-normal">
                Discover ZOVIA — Bangladesh's premier boutique for timeless long dresses, graceful tunics, contemporary co-ords, and handcrafted accessories. Thoughtfully designed for the modern woman.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/shop" className="btn-primary shadow-soft hover:shadow-card">
                  Shop Collection
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/categories" className="btn-secondary">
                  Explore Categories
                </Link>
              </div>

              {/* Highlights below buttons */}
              <div className="mt-10 pt-8 border-t border-plum-100/60 flex items-center justify-center lg:justify-start gap-8 text-xs text-plum-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gold-400" />
                  <span>Free delivery over ৳3,000</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-berry-500" />
                  <span>Cash on Delivery</span>
                </div>
              </div>
            </div>

            <div className="relative animate-fade-in">
              <div className="relative grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img
                    src="https://images.pexels.com/photos/27133206/pexels-photo-27133206.jpeg?auto=compress&cs=tinysrgb&h=900&w=600"
                    alt="Woman in elegant rose long dress"
                    className="w-full rounded-3xl object-cover shadow-float aspect-[3/4] border-2 border-white/60"
                    loading="eager"
                  />
                  <img
                    src="https://images.pexels.com/photos/17901631/pexels-photo-17901631.jpeg?auto=compress&cs=tinysrgb&h=600&w=600"
                    alt="Woman in midi dress"
                    className="w-full rounded-2xl object-cover shadow-card aspect-square border border-white/40"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-4 pt-10">
                  <img
                    src="https://images.pexels.com/photos/28168157/pexels-photo-28168157.jpeg?auto=compress&cs=tinysrgb&h=600&w=600"
                    alt="Woman in two-piece set"
                    className="w-full rounded-2xl object-cover shadow-card aspect-square border border-white/40"
                    loading="lazy"
                  />
                  <img
                    src="https://images.pexels.com/photos/27560852/pexels-photo-27560852.jpeg?auto=compress&cs=tinysrgb&h=900&w=600"
                    alt="Woman in ivory gown"
                    className="w-full rounded-3xl object-cover shadow-float aspect-[3/4] border-2 border-white/60"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -bottom-5 -left-4 hidden sm:block">
                <div className="rounded-2xl bg-white/95 backdrop-blur-md shadow-float px-5 py-3.5 border border-plum-100/40">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gold-400/20 text-gold-600 flex items-center justify-center font-bold text-sm">
                      ৳
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold text-plum-500">Cash on Delivery</p>
                      <p className="text-[11px] text-plum-300">Nationwide across all 64 districts</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-y border-plum-100/60 bg-white">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Nationwide Delivery', desc: 'All 64 districts' },
              { icon: ShieldCheck, title: 'Secure Shopping', desc: 'Protected checkout' },
              { icon: ShoppingBag, title: 'Cash on Delivery', desc: 'Pay when it arrives' },
              { icon: Sparkles, title: 'Curated Quality', desc: 'Handpicked pieces' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-berry-50 text-berry-500">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-plum-500">{item.title}</p>
                  <p className="text-xs text-plum-300">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Featured categories */}
      <section className="py-16 md:py-24">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-eyebrow mb-3">Explore</p>
            <h2 className="font-display text-3xl sm:text-4xl text-plum-500">Shop by Category</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {categories.map((cat, i) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${cat.id}`}
                  className="group relative overflow-hidden rounded-2xl aspect-[4/5] animate-fade-up shadow-soft hover:shadow-card transition-shadow"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <img
                    src={cat.image_url ?? ''}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-plum-600/85 via-plum-500/20 to-transparent transition-opacity group-hover:from-plum-700/90" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="font-display text-lg text-white font-semibold">{cat.name}</h3>
                    <p className="text-xs text-gold-300 font-medium mt-1 flex items-center gap-1 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      Shop collection <ArrowRight className="h-3 w-3" />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. New Arrivals */}
      <section className="py-16 md:py-24 bg-lavender-100/30">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
            <div>
              <p className="section-eyebrow mb-3 flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Just In</p>
              <h2 className="font-display text-3xl sm:text-4xl text-plum-500">New Arrivals</h2>
              <p className="mt-2 text-sm text-plum-400">The latest additions to our collection</p>
            </div>
            <Link to="/shop?sort=newest" className="btn-secondary">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {newArrivals.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Best Sellers */}
      <section className="py-16 md:py-24">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
            <div>
              <p className="section-eyebrow mb-3 flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> Customer Favourites</p>
              <h2 className="font-display text-3xl sm:text-4xl text-plum-500">Best Sellers</h2>
              <p className="mt-2 text-sm text-plum-400">Our most loved pieces by ZOVIA shoppers</p>
            </div>
            <Link to="/shop" className="btn-secondary">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {bestSellers.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. Promotional banner */}
      <section className="py-16 md:py-24">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-berry-500 via-berry-600 to-plum-500 px-8 py-16 md:px-16 md:py-24 text-center shadow-card">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gold-400/20 blur-2xl pointer-events-none" />
            <div className="relative">
              <Sparkles className="h-10 w-10 text-gold-300 mx-auto mb-4" />
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-white font-bold text-balance">
                New Season, New You
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-white/90 text-base sm:text-lg">
                Free delivery on orders over ৳3,000. Shop the latest collection and pay when it arrives with Cash on Delivery.
              </p>
              <Link to="/shop" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-berry-600 shadow-soft transition-all hover:bg-gold-300 hover:text-plum-600 hover:shadow-card">
                Start Shopping
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Featured products */}
      <section className="py-16 md:py-24 bg-blush-50/50">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
            <div>
              <p className="section-eyebrow mb-3">Handpicked for you</p>
              <h2 className="font-display text-3xl sm:text-4xl text-plum-500">Featured Collection</h2>
            </div>
            <Link to="/shop?featured=true" className="btn-secondary">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 7. Brand introduction */}
      <section className="py-16 md:py-24 bg-lavender-100/40">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/32809973/pexels-photo-32809973.jpeg?auto=compress&cs=tinysrgb&h=800&w=600"
                alt="ZOVIA brand story"
                className="w-full rounded-3xl object-cover shadow-float aspect-[4/5]"
                loading="lazy"
              />
              <div className="absolute -bottom-5 -right-5 hidden md:flex flex-col items-center rounded-2xl bg-white shadow-float px-6 py-4">
                <CreatorSignature size="md" variant="dark" />
              </div>
            </div>
            <div className="animate-fade-up">
              <p className="section-eyebrow mb-4">Our Story</p>
              <h2 className="font-display text-3xl sm:text-4xl text-plum-500 leading-tight">
                Fashion designed with love, from Dhaka to your wardrobe.
              </h2>
              <p className="mt-6 text-plum-400 leading-relaxed text-base">
                ZOVIA was born from a simple idea: that fashion should feel personal. Every piece in our collection is chosen for its elegance, comfort, and the way it makes you feel. We believe in graceful, wearable designs that celebrate the modern Bangladeshi woman.
              </p>
              <p className="mt-4 text-plum-400 leading-relaxed text-base">
                From flowing long dresses to curated accessories, each item is handpicked to bring you a boutique experience that feels distinctly yours.
              </p>
              <Link to="/about" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-berry-500 hover:text-berry-600 transition-colors">
                Read Our Story
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Newsletter section */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-peach-200 via-blush-100 to-lavender-200/60 px-6 py-12 md:px-12 md:py-16 text-center">
            <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-berry-200/20 blur-2xl" />
            <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-lavender-300/20 blur-2xl" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-soft mx-auto mb-5">
                <Mail className="h-7 w-7 text-berry-500" />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-plum-500">Join the ZOVIA Family</h2>
              <p className="mt-4 max-w-md mx-auto text-plum-400 text-sm sm:text-base">
                Subscribe to be the first to know about new arrivals, exclusive offers, and styling tips. No spam, just fashion you'll love.
              </p>

              {newsletterSent ? (
                <div className="mt-8 max-w-md mx-auto animate-slide-down">
                  <div className="flex items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 shadow-soft">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <p className="text-sm font-semibold text-plum-500">You're subscribed! Welcome to ZOVIA.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleNewsletter} className="mt-8 max-w-md mx-auto flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="input-field flex-1 bg-white/90"
                  />
                  <button type="submit" className="btn-primary shrink-0">
                    Subscribe
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
              <p className="mt-4 text-xs text-plum-300">By subscribing, you agree to receive updates from ZOVIA. Unsubscribe anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Professional footer is rendered by Layout.tsx */}
    </div>
  );
}
