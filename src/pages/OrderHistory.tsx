import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatBDT } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import type { Order, OrderStatus } from '@/types';
import Spinner from '@/components/common/Spinner';

const statusColors: Record<OrderStatus, string> = {
  Pending: 'bg-gold-400/20 text-gold-700 border border-gold-400/30 font-semibold',
  Confirmed: 'bg-lavender-100 text-lavender-700 border border-lavender-200/50 font-semibold',
  Shipped: 'bg-coral-100 text-coral-700 border border-coral-200/50 font-semibold',
  Delivered: 'bg-green-100 text-green-700 border border-green-200/50 font-semibold',
  Cancelled: 'bg-berry-100 text-berry-700 border border-berry-200/50 font-semibold',
};

export default function OrderHistory() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!session?.user) return;
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    }
    load();
  }, [session]);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <h1 className="font-display text-3xl sm:text-4xl text-plum-500 mb-2">My Orders</h1>
      <p className="text-plum-400 mb-10">Track and review your past purchases</p>

      {orders.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blush-50 mx-auto mb-4">
            <ShoppingBag className="h-8 w-8 text-berry-300" />
          </div>
          <h3 className="font-display text-xl text-plum-500">No orders yet</h3>
          <p className="mt-2 text-sm text-plum-400">When you place an order, it will appear here.</p>
          <Link to="/shop" className="mt-6 btn-primary">
            Start Shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card overflow-hidden hover:shadow-card transition-shadow">
              {/* Header */}
              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-blush-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-berry-50 text-berry-500 shrink-0">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-plum-500">{order.order_number}</p>
                    <p className="text-xs text-plum-300">
                      {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' • '}
                      {order.order_items?.length ?? 0} item{(order.order_items?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`badge ${statusColors[order.status]}`}>{order.status}</span>
                  <span className="font-display text-xl text-berry-600 font-bold hidden sm:block">{formatBDT(order.total)}</span>
                </div>
              </button>

              {/* Expanded items */}
              {expanded === order.id && order.order_items && (
                <div className="border-t border-plum-100 p-5 space-y-3 animate-slide-down bg-ivory/40">
                  {order.order_items.map((item) => (
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
                  <div className="border-t border-plum-100 pt-3 flex justify-between items-baseline text-sm">
                    <span className="text-plum-400">Delivery: {order.delivery_fee === 0 ? <span className="text-green-600 font-semibold">Free</span> : formatBDT(order.delivery_fee)}</span>
                    <span className="font-display text-lg text-berry-600 font-bold">Total: {formatBDT(order.total)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
