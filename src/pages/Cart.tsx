import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatBDT, DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '@/lib/format';

export default function Cart() {
  const { items, subtotal, updateQuantity, removeFromCart, itemCount } = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0 ? 0 : DELIVERY_FEE;
  const total = subtotal + deliveryFee;
  const remainingForFree = FREE_DELIVERY_THRESHOLD - subtotal;

  const handleCheckout = () => {
    if (!session) {
      navigate('/login', { state: { from: '/checkout' } });
    } else {
      navigate('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blush-50 mx-auto mb-6">
          <ShoppingBag className="h-10 w-10 text-berry-300" />
        </div>
        <h1 className="font-display text-3xl text-plum-500">Your Cart is Empty</h1>
        <p className="mt-3 text-plum-400">Discover our collection and find something you love.</p>
        <Link to="/shop" className="mt-8 btn-primary">
          Start Shopping <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <h1 className="font-display text-3xl sm:text-4xl text-plum-500 mb-2">Shopping Cart</h1>
      <p className="text-plum-400 mb-10">{itemCount} item{itemCount !== 1 ? 's' : ''} in your cart</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={`${item.product_id}-${item.size ?? ''}-${item.color ?? ''}`}
              className="card flex gap-4 p-5 hover:shadow-card transition-shadow"
            >
              <Link to={`/product/${item.product_id}`} className="shrink-0">
                <div className="h-28 w-24 sm:h-32 sm:w-28 overflow-hidden rounded-xl bg-blush-50 shadow-soft">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-lavender-300" />
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/product/${item.product_id}`}>
                      <h3 className="font-display text-base text-plum-500 hover:text-berry-500 transition-colors">{item.name}</h3>
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {item.size && <span className="text-xs text-plum-400 bg-blush-50 px-2 py-0.5 rounded-md">Size: {item.size}</span>}
                      {item.color && <span className="text-xs text-plum-400 bg-blush-50 px-2 py-0.5 rounded-md">Colour: {item.color}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product_id, item.size, item.color)}
                    className="text-plum-300 hover:text-berry-500 transition-colors p-1"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto flex items-end justify-between pt-3">
                  <div className="flex items-center gap-1 rounded-xl border border-plum-200 bg-white p-1 shadow-soft">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.size, item.color, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-plum-500 hover:bg-blush-50 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-plum-500">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.size, item.color, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-plum-500 hover:bg-blush-50 transition-colors disabled:opacity-30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="font-semibold text-berry-600 text-base">{formatBDT(item.price * item.quantity)}</p>
                </div>
              </div>
            </div>
          ))}

          <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-medium text-plum-400 hover:text-berry-500 transition-colors pt-2">
            <ArrowRight className="h-4 w-4 rotate-180" /> Continue shopping
          </Link>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 card p-6">
            <h2 className="font-display text-xl text-plum-500 mb-6">Order Summary</h2>

            {remainingForFree > 0 && (
              <div className="mb-5 rounded-xl bg-lavender-100/70 border border-lavender-200/50 px-4 py-3 flex items-center gap-2 text-xs text-plum-500">
                <Truck className="h-4 w-4 text-lavender-600 shrink-0" />
                Add {formatBDT(remainingForFree)} more for free delivery!
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-plum-400">Subtotal</span>
                <span className="font-semibold text-plum-500">{formatBDT(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-plum-400">Delivery Fee</span>
                <span className="font-semibold text-plum-500">
                  {deliveryFee === 0 ? <span className="text-green-600 font-semibold">Free</span> : formatBDT(deliveryFee)}
                </span>
              </div>
              <div className="border-t border-plum-100 pt-3 flex justify-between items-baseline">
                <span className="font-display text-base text-plum-500">Total</span>
                <span className="font-display text-2xl text-berry-600 font-bold">{formatBDT(total)}</span>
              </div>
            </div>

            <button onClick={handleCheckout} className="btn-primary w-full mt-6 shadow-soft hover:shadow-card">
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </button>

            <div className="mt-4 text-center text-xs text-plum-300">
              Cash on Delivery available
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
