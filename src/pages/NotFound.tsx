import { Link } from 'react-router-dom';
import { Compass, ArrowRight } from 'lucide-react';
import CreatorSignature from '@/components/brand/CreatorSignature';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blush-50 mx-auto mb-6 shadow-soft">
          <Compass className="h-12 w-12 text-berry-500 animate-spin-slow" />
        </div>
        
        <p className="section-eyebrow mb-2">Page Not Found</p>
        <h1 className="font-display text-4xl sm:text-5xl text-plum-500 font-bold mb-4">
          Lost in Style?
        </h1>
        <p className="text-plum-400 text-sm sm:text-base leading-relaxed mb-8">
          The page you are looking for might have been moved, renamed, or is temporarily unavailable. Let us guide you back to our collection.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link to="/" className="btn-primary shadow-soft hover:shadow-card">
            Back to Home
          </Link>
          <Link to="/shop" className="btn-secondary">
            Explore Shop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="border-t border-plum-100/60 pt-6">
          <CreatorSignature size="sm" variant="dark" />
        </div>
      </div>
    </div>
  );
}
