export type UserRole = 'customer' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export type ProductSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'Free Size';

export type ProductStatus = 'active' | 'inactive' | 'draft' | 'archived';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  sizes: ProductSize[] | null;
  colors: string[] | null;
  image_urls: string[] | null;
  category_id: string | null;
  featured: boolean;
  status?: ProductStatus;
  created_at: string;
  category?: Category;
}

export interface Address {
  id: string;
  user_id: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string;
  district: string;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
export type PaymentMethod = 'Cash on Delivery';

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  address_snapshot: {
    recipient_name: string;
    phone: string;
    address_line: string;
    city: string;
    district: string;
    postal_code: string | null;
  };
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  created_at: string;
  order_items?: OrderItem[];
  profile?: Profile;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unit_price: number;
  line_total?: number;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  image: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  stock: number;
}
