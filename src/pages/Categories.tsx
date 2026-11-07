import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';
import Spinner from '@/components/common/Spinner';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('products').select('category_id'),
      ]);
      const cats = (catRes.data as Category[]) ?? [];
      setCategories(cats);

      const countMap: Record<string, number> = {};
      (prodRes.data ?? []).forEach((p) => {
        if (p.category_id) countMap[p.category_id] = (countMap[p.category_id] ?? 0) + 1;
      });
      setCounts(countMap);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <div className="text-center mb-12">
        <p className="section-eyebrow mb-3">Browse</p>
        <h1 className="font-display text-3xl sm:text-4xl text-plum-500">Shop by Category</h1>
        <p className="mt-3 text-plum-400 max-w-lg mx-auto">
          Explore our curated collections — from elegant dresses to handcrafted accessories.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <Link
              key={cat.id}
              to={`/shop?category=${cat.id}`}
              className="group relative overflow-hidden rounded-3xl aspect-[4/3] animate-fade-up shadow-soft hover:shadow-float transition-all duration-300"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <img
                src={cat.image_url ?? ''}
                alt={cat.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-plum-600/85 via-plum-500/25 to-transparent transition-opacity group-hover:from-plum-700/90" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-display text-2xl text-white font-semibold">{cat.name}</h3>
                {cat.description && (
                  <p className="mt-2 text-sm text-white/85 line-clamp-2">{cat.description}</p>
                )}
                <div className="mt-3 flex items-center gap-2 text-sm text-gold-300 font-semibold">
                  <span>{counts[cat.id] ?? 0} item{(counts[cat.id] ?? 0) !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight className="h-4 w-4" /> Shop Collection
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
