import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import type { Product } from '@/types';
import { formatBDT } from '@/lib/format';
import { getPrimaryImage } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { show } = useToast();
  const image = getPrimaryImage(product);
  const outOfStock = product.stock <= 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (outOfStock) return;
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image,
      size: null,
      color: null,
      quantity: 1,
      stock: product.stock,
    });
    show(`${product.name} added to cart`, 'success');
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex flex-col"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-blush-50 shadow-soft transition-all duration-300 group-hover:shadow-card">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-lavender-100">
            <ShoppingBag className="h-12 w-12 text-lavender-400" />
          </div>
        )}

        {product.featured && (
          <span className="absolute left-3 top-3 badge bg-gold-400 text-white shadow-soft">Featured</span>
        )}
        {outOfStock && (
          <span className="absolute left-3 top-3 badge bg-plum-500 text-white shadow-soft">Out of Stock</span>
        )}
        {!outOfStock && product.stock <= 5 && (
          <span className="absolute left-3 top-3 badge bg-coral-400 text-white shadow-soft">Only {product.stock} left</span>
        )}

        {/* Quick add button */}
        {!outOfStock && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-plum-500 shadow-soft opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-berry-500 hover:text-white"
            aria-label={`Quick add ${product.name}`}
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-1">
        {product.category && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-berry-500">
            {product.category.name}
          </span>
        )}
        <h3 className="font-display text-base font-medium text-plum-500 leading-snug group-hover:text-berry-500 transition-colors line-clamp-1">
          {product.name}
        </h3>
        <p className="text-base font-semibold text-berry-600 tracking-tight">{formatBDT(product.price)}</p>
      </div>
    </Link>
  );
}
