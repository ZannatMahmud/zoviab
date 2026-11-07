import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, DollarSign, Clock, TrendingUp, ArrowRight, Box, Tags, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatBDT } from '@/lib/format';
import type { Order } from '@/types';
import Spinner from '@/components/common/Spinner';

interface Stats {
  productCount: number;
  orderCount: number;
  pendingCount: number;
  revenue: number;
}

const statusColors: Record<string, string> = {
  Pending: 'bg-gold-400/20 text-gold-700 border border-gold-400/30 font-semibold',
  Confirmed: 'bg-lavender-100 text-lavender-700 border border-lavender-200/50 font-semibold',
  Shipped: 'bg-coral-100 text-coral-700 border border-coral-200/50 font-semibold',
  Delivered: 'bg-green-100 text-green-700 border border-green-200/50 font-semibold',
  Cancelled: 'bg-berry-100 text-berry-700 border border-berry-200/50 font-semibold',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ productCount: 0, orderCount: 0, pendingCount: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [prodRes, orderRes, recentRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id, status, total'),
        supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const orders = orderRes.data ?? [];
      const pending = orders.filter((o) => o.status === 'Pending').length;
      const revenue = orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + Number(o.total), 0);

      setStats({
        productCount: prodRes.count ?? 0,
        orderCount: orders.length,
        pendingCount: pending,
        revenue,
      });
      setRecentOrders((recentRes.data as Order[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  const cards = [
    { label: 'Total Products', value: stats.productCount.toString(), icon: Box, color: 'bg-lavender-100 text-lavender-600' },
    { label: 'Total Orders', value: stats.orderCount.toString(), icon: ShoppingBag, color: 'bg-coral-100 text-coral-600' },
    { label: 'Pending Orders', value: stats.pendingCount.toString(), icon: Clock, color: 'bg-gold-400/20 text-gold-600' },
    { label: 'Revenue', value: formatBDT(stats.revenue), icon: TrendingUp, color: 'bg-green-100 text-green-600' },
  ];

  const managementLinks = [
    { to: '/admin/products', label: 'Manage Products', desc: 'Add, edit, delete products and update stock', icon: Package },
    { to: '/admin/categories', label: 'Manage Categories', desc: 'Organize your product categories', icon: Tags },
    { to: '/admin/orders', label: 'Manage Orders', desc: 'View and update order statuses', icon: ClipboardList },
  ];

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <div className="mb-10">
        <p className="section-eyebrow mb-2">Admin Panel</p>
        <h1 className="font-display text-3xl sm:text-4xl text-plum-500">Dashboard Overview</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${card.color} mb-3`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-display font-bold text-plum-500">{card.value}</p>
            <p className="text-xs text-plum-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Management shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {managementLinks.map((link) => (
          <Link key={link.to} to={link.to} className="card p-6 group hover:shadow-float transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-berry-50 text-berry-500">
                <link.icon className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-plum-300 group-hover:text-berry-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-display text-lg text-plum-500">{link.label}</h3>
            <p className="text-sm text-plum-400 mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-plum-500">Recent Orders</h2>
          <Link to="/admin/orders" className="text-sm font-semibold text-berry-500 hover:text-berry-600 flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-sm text-plum-400 py-8 text-center">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-plum-100 text-left">
                  <th className="pb-3 font-semibold text-plum-400 text-xs uppercase tracking-wider">Order</th>
                  <th className="pb-3 font-semibold text-plum-400 text-xs uppercase tracking-wider">Items</th>
                  <th className="pb-3 font-semibold text-plum-400 text-xs uppercase tracking-wider">Total</th>
                  <th className="pb-3 font-semibold text-plum-400 text-xs uppercase tracking-wider">Status</th>
                  <th className="pb-3 font-semibold text-plum-400 text-xs uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-plum-50 hover:bg-blush-50/30 transition-colors last:border-0">
                    <td className="py-3.5 font-medium text-plum-500">{order.order_number}</td>
                    <td className="py-3.5 text-plum-400">{order.order_items?.length ?? 0}</td>
                    <td className="py-3.5 font-semibold text-berry-600 font-display">{formatBDT(Number(order.total))}</td>
                    <td className="py-3.5">
                      <span className={`badge ${statusColors[order.status] ?? 'bg-plum-100 text-plum-600'}`}>{order.status}</span>
                    </td>
                    <td className="py-3.5 text-plum-400 text-xs">
                      {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
