import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Tags } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { Category } from '@/types';
import Spinner from '@/components/common/Spinner';

const BLANK = { name: '', description: '', image_url: '' };

export default function AdminCategories() {
  const { show } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('products').select('category_id'),
    ]);
    setCategories((catRes.data as Category[]) ?? []);
    const countMap: Record<string, number> = {};
    (prodRes.data ?? []).forEach((p) => {
      if (p.category_id) countMap[p.category_id] = (countMap[p.category_id] ?? 0) + 1;
    });
    setCounts(countMap);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(BLANK); setShowModal(true); };
  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description ?? '', image_url: cat.image_url ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { show('Please enter a category name.', 'error'); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), description: form.description.trim() || null, image_url: form.image_url.trim() || null };
    let error;
    if (editing) {
      ({ error } = await supabase.from('categories').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('categories').insert(payload));
    }
    setSaving(false);
    if (error) { show(error.message, 'error'); return; }
    show(editing ? 'Category updated' : 'Category added', 'success');
    setShowModal(false);
    load();
  };

  const handleDelete = async (cat: Category) => {
    if (counts[cat.id]) {
      show(`Cannot delete "${cat.name}" — it has ${counts[cat.id]} products. Move or delete them first.`, 'error');
      return;
    }
    if (!confirm(`Delete "${cat.name}"?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) { show(error.message, 'error'); return; }
    show('Category deleted', 'success');
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="section-eyebrow mb-2">Admin</p>
          <h1 className="font-display text-3xl text-plum-500">Manage Categories</h1>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="h-4 w-4" /> Add Category</button>
      </div>

      {categories.length === 0 ? (
        <div className="card p-12 text-center">
          <Tags className="h-10 w-10 text-plum-300 mx-auto mb-3" />
          <p className="text-plum-400">No categories yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="card overflow-hidden group hover:shadow-card transition-shadow">
              <div className="relative h-36 overflow-hidden bg-blush-50">
                {cat.image_url && <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                <div className="absolute inset-0 bg-gradient-to-t from-plum-600/70 via-plum-500/15 to-transparent" />
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-plum-500 hover:text-berry-500 shadow-soft transition-colors" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(cat)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-plum-500 hover:text-berry-600 shadow-soft transition-colors" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg text-plum-500 font-semibold">{cat.name}</h3>
                {cat.description && <p className="text-sm text-plum-400 mt-1 line-clamp-2">{cat.description}</p>}
                <p className="text-xs text-berry-600 font-semibold mt-3">{counts[cat.id] ?? 0} product{(counts[cat.id] ?? 0) !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-50 bg-plum-500/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-ivory rounded-2xl shadow-float animate-scale-in">
            <div className="border-b border-plum-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-plum-500">{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowModal(false)} className="text-plum-400 hover:text-plum-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label-field">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Long Dresses" />
              </div>
              <div>
                <label className="label-field">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field min-h-[70px] resize-y" placeholder="Short description" />
              </div>
              <div>
                <label className="label-field">Image URL</label>
                <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input-field" placeholder="https://..." />
              </div>
              {form.image_url && (
                <img src={form.image_url} alt="Preview" className="h-24 w-full rounded-lg object-cover" />
              )}
            </div>
            <div className="border-t border-plum-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Spinner size="sm" /> : editing ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
