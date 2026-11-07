import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Search, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatBDT } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import type { Product, Category, ProductSize } from '@/types';
import { ALL_SIZES } from '@/lib/products';
import Spinner from '@/components/common/Spinner';

const BLANK_FORM = {
  name: '',
  description: '',
  price: '',
  stock: '',
  sizes: [] as ProductSize[],
  colors: [] as string[],
  image_urls: [] as string[],
  category_id: '',
  featured: false,
};

export default function AdminProducts() {
  const { show } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [colorInput, setColorInput] = useState('');

  async function load() {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*, category:categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ]);
    setProducts((prodRes.data as Product[]) ?? []);
    setCategories((catRes.data as Category[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => {
    setEditing(null);
    setForm({ ...BLANK_FORM, category_id: categories[0]?.id ?? '' });
    setImageUrlInput('');
    setColorInput('');
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      sizes: product.sizes ?? [],
      colors: product.colors ?? [],
      image_urls: product.image_urls ?? [],
      category_id: product.category_id ?? '',
      featured: product.featured,
    });
    setImageUrlInput('');
    setColorInput('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      show('Please enter a name and price.', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      stock: Number(form.stock) || 0,
      sizes: form.sizes.length ? form.sizes : null,
      colors: form.colors.length ? form.colors : null,
      image_urls: form.image_urls.length ? form.image_urls : null,
      category_id: form.category_id || null,
      featured: form.featured,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('products').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('products').insert(payload));
    }
    setSaving(false);
    if (error) {
      show(error.message, 'error');
      return;
    }
    show(editing ? 'Product updated' : 'Product added', 'success');
    setShowModal(false);
    load();
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) { show(error.message, 'error'); return; }
    show('Product deleted', 'success');
    load();
  };

  const toggleSize = (size: ProductSize) => {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(size) ? f.sizes.filter((s) => s !== size) : [...f.sizes, size],
    }));
  };

  const addColor = () => {
    const c = colorInput.trim();
    if (c && !form.colors.includes(c)) {
      setForm((f) => ({ ...f, colors: [...f.colors, c] }));
    }
    setColorInput('');
  };

  const addImageUrl = () => {
    const u = imageUrlInput.trim();
    if (u) setForm((f) => ({ ...f, image_urls: [...f.image_urls, u] }));
    setImageUrlInput('');
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="section-eyebrow mb-2">Admin</p>
          <h1 className="font-display text-3xl text-plum-500">Manage Products</h1>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-plum-300" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="input-field pl-10"
        />
      </div>

      {/* Products table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="h-10 w-10 text-plum-300 mx-auto mb-3" />
          <p className="text-plum-400">No products found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blush-50/50">
                <tr className="text-left">
                  <th className="px-5 py-4 font-semibold text-plum-400 text-xs uppercase tracking-wider">Product</th>
                  <th className="px-5 py-4 font-semibold text-plum-400 text-xs uppercase tracking-wider">Category</th>
                  <th className="px-5 py-4 font-semibold text-plum-400 text-xs uppercase tracking-wider">Price</th>
                  <th className="px-5 py-4 font-semibold text-plum-400 text-xs uppercase tracking-wider">Stock</th>
                  <th className="px-5 py-4 font-semibold text-plum-400 text-xs uppercase tracking-wider">Featured</th>
                  <th className="px-5 py-4 font-semibold text-plum-400 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-plum-50 hover:bg-blush-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-blush-50 shadow-soft">
                          {p.image_urls?.[0] && <img src={p.image_urls[0]} alt={p.name} className="h-full w-full object-cover" />}
                        </div>
                        <span className="font-medium text-plum-500">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-plum-400">{p.category?.name ?? '—'}</td>
                    <td className="px-5 py-3 font-semibold text-berry-600 font-display">{formatBDT(p.price)}</td>
                    <td className="px-5 py-3">
                      <span className={p.stock <= 0 ? 'text-berry-700 font-semibold' : p.stock <= 5 ? 'text-gold-700 font-semibold' : 'text-plum-400'}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {p.featured ? <span className="badge bg-gold-400/20 text-gold-600">Yes</span> : <span className="text-plum-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="flex h-8 w-8 items-center justify-center rounded-lg text-plum-400 hover:bg-berry-50 hover:text-berry-500 transition-colors" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(p)} className="flex h-8 w-8 items-center justify-center rounded-lg text-plum-400 hover:bg-berry-50 hover:text-berry-600 transition-colors" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-50 bg-plum-500/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-ivory rounded-2xl shadow-float animate-scale-in">
            <div className="sticky top-0 bg-ivory border-b border-plum-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-plum-500">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-plum-400 hover:text-plum-500"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="label-field">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Product name" />
              </div>

              <div>
                <label className="label-field">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field min-h-[80px] resize-y" placeholder="Product description" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Price (BDT)</label>
                  <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" placeholder="2890" />
                </div>
                <div>
                  <label className="label-field">Stock</label>
                  <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input-field" placeholder="15" />
                </div>
              </div>

              <div>
                <label className="label-field">Category</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input-field cursor-pointer">
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label-field">Available Sizes</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                        form.sizes.includes(size) ? 'border-berry-500 bg-berry-50 text-berry-600' : 'border-plum-200 text-plum-400 hover:border-berry-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-field">Colours</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } }}
                    className="input-field"
                    placeholder="e.g. Rose, Black, Ivory"
                  />
                  <button type="button" onClick={addColor} className="btn-secondary px-4 shrink-0">Add</button>
                </div>
                {form.colors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.colors.map((c) => (
                      <span key={c} className="flex items-center gap-1 rounded-full bg-lavender-100 px-3 py-1 text-xs text-plum-500">
                        {c}
                        <button onClick={() => setForm((f) => ({ ...f, colors: f.colors.filter((x) => x !== c) }))}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label-field">Image URLs</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(); } }}
                    className="input-field"
                    placeholder="https://images.pexels.com/..."
                  />
                  <button type="button" onClick={addImageUrl} className="btn-secondary px-4 shrink-0">Add</button>
                </div>
                {form.image_urls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {form.image_urls.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Product ${i + 1}`} className="h-20 w-full rounded-lg object-cover" />
                        <button
                          onClick={() => setForm((f) => ({ ...f, image_urls: f.image_urls.filter((_, idx) => idx !== i) }))}
                          className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-berry-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-4 w-4 rounded border-plum-200 text-berry-500 focus:ring-berry-300" />
                <span className="text-sm text-plum-500">Featured on home page</span>
              </label>
            </div>

            <div className="sticky bottom-0 bg-ivory border-t border-plum-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Spinner size="sm" /> : editing ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
