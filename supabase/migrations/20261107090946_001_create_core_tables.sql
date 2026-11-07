/*
# ZOVIA — Create core tables for fashion e-commerce

## Plain-English summary
This migration sets up the complete database for ZOVIA, a fashion e-commerce store
serving Bangladesh. It creates six tables that store categories, products, customer
profiles, shipping addresses, orders, and the individual items inside each order.
All tables are protected with Row Level Security so customers can only see and edit
their own data, and only admins can manage products, categories, and all orders.

## New Tables
1. **categories** — Product categories (dresses, handbags, shoes, etc.)
2. **products** — Every item for sale, with price in BDT, stock, sizes, colors, images
3. **profiles** — Customer and admin profiles (linked to Supabase auth.users)
4. **addresses** — Saved shipping addresses per customer
5. **orders** — Placed orders with status and Cash on Delivery
6. **order_items** — Individual products within an order (price snapshotted)

## Security (RLS + Grants)
- categories & products: public read (anon + authenticated), admin-only write
- profiles: users read/update only their own; role column protected
- addresses: users CRUD only their own
- orders: users read their own, admins read all + update status; no deletes
- order_items: read via order ownership; insert via place_order() function
- is_admin() SECURITY DEFINER function checks role safely
- handle_new_user() trigger auto-creates profile on sign-up with role='customer'
- place_order() atomically creates order + items with sequential order number

## Important Notes
1. The `role` column on profiles is the security boundary. Defaults to 'customer'.
2. Order address and item prices are snapshotted so past orders stay accurate.
3. Products are publicly readable without sign-in.
4. The first admin is created by manually setting a profile's role to 'admin'.
*/

-- ============================================================
-- 1. CATEGORIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. PRODUCTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sizes text[],
  colors text[],
  image_urls text[],
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured) WHERE featured = true;

-- ============================================================
-- 3. PROFILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. ADDRESSES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  phone text NOT NULL,
  address_line text NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  postal_code text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);

-- ============================================================
-- 5. ORDERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  address_snapshot jsonb NOT NULL,
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  delivery_fee numeric NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total numeric NOT NULL CHECK (total >= 0),
  payment_method text NOT NULL DEFAULT 'Cash on Delivery',
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Confirmed','Shipped','Delivered','Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ============================================================
-- 6. ORDER_ITEMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text,
  size text,
  color text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- ============================================================
-- HELPER FUNCTIONS (after all tables exist)
-- ============================================================

-- is_admin(): safely checks if current user has admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- handle_new_user(): trigger to auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Customer'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

-- place_order(): atomically create an order with items
CREATE OR REPLACE FUNCTION public.place_order(
  p_address_snapshot jsonb,
  p_items jsonb,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_item jsonb;
  v_order_number text;
  v_count integer;
BEGIN
  SELECT count(*) + 1 INTO v_count FROM public.orders
    WHERE EXTRACT(year FROM created_at) = EXTRACT(year FROM now());
  v_order_number := 'ZV-' || EXTRACT(year FROM now())::text || '-' || lpad(v_count::text, 4, '0');

  INSERT INTO public.orders (
    order_number, user_id, address_snapshot,
    subtotal, delivery_fee, total,
    payment_method, status
  )
  VALUES (
    v_order_number, auth.uid(), p_address_snapshot,
    p_subtotal, p_delivery_fee, p_total,
    'Cash on Delivery', 'Pending'
  )
  RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id, product_id, product_name, product_image,
      size, color, quantity, unit_price
    )
    VALUES (
      v_order.id,
      NULLIF(v_item->>'product_id', '')::uuid,
      v_item->>'product_name',
      NULLIF(v_item->>'product_image', ''),
      NULLIF(v_item->>'size', ''),
      NULLIF(v_item->>'color', ''),
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric
    );
  END LOOP;

  RETURN v_order;
END;
$$;

-- Revoke execute on security functions from public/anon
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.place_order(p_address_snapshot jsonb, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_total numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(p_address_snapshot jsonb, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_total numeric) TO authenticated;

-- ============================================================
-- TRIGGER: Auto-create profile on new auth user sign-up
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS: CATEGORIES
-- ============================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;

DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories"
  ON public.categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_categories" ON public.categories;
CREATE POLICY "admin_insert_categories"
  ON public.categories FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_categories" ON public.categories;
CREATE POLICY "admin_update_categories"
  ON public.categories FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_categories" ON public.categories;
CREATE POLICY "admin_delete_categories"
  ON public.categories FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- RLS: PRODUCTS
-- ============================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;

DROP POLICY IF EXISTS "public_read_products" ON public.products;
CREATE POLICY "public_read_products"
  ON public.products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_products" ON public.products;
CREATE POLICY "admin_insert_products"
  ON public.products FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_products" ON public.products;
CREATE POLICY "admin_update_products"
  ON public.products FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_products" ON public.products;
CREATE POLICY "admin_delete_products"
  ON public.products FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- RLS: PROFILES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
CREATE POLICY "users_read_own_profile"
  ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- Users can update their own profile but CANNOT change their role
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));

-- ============================================================
-- RLS: ADDRESSES
-- ============================================================

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;

DROP POLICY IF EXISTS "users_read_own_addresses" ON public.addresses;
CREATE POLICY "users_read_own_addresses"
  ON public.addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_addresses" ON public.addresses;
CREATE POLICY "users_insert_own_addresses"
  ON public.addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_addresses" ON public.addresses;
CREATE POLICY "users_update_own_addresses"
  ON public.addresses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_delete_own_addresses" ON public.addresses;
CREATE POLICY "users_delete_own_addresses"
  ON public.addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- RLS: ORDERS
-- ============================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

DROP POLICY IF EXISTS "users_read_own_orders" ON public.orders;
CREATE POLICY "users_read_own_orders"
  ON public.orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "users_insert_own_orders" ON public.orders;
CREATE POLICY "users_insert_own_orders"
  ON public.orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_update_orders" ON public.orders;
CREATE POLICY "admin_update_orders"
  ON public.orders FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- RLS: ORDER_ITEMS
-- ============================================================

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.order_items TO authenticated;

DROP POLICY IF EXISTS "users_read_own_order_items" ON public.order_items;
CREATE POLICY "users_read_own_order_items"
  ON public.order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "users_insert_own_order_items" ON public.order_items;
CREATE POLICY "users_insert_own_order_items"
  ON public.order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
