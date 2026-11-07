import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Spinner from '@/components/common/Spinner';

export default function Register() {
  const { signUp, session, loading } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true });
  }, [session, loading, navigate]);

  const validate = (): string | null => {
    if (fullName.trim().length < 2) return 'Please enter your full name.';
    if (!email.includes('@')) return 'Please enter a valid email address.';
    if (phone.trim().length < 6) return 'Please enter a valid phone number.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    const { error: err } = await signUp(email, password, fullName.trim(), phone.trim());
    setSubmitting(false);
    if (err) {
      setError(err);
      show('Registration failed. Please try again.', 'error');
    } else {
      show('Account created. Welcome to ZOVIA!', 'success');
      navigate('/', { replace: true });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-plum-500">Join ZOVIA</h1>
          <p className="mt-2 text-sm text-plum-400">Create your account to start shopping</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-field">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-plum-300" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Zannatul Ferdous"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label-field">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-plum-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label-field">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-plum-300" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1700 000000"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label-field">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-plum-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="input-field pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-plum-300 hover:text-plum-500"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label-field">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-plum-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="input-field pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-berry-50 border border-berry-200 px-4 py-3 text-sm text-berry-600">
                {error}
              </div>
            )}

            <div className="rounded-xl bg-blush-50/70 border border-plum-100/50 px-4 py-3">
              <p className="text-xs text-plum-400 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-berry-500 shrink-0 mt-0.5" />
                By creating an account, you agree to ZOVIA's terms and privacy policy. Your data is protected and never shared.
              </p>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5 shadow-soft hover:shadow-card">
              {submitting ? <Spinner size="sm" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-plum-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-berry-600 hover:text-berry-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
