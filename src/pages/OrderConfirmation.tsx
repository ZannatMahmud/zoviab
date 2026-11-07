import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package, Truck, ArrowRight, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatBDT } from '@/lib/format';
import type { Order } from '@/types';
import Spinner from '@/components/common/Spinner';
import { useToast } from '@/context/ToastContext';

export default function OrderConfirmation() {
  const { id } = useParams();
  const { show } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .maybeSingle();
      setOrder(data as Order | null);
      setLoading(false);
    }
    load();
  }, [id]);

  const copyOrderNumber = () => {
    if (order?.order_number) {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(order.order_number)
          .then(() => show('Order number copied!', 'success'))
          .catch(() => show(`Order: ${order.order_number}`, 'info'));
      } else {
        show(`Order: ${order.order_number}`, 'info');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl text-plum-500 mb-4">Order not found</h1>
        <Link to="/shop" className="btn-primary">Back to Shop</Link>
      </div>
    );
  }

  const addr = order.address_snapshot;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      {/* Success header */}
      <div className="text-center mb-10">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 mx-auto mb-6 animate-scale-in">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-plum-500">Order Confirmed!</h1>
        <p className="mt-3 text-plum-400">Thank you for your purchase. We will deliver your order with care.</p>
      </div>

      {/* Order number */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-plum-300">Order Number</p>
            <button onClick={copyOrderNumber} className="flex items-center gap-2 mt-1 group">
              <span className="font-display text-2xl font-bold text-berry-600 tracking-tight">{order.order_number}</span>
              <Copy className="h-4 w-4 text-plum-300 group-hover:text-berry-500 transition-colors" />
            </button>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-plum-300">Status</p>
            <span className="badge bg-gold-400/20 text-gold-600 mt-1">{order.status}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card p-6 mb-6">
        <h2 className="font-display text-lg text-plum-500 mb-6">What Happens Next?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: CheckCircle, title: 'Order Placed', desc: 'We received your order', active: true },
            { icon: Package, title: 'Being Prepared', desc: 'Items being packed', active: false },
            { icon: Truck, title: 'On the Way', desc: 'Out for delivery', active: false },
          ].map((step) => (
            <div
              key={step.title}
              className={`rounded-xl p-4 text-center transition-all ${step.active ? 'bg-berry-50 border border-berry-300 shadow-soft' : 'bg-blush-50/50 border border-plum-100/40'}`}
            >
              <step.icon className={`h-7 w-7 mx-auto mb-2 ${step.active ? 'text-berry-500' : 'text-plum-300'}`} />
              <p className={`text-sm font-semibold ${step.active ? 'text-berry-600' : 'text-plum-400'}`}>{step.title}</p>
              <p className="text-xs text-plum-300 mt-1">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="card p-6 mb-6">
        <h2 className="font-display text-lg text-plum-500 mb-4">Order Details</h2>
        <div className="space-y-4">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex gap-4">
              <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-blush-50 shadow-soft">
                {item.product_image && <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-plum-500 text-sm">{item.product_name}</p>
                <p className="text-xs text-plum-300">
                  {item.size && `Size: ${item.size} `}
                  {item.color && `Colour: ${item.color}`}
                  {` Qty: ${item.quantity}`}
                </p>
              </div>
              <p className="font-semibold text-berry-600 text-sm">{formatBDT(item.unit_price * item.quantity)}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-plum-100 mt-4 pt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-plum-400">Subtotal</span><span className="text-plum-500 font-medium">{formatBDT(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-plum-400">Delivery</span><span className="text-plum-500 font-medium">{order.delivery_fee === 0 ? <span className="text-green-600 font-semibold">Free</span> : formatBDT(order.delivery_fee)}</span></div>
          <div className="flex justify-between text-base pt-2 border-t border-plum-100 items-baseline"><span className="font-display text-plum-500">Total</span><span className="font-display text-2xl text-berry-600 font-bold">{formatBDT(order.total)}</span></div>
        </div>
      </div>

      {/* Delivery info */}
      <div className="card p-6 mb-8">
        <h2 className="font-display text-lg text-plum-500 mb-4">Delivery Address</h2>
        {addr && (
          <div className="text-sm text-plum-400 space-y-1">
            <p className="font-semibold text-plum-500">{addr.recipient_name}</p>
            <p>{addr.address_line}</p>
            <p>{addr.city}, {addr.district}{addr.postal_code ? ` ${addr.postal_code}` : ''}</p>
            <p>{addr.phone}</p>
          </div>
        )}
        <div className="mt-4 rounded-xl bg-berry-50 border border-berry-200/60 px-4 py-3 flex items-center gap-2 text-sm text-berry-700">
          <span className="font-semibold">Payment:</span> Cash on Delivery — {formatBDT(order.total)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/orders" className="btn-secondary">View All Orders</Link>
        <Link to="/shop" className="btn-primary shadow-soft hover:shadow-card">Continue Shopping <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}
