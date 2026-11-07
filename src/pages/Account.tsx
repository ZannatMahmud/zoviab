import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Shield, Package, Save, LogOut, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import Spinner from '@/components/common/Spinner';

export default function Account() {
  const { profile, role, session, signOut, refreshProfile, loading: authLoading } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentOrdersCount, setRecentOrdersCount] = useState<number | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    async function loadStats() {
      if (!session?.user) return;
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      setRecentOrdersCount(count ?? 0);
    }
    loadStats();
  }, [session]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    if (fullName.trim().length < 2) {
      show('Please enter a valid full name.', 'error');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      })
      .eq('id', session.user.id);

    setSaving(false);

    if (error) {
      show(`Failed to update profile: ${error.message}`, 'error');
    } else {
      show('Profile updated successfully!', 'success');
      await refreshProfile();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    show('Signed out successfully.', 'info');
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      {/* Header Banner */}
      <div className="card p-6 sm:p-8 mb-8 bg-gradient-to-r from-ivory via-blush-50 to-lavender-100/30 border border-plum-100/60 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-berry-500 text-white flex items-center justify-center font-display text-2xl shadow-soft">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'Z'}
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-plum-500">
              {profile?.full_name || 'My Account'}
            </h1>
            <p className="text-sm text-plum-400 mt-0.5">{profile?.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  role === 'admin'
                    ? 'bg-berry-100 text-berry-700 border border-berry-200'
                    : 'bg-gold-400/20 text-gold-700 border border-gold-400/30'
                }`}
              >
                <Shield className="h-3 w-3" />
                {role === 'admin' ? 'Administrator' : 'Verified Customer'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="btn-secondary self-start sm:self-center text-sm py-2.5 px-5"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Settings Form */}
        <div className="md:col-span-2">
          <div className="card p-6 sm:p-8">
            <h2 className="font-display text-xl text-plum-500 mb-1 flex items-center gap-2">
              <User className="h-5 w-5 text-berry-500" />
              Personal Profile
            </h2>
            <p className="text-sm text-plum-400 mb-6">
              Update your account details and contact information.
            </p>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="label-field">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-plum-300" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Your Full Name"
                  />
                </div>
              </div>

              <div>
                <label className="label-field">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-plum-300" />
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ''}
                    className="input-field pl-10 bg-plum-50/50 text-plum-400 cursor-not-allowed"
                    title="Email is managed through your login account"
                  />
                </div>
                <p className="text-xs text-plum-300 mt-1">
                  Primary email used for order confirmations and receipts.
                </p>
              </div>

              <div>
                <label className="label-field">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-plum-300" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field pl-10"
                    placeholder="+880 1700-000000"
                  />
                </div>
                <p className="text-xs text-plum-300 mt-1">
                  Used by our delivery partners for shipping updates.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" className="border-white" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Quick Links & Shortcuts */}
        <div className="space-y-6">
          {/* Orders Card */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-berry-50 text-berry-500 flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-plum-500">My Orders</h3>
                <p className="text-xs text-plum-400">
                  {recentOrdersCount !== null ? `${recentOrdersCount} past order(s)` : 'Loading...'}
                </p>
              </div>
            </div>
            <p className="text-xs text-plum-400 mb-4">
              Track delivery progress and review items from previous orders.
            </p>
            <Link to="/orders" className="btn-secondary w-full text-xs justify-center py-2.5">
              View Order History
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Admin Dashboard shortcut if admin */}
          {role === 'admin' && (
            <div className="card p-6 border-berry-200 bg-berry-50/40">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-berry-500 text-white flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-plum-500">Admin Console</h3>
                  <p className="text-xs text-berry-600 font-medium">Elevated Privileges</p>
                </div>
              </div>
              <p className="text-xs text-plum-400 mb-4">
                Access product catalog management, order processing, and analytics.
              </p>
              <Link to="/admin" className="btn-primary w-full text-xs justify-center py-2.5">
                Open Admin Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* Trust & Privacy Badge */}
          <div className="card p-5 bg-ivory/60">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="h-4 w-4 text-berry-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-plum-500">Protected Account</h4>
                <p className="text-[11px] text-plum-400 mt-1 leading-relaxed">
                  Your personal records are protected by database Row-Level Security. Only you can view your personal details and order history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
