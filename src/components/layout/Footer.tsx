import { Link } from 'react-router-dom';
import { Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import CreatorSignature from '@/components/brand/CreatorSignature';

export default function Footer() {
  return (
    <footer className="mt-auto bg-plum-500 text-white/80">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex flex-col gap-4">
              <Logo size="lg" variant="light" asLink={false} />
              <p className="font-display text-lg italic text-white/90">Fashion that feels like you.</p>
              <p className="text-sm leading-relaxed text-white/60 max-w-xs">
                A Bangladeshi fashion, clothing and lifestyle boutique. Elegant, wearable and youthful designs for the modern woman.
              </p>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white mb-5">Shop</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/shop" className="hover:text-gold-300 transition-colors">All Products</Link></li>
              <li><Link to="/categories" className="hover:text-gold-300 transition-colors">Categories</Link></li>
              <li><Link to="/shop?featured=true" className="hover:text-gold-300 transition-colors">Featured</Link></li>
              <li><Link to="/about" className="hover:text-gold-300 transition-colors">Our Story</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white mb-5">Account</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/login" className="hover:text-gold-300 transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-gold-300 transition-colors">Create Account</Link></li>
              <li><Link to="/cart" className="hover:text-gold-300 transition-colors">Shopping Cart</Link></li>
              <li><Link to="/orders" className="hover:text-gold-300 transition-colors">Order History</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white mb-5">Get in Touch</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-gold-300 shrink-0" />
                <span>Gulshan, Dhaka 1212, Bangladesh</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gold-300 shrink-0" />
                <span>+880 1700 000000</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gold-300 shrink-0" />
                <span>hello@zovia.com.bd</span>
              </li>
            </ul>
            <div className="flex gap-3 mt-5">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-gold-400 hover:text-plum-500 transition-all" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-gold-400 hover:text-plum-500 transition-all" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs text-white/50 text-center md:text-left">
            © {new Date().getFullYear()} ZOVIA. All rights reserved. Designed &amp; crafted in Dhaka, Bangladesh.
          </p>
          <CreatorSignature size="sm" variant="light" />
        </div>
      </div>
    </footer>
  );
}
