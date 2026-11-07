import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CartItem } from '@/types';

const STORAGE_KEY = 'zovia_cart';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addToCart: (item: CartItem) => void;
  updateQuantity: (productId: string, size: string | null, color: string | null, quantity: number) => void;
  removeFromCart: (productId: string, size: string | null, color: string | null) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function itemKey(productId: string, size: string | null, color: string | null) {
  return `${productId}__${size ?? ''}__${color ?? ''}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart: CartContextValue['addToCart'] = (item) => {
    if (item.stock <= 0 || item.quantity <= 0) return;
    setItems((prev) => {
      const key = itemKey(item.product_id, item.size, item.color);
      const existing = prev.find((p) => itemKey(p.product_id, p.size, p.color) === key);
      if (existing) {
        const newQty = Math.min(existing.quantity + Math.max(1, item.quantity), item.stock);
        return prev.map((p) =>
          itemKey(p.product_id, p.size, p.color) === key ? { ...p, quantity: newQty } : p,
        );
      }
      const validQty = Math.min(Math.max(1, item.quantity), item.stock);
      return [...prev, { ...item, quantity: validQty }];
    });
  };

  const updateQuantity: CartContextValue['updateQuantity'] = (productId, size, color, quantity) => {
    setItems((prev) =>
      prev
        .map((p) => {
          if (itemKey(p.product_id, p.size, p.color) === itemKey(productId, size, color)) {
            return { ...p, quantity: Math.min(Math.max(1, quantity), p.stock) };
          }
          return p;
        })
        .filter((p) => p.quantity > 0),
    );
  };

  const removeFromCart: CartContextValue['removeFromCart'] = (productId, size, color) => {
    setItems((prev) => prev.filter((p) => itemKey(p.product_id, p.size, p.color) !== itemKey(productId, size, color)));
  };

  const clearCart = () => setItems([]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, itemCount, subtotal, addToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
