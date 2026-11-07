import { useEffect, useState } from 'react';
import { X, ClipboardList, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatBDT } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import type { Order, OrderStatus } from '@/types';
import Spinner from '@/components/common/Spinner';

const STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

const statusColors: Record<OrderStatus, string> = {
  Pending: 'bg-gold-400/20 text-gold-700 border border-gold-400/30 font-semibold',
  Confirmed: 'bg-lavender-100 text-lavender-700 border border-lavender-200/50 font-semibold',
  Shipped: 'bg-coral-100 text-coral-700 border border-coral-200/50 font-semibold',
  Delivered: 'bg-green-100 text-green-700 border border-green-200/50 font-semibold',
  Cancelled: 'bg-berry-100 text-berry-700 border border-berry-200/50 font-semibold',
};

export default function AdminOrders() {
  const { show } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setUpdating(orderId);
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    setUpdating(null);
    if (error) { show(error.message, 'error'); return; }
    show(`Order status updated to ${status}`, 'success');
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  };

  const filtered = orders.filter((o) => {
    const matchesFilter = filter === 'All' || o.status === filter;
    if (!matchesFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase().trim();
    const matchesNum = o.order_number?.toLowerCase().includes(term);
    const matchesRecipient = o.address_snapshot?.recipient_name?.toLowerCase().includes(term);
    const matchesPhone = o.address_snapshot?.phone?.toLowerCase().includes(term);
    const matchesCity = o.address_snapshot?.city?.toLowerCase().includes(term);
    return matchesNum || matchesRecipient || matchesPhone || matchesCity;
  });

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <div className="mb-8">
        <p className="section-eyebrow mb-2">Admin</p>
        <h1 className="font-display text-3xl text-plum-500">Manage Orders</h1>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-plum-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer, phone..."
            className="input-field pl-10 pr-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-plum-300 hover:text-plum-500"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {(['All', ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                filter === s ? 'bg-berry-500 text-white shadow-soft' : 'bg-blush-50 text-plum-400 hover:bg-blush-100'
              }`}
            >
              {s}
              {s !== 'All' && (
                <span className="ml-1.5 text-xs opacity-75">
                  ({orders.filter((o) => o.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="h-10 w-10 text-plum-300 mx-auto mb-3" />
          <p className="text-plum-400">No {filter !== 'All' ? filter.toLowerCase() : ''} orders found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const addr = order.address_snapshot;
            const isOpen = expanded === order.id;
            return (
              <div key={order.id} className="card overflow-hidden hover:shadow-card transition-shadow">
                {/* Row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 text-left hover:bg-blush-50/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-berry-50 text-berry-500 shrink-0">
                      <span className="font-display text-sm font-bold">{order.order_items?.length ?? 0}</span>
                    </div>
                    <div>
                      <p className="font-display text-base font-semibold text-plum-500">{order.order_number}</p>
                      <p className="text-xs text-plum-300">
                        {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-display text-lg font-bold text-berry-600">{formatBDT(Number(order.total))}</span>
                    <span className={`badge ${statusColors[order.status]}`}>{order.status}</span>
                    {isOpen ? <ChevronUp className="h-5 w-5 text-plum-300" /> : <ChevronDown className="h-5 w-5 text-plum-300" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-plum-100 p-5 animate-slide-down bg-ivory/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Items */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-plum-400 font-semibold mb-3">Items</h4>
                        <div className="space-y-3">
                          {order.order_items?.map((item) => (
                            <div key={item.id} className="flex gap-3 items-center">
                              <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-blush-50 shadow-soft">
                                {item.product_image && <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-plum-500">{item.product_name}</p>
                                <p className="text-xs text-plum-300">
                                  {item.size && `Size: ${item.size} `}
                                  {item.color && `Colour: ${item.color}`}
                                  {` Qty: ${item.quantity}`}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-berry-600">{formatBDT(item.unit_price * item.quantity)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-plum-100 mt-3 pt-3 flex justify-between items-baseline text-sm">
                          <span className="text-plum-400">Delivery: {order.delivery_fee === 0 ? <span className="text-green-600 font-semibold">Free</span> : formatBDT(Number(order.delivery_fee))}</span>
                          <span className="font-display text-lg text-berry-600 font-bold">Total: {formatBDT(Number(order.total))}</span>
                        </div>
                      </div>

                      {/* Address + status */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-plum-400 font-semibold mb-3">Delivery Address</h4>
                        {addr && (
                          <div className="text-sm text-plum-400 space-y-1 mb-5">
                            <p className="font-semibold text-plum-500">{addr.recipient_name}</p>
                            <p>{addr.address_line}</p>
                            <p>{addr.city}, {addr.district}{addr.postal_code ? ` ${addr.postal_code}` : ''}</p>
                            <p>{addr.phone}</p>
                          </div>
                        )}

                        <h4 className="text-xs uppercase tracking-wider text-plum-400 font-semibold mb-3">Update Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {STATUSES.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(order.id, s)}
                              disabled={updating === order.id}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50 ${
                                order.status === s
                                  ? 'border-berry-500 bg-berry-50 text-berry-600'
                                  : 'border-plum-200 text-plum-400 hover:border-berry-300'
                              }`}
                            >
                              {updating === order.id ? '...' : s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
