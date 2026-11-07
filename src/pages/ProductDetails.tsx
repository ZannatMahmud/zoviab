import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Minus, Plus, Check, Truck, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';
import { formatBDT, DELIVERY_FEE } from '@/lib/format';
import { getColorSwatch } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import Spinner from '@/components/common/Spinner';
import ProductCard from '@/components/shop/ProductCard';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { show } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('id', id)
        .maybeSingle();

      const prod = data as Product | null;
      setProduct(prod);

      if (prod) {
        setSelectedSize(prod.sizes?.[0] ?? null);
        setSelectedColor(prod.colors?.[0] ?? null);

        if (prod.category_id) {
          const { data: relData } = await supabase
            .from('products')
            .select('*, category:categories(*)')
            .eq('category_id', prod.category_id)
            .neq('id', id)
            .limit(4);
          setRelated((relData as Product[]) ?? []);
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    if (product.stock <= 0) return;
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_urls?.[0] ?? null,
      size: selectedSize,
      color: selectedColor,
      quantity,
      stock: product.stock,
    });
    show(`${product.name} added to cart`, 'success');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl text-plum-500 mb-4">Product not found</h1>
        <Link to="/shop" className="btn-primary">Back to Shop</Link>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;
  const images = product.image_urls ?? [];

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      {/* Breadcrumb */}
      <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-medium text-plum-400 hover:text-berry-500 transition-colors mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to Shop
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-blush-50">
            {images[activeImage] ? (
              <img src={images[activeImage]} alt={product.name} className="h-full w-full object-cover animate-fade-in" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag className="h-16 w-16 text-lavender-300" />
              </div>
            )}
            {product.featured && (
              <span className="absolute left-4 top-4 badge bg-gold-400 text-white">Featured</span>
            )}
            {outOfStock && (
              <span className="absolute left-4 top-4 badge bg-plum-500 text-white">Out of Stock</span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`shrink-0 h-24 w-20 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImage === i ? 'border-berry-500' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${product.name} view ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {product.category && (
            <Link to={`/shop?category=${product.category.id}`} className="section-eyebrow mb-2 inline-block w-fit">
              {product.category.name}
            </Link>
          )}
          <h1 className="font-display text-3xl sm:text-4xl text-plum-500 leading-tight">{product.name}</h1>
          <p className="mt-4 font-display text-3xl font-bold text-berry-600 tracking-tight">{formatBDT(product.price)}</p>

          {product.description && (
            <p className="mt-6 text-plum-400 leading-relaxed text-base">{product.description}</p>
          )}

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mt-8">
              <p className="label-field">Select Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[3.25rem] rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                      selectedSize === size
                        ? 'border-berry-500 bg-berry-50 text-berry-700 shadow-soft'
                        : 'border-plum-200 text-plum-400 hover:border-berry-300 hover:bg-blush-50/40'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          {product.colors && product.colors.length > 0 && (
            <div className="mt-6">
              <p className="label-field">Colour {selectedColor && <span className="font-normal normal-case text-plum-400">— {selectedColor}</span>}</p>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-all ${
                      selectedColor === color
                        ? 'border-berry-500 bg-berry-50 font-semibold text-plum-600 shadow-soft'
                        : 'border-plum-200 text-plum-400 hover:border-berry-300 hover:bg-blush-50/40'
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-plum-200 shadow-sm"
                      style={{ backgroundColor: getColorSwatch(color) }}
                    />
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + stock */}
          <div className="mt-8 flex items-center gap-6">
            <div>
              <p className="label-field">Quantity</p>
              <div className="flex items-center gap-1 rounded-xl border border-plum-200 bg-white p-1 shadow-soft">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-plum-500 hover:bg-blush-50 transition-colors disabled:opacity-30"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold text-plum-500">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-plum-500 hover:bg-blush-50 transition-colors disabled:opacity-30"
                  disabled={quantity >= product.stock}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="pt-6">
              {outOfStock ? (
                <span className="badge bg-plum-100 text-plum-500">Out of Stock</span>
              ) : product.stock <= 5 ? (
                <span className="badge bg-coral-100 text-coral-700 border border-coral-200/60">Only {product.stock} left in stock</span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200/60">
                  <Check className="h-4 w-4" /> In Stock
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="btn-primary flex-1 py-3.5 shadow-soft hover:shadow-card"
            >
              <ShoppingBag className="h-5 w-5" />
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={outOfStock}
              className="btn-secondary flex-1 py-3.5"
            >
              Buy Now
            </button>
          </div>

          {/* Trust */}
          <div className="mt-10 grid grid-cols-2 gap-4 rounded-2xl bg-gradient-to-r from-blush-50/80 via-ivory to-lavender-100/40 border border-plum-100/60 p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-berry-50 text-berry-500">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-plum-500">Fast Delivery</p>
                <p className="text-xs text-plum-400">{formatBDT(DELIVERY_FEE)} across Bangladesh</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-berry-50 text-berry-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-plum-500">Cash on Delivery</p>
                <p className="text-xs text-plum-400">Pay safely upon arrival</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl text-plum-500 mb-8">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
