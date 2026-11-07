import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Search, Menu, X, LogOut, LayoutDashboard, Heart } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { itemCount } = useCart();
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-ivory/90 backdrop-blur-md border-b border-plum-100/60">
      {/* Announcement bar */}
      <div className="bg-berry-500 text-white text-center text-xs py-2 px-4 font-medium tracking-wide">
        Free delivery on orders over ৳3,000 — Cash on Delivery available across Bangladesh
      </div>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          {/* Mobile menu button */}
          <button
            className="lg:hidden text-plum-500 hover:text-berry-500 transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Logo size="lg" />

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `text-sm font-semibold tracking-wide transition-colors relative py-1 ${
                    isActive ? 'text-berry-500' : 'text-plum-500 hover:text-berry-500'
                  } after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-berry-500 after:transition-all after:duration-300 ${
                    isActive ? 'after:w-full' : 'after:w-0 hover:after:w-full'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setSearchOpen((s) => !s)}
              className="text-plum-500 hover:text-berry-500 transition-colors p-1.5"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <Link
              to={profile ? '/account' : '/login'}
              className="text-plum-500 hover:text-berry-500 transition-colors p-1.5 hidden sm:block"
              aria-label="Account"
            >
              <User className="h-5 w-5" />
            </Link>

            {role === 'admin' && (
              <Link
                to="/admin"
                className="hidden sm:flex text-plum-500 hover:text-berry-500 transition-colors p-1.5"
                aria-label="Admin dashboard"
              >
                <LayoutDashboard className="h-5 w-5" />
              </Link>
            )}

            {profile ? (
              <button
                onClick={() => signOut()}
                className="hidden sm:flex text-plum-500 hover:text-berry-500 transition-colors p-1.5"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            ) : null}

            <Link
              to="/cart"
              className="relative text-plum-500 hover:text-berry-500 transition-colors p-1.5"
              aria-label="Shopping cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-berry-500 px-1 text-[10px] font-bold text-white animate-scale-in">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search bar dropdown */}
        {searchOpen && (
          <div className="animate-slide-down pb-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for dresses, handbags, accessories..."
                className="input-field"
                autoFocus
              />
              <button type="submit" className="btn-primary shrink-0">
                <Search className="h-4 w-4" />
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-plum-500/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 h-full w-72 max-w-[85%] bg-ivory shadow-float lg:hidden animate-slide-down">
            <div className="flex items-center justify-between p-5 border-b border-plum-100">
              <Logo size="md" />
              <button onClick={() => setMobileOpen(false)} className="text-plum-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col p-4 gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      isActive ? 'bg-berry-50 text-berry-500' : 'text-plum-500 hover:bg-blush-50'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="my-3 h-px bg-plum-100" />
              {profile ? (
                <>
                  <Link
                    to="/account"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-plum-500 hover:bg-blush-50"
                  >
                    <User className="h-4 w-4" />
                    My Account
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-plum-500 hover:bg-blush-50"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    My Orders
                  </Link>
                  {role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-berry-600 hover:bg-berry-50"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-plum-500 hover:bg-blush-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-plum-500 hover:bg-blush-50"
                  >
                    <User className="h-4 w-4" />
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-plum-500 hover:bg-blush-50"
                  >
                    <Heart className="h-4 w-4" />
                    Create Account
                  </Link>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
