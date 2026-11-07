import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Category } from '@/types';
import ProductCard from '@/components/shop/ProductCard';
import Spinner from '@/components/common/Spinner';

type SortOption = 'newest' | 'price-low' | 'price-high' | 'name';

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const query = searchParams.get('q') ?? '';
  const categoryId = searchParams.get('category') ?? '';
  const featuredOnly = searchParams.get('featured') === 'true';
  const sort = (searchParams.get('sort') as SortOption) ?? 'newest';

  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase
        .from('products')
        .select('*, category:categories(*)');

      if (categoryId) q = q.eq('category_id', categoryId);
      if (featuredOnly) q = q.eq('featured', true);
      const cleanQ = query.trim();
      if (cleanQ) q = q.ilike('name', `%${cleanQ}%`);

      switch (sort) {
        case 'price-low': q = q.order('price', { ascending: true }); break;
        case 'price-high': q = q.order('price', { ascending: false }); break;
        case 'name': q = q.order('name', { ascending: true }); break;
        default: q = q.order('created_at', { ascending: false });
      }

      const [prodRes, catRes] = await Promise.all([
        q,
        supabase.from('categories').select('*').order('name'),
      ]);

      setProducts((prodRes.data as Product[]) ?? []);
      setCategories((catRes.data as Category[]) ?? []);
      setLoading(false);
    }
    load();
  }, [query, categoryId, featuredOnly, sort]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', searchInput.trim());
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchInput('');
  };

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  const hasFilters = query || categoryId || featuredOnly;

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      {/* Page header */}
      <div className="mb-10">
        <p className="section-eyebrow mb-2">Collection</p>
        <h1 className="font-display text-3xl sm:text-4xl text-plum-500">
          {activeCategory ? activeCategory.name : featuredOnly ? 'Featured Products' : 'All Products'}
        </h1>
        <p className="mt-3 text-plum-400">
          {loading ? 'Loading...' : `${products.length} item${products.length !== 1 ? 's' : ''} found`}
          {query && ` for "${query}"`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-28 space-y-8">
            <FilterPanel
              categories={categories}
              categoryId={categoryId}
              onCategoryChange={(id) => updateParam('category', id)}
              featuredOnly={featuredOnly}
              onFeaturedChange={() => updateParam('featured', featuredOnly ? '' : 'true')}
            />
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-2 text-sm font-medium text-berry-500 hover:text-berry-600">
                <X className="h-4 w-4" /> Clear all filters
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1">
          {/* Top bar: search + sort + mobile filter toggle */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-plum-300" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search products..."
                  className="input-field pl-10"
                />
              </div>
              <button type="submit" className="btn-primary shrink-0">Search</button>
            </form>

            <div className="flex gap-3">
              <select
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="input-field w-auto cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name A–Z</option>
              </select>

              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden btn-secondary px-4"
                aria-label="Open filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Products grid */}
          {loading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blush-50 mb-4">
                <Search className="h-8 w-8 text-berry-300" />
              </div>
              <h3 className="font-display text-xl text-plum-500">No products found</h3>
              <p className="mt-2 text-sm text-plum-400">Try adjusting your search or filters.</p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-4 btn-secondary">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <>
          <div className="fixed inset-0 z-50 bg-plum-500/30 backdrop-blur-sm lg:hidden" onClick={() => setShowFilters(false)} />
          <div className="fixed right-0 top-0 z-50 h-full w-72 max-w-[85%] bg-ivory shadow-float lg:hidden overflow-y-auto animate-slide-down">
            <div className="flex items-center justify-between p-5 border-b border-plum-100">
              <h3 className="font-display text-lg text-plum-500">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="text-plum-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-5 space-y-6">
              <FilterPanel
                categories={categories}
                categoryId={categoryId}
                onCategoryChange={(id) => { updateParam('category', id); setShowFilters(false); }}
                featuredOnly={featuredOnly}
                onFeaturedChange={() => updateParam('featured', featuredOnly ? '' : 'true')}
              />
              {hasFilters && (
                <button onClick={() => { clearFilters(); setShowFilters(false); }} className="flex items-center gap-2 text-sm font-medium text-berry-500">
                  <X className="h-4 w-4" /> Clear all filters
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterPanel({
  categories,
  categoryId,
  onCategoryChange,
  featuredOnly,
  onFeaturedChange,
}: {
  categories: Category[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  featuredOnly: boolean;
  onFeaturedChange: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-plum-500 mb-4">Categories</h3>
        <div className="space-y-1.5">
          <button
            onClick={() => onCategoryChange('')}
            className={`block w-full text-left rounded-xl px-3.5 py-2.5 text-sm transition-all ${
              !categoryId ? 'bg-berry-50 text-berry-600 font-semibold shadow-soft' : 'text-plum-400 hover:bg-blush-50 hover:text-plum-600'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`block w-full text-left rounded-xl px-3.5 py-2.5 text-sm transition-all ${
                categoryId === cat.id ? 'bg-berry-50 text-berry-600 font-semibold shadow-soft' : 'text-plum-400 hover:bg-blush-50 hover:text-plum-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-plum-500 mb-4">Special</h3>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={onFeaturedChange}
            className="h-4 w-4 rounded border-plum-200 text-berry-500 focus:ring-berry-300 accent-berry-500 cursor-pointer"
          />
          <span className="text-sm text-plum-400 group-hover:text-plum-600 transition-colors">Featured only</span>
        </label>
      </div>
    </div>
  );
}
