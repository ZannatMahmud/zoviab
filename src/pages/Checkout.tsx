import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, ShieldCheck, Banknote, ArrowRight, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatBDT, DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '@/lib/format';
import Spinner from '@/components/common/Spinner';
import type { Address } from '@/types';

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { session } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [selectedAddrId, setSelectedAddrId] = useState<string>('new');
  const [placing, setPlacing] = useState(false);

  const [form, setForm] = useState({
    recipient_name: '',
    phone: '',
    address_line: '',
    city: '',
    district: '',
    postal_code: '',
  });

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    async function loadAddresses() {
      if (!session?.user) return;
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false });
      const list = (data as Address[]) ?? [];
      setAddresses(list);
      if (list.length > 0 && list.some((a) => a.is_default)) {
        const def = list.find((a) => a.is_default);
        if (def) {
          setSelectedAddrId(def.id);
          setForm({
            recipient_name: def.recipient_name,
            phone: def.phone,
            address_line: def.address_line,
            city: def.city,
            district: def.district,
            postal_code: def.postal_code ?? '',
          });
        }
      }
      setLoadingAddr(false);
    }
    loadAddresses();
  }, [session]);

  const handleAddrSelect = (id: string) => {
    setSelectedAddrId(id);
    if (id === 'new') {
      setForm({ recipient_name: '', phone: '', address_line: '', city: '', district: '', postal_code: '' });
    } else {
      const addr = addresses.find((a) => a.id === id);
      if (addr) {
        setForm({
          recipient_name: addr.recipient_name,
          phone: addr.phone,
          address_line: addr.address_line,
          city: addr.city,
          district: addr.district,
          postal_code: addr.postal_code ?? '',
        });
      }
    }
  };

  const validate = (): string | null => {
    if (!form.recipient_name.trim() || form.recipient_name.trim().length < 2) {
      return 'Please enter a valid recipient name.';
    }
    const cleanPhone = form.phone.trim().replace(/[\s-]/g, '');
    if (cleanPhone.length < 6) {
      return 'Please enter a valid phone number (at least 6 digits).';
    }
    if (!form.address_line.trim() || form.address_line.trim().length < 4) {
      return 'Please enter your street delivery address.';
    }
    if (!form.city.trim()) return 'Please enter your city.';
    if (!form.district.trim()) return 'Please enter your district.';
    return null;
  };

  const handlePlaceOrder = async () => {
    const v = validate();
    if (v) {
      show(v, 'error');
      return;
    }
    if (items.length === 0) {
      show('Your cart is empty.', 'error');
      return;
    }

    setPlacing(true);
    try {
      const addressSnapshot = {
        recipient_name: form.recipient_name,
        phone: form.phone,
        address_line: form.address_line,
        city: form.city,
        district: form.district,
        postal_code: form.postal_code || null,
      };

      const itemsJson = items.map((i) => ({
        product_id: i.product_id,
        product_name: i.name,
        product_image: i.image ?? '',
        size: i.size ?? '',
        color: i.color ?? '',
        quantity: i.quantity,
        unit_price: i.price,
      }));

      const { data: order, error } = await supabase.rpc('place_order', {
        p_address_snapshot: addressSnapshot,
        p_items: itemsJson,
        p_subtotal: subtotal,
        p_delivery_fee: deliveryFee,
        p_total: total,
      });

      if (error) throw error;

      clearCart();
      show('Order placed successfully!', 'success');
      navigate(`/order-confirmation/${(order as { id: string }).id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      show(msg, 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl text-plum-500 mb-4">Your cart is empty</h1>
        <Link to="/shop" className="btn-primary">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <h1 className="font-display text-3xl sm:text-4xl text-plum-500 mb-2">Checkout</h1>
      <p className="text-plum-400 mb-10">Complete your order — Cash on Delivery</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Saved addresses */}
          {addresses.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display text-lg text-plum-500 mb-4">Saved Addresses</h2>
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => handleAddrSelect(addr.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      selectedAddrId === addr.id ? 'border-berry-500 bg-berry-50' : 'border-plum-200 hover:border-berry-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-plum-500 text-sm">{addr.recipient_name}</p>
                        <p className="text-sm text-plum-400 mt-1">{addr.address_line}, {addr.city}, {addr.district}</p>
                        <p className="text-xs text-plum-300 mt-1">{addr.phone}</p>
                      </div>
                      {selectedAddrId === addr.id && <Check className="h-5 w-5 text-berry-500" />}
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => handleAddrSelect('new')}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    selectedAddrId === 'new' ? 'border-berry-500 bg-berry-50' : 'border-plum-200 hover:border-berry-300'
                  }`}
                >
                  <p className="font-semibold text-plum-500 text-sm flex items-center gap-2">
                    + Use a new address
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Address form */}
          <div className="card p-6">
            <h2 className="font-display text-lg text-plum-500 mb-4">Delivery Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label-field">Recipient Name</label>
                <input
                  type="text"
                  required
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  className="input-field"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="label-field">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field"
                  placeholder="+880 1700 000000"
                />
              </div>
              <div>
                <label className="label-field">Postal Code</label>
                <input
                  type="text"
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  className="input-field"
                  placeholder="1212 (optional)"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-field">Street Address</label>
                <input
                  type="text"
                  required
                  value={form.address_line}
                  onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                  className="input-field"
                  placeholder="House #, Road #, Area"
                />
              </div>
              <div>
                <label className="label-field">City</label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="input-field"
                  placeholder="Dhaka"
                />
              </div>
              <div>
                <label className="label-field">District</label>
                <input
                  type="text"
                  required
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="input-field"
                  placeholder="Dhaka"
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="card p-6">
            <h2 className="font-display text-lg text-plum-500 mb-4">Payment Method</h2>
            <div className="rounded-xl border-2 border-berry-500 bg-berry-50 p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-berry-500 text-white">
                <Banknote className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-plum-500">Cash on Delivery</p>
                <p className="text-sm text-plum-400">Pay in cash when your order arrives at your door.</p>
              </div>
              <Check className="ml-auto h-5 w-5 text-berry-500" />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 card p-6">
            <h2 className="font-display text-xl text-plum-500 mb-6">Your Order</h2>

            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {items.map((item) => (
                <div key={`${item.product_id}-${item.size}-${item.color}`} className="flex gap-3">
                  <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-blush-50">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-plum-500 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-plum-300">
                      {item.size && `Size: ${item.size} `}
                      {item.color && `Colour: ${item.color}`}
                      {` Qty: ${item.quantity}`}
                    </p>
                    <p className="text-sm font-semibold text-berry-600">{formatBDT(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-plum-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-plum-400">Subtotal</span>
                <span className="font-semibold text-plum-500">{formatBDT(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-plum-400">Delivery</span>
                <span className="font-semibold text-plum-500">
                  {deliveryFee === 0 ? <span className="text-green-600 font-semibold">Free</span> : formatBDT(deliveryFee)}
                </span>
              </div>
              <div className="border-t border-plum-100 pt-3 flex justify-between items-baseline">
                <span className="font-display text-base text-plum-500">Total</span>
                <span className="font-display text-2xl text-berry-600 font-bold">{formatBDT(total)}</span>
              </div>
            </div>

            <button onClick={handlePlaceOrder} disabled={placing} className="btn-primary w-full mt-6 py-3.5 shadow-soft hover:shadow-card">
              {placing ? <Spinner size="sm" /> : <>Place Order <ArrowRight className="h-4 w-4" /></>}
            </button>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-plum-300">
                <ShieldCheck className="h-4 w-4 text-berry-400" /> Secure checkout
              </div>
              <div className="flex items-center gap-2 text-xs text-plum-300">
                <Truck className="h-4 w-4 text-berry-400" /> Delivery in 2–5 business days
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
