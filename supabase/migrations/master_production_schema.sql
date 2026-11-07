-- ============================================================================
-- ZOVIA: MASTER PRODUCTION DATABASE SCHEMA & SEED DATA
-- Fully idempotent: Safe to execute on a brand new or existing Supabase project.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. CORE TABLES
-- ----------------------------------------------------------------------------

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Products
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
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured) WHERE featured = true;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Addresses
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

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address_snapshot jsonb NOT NULL,
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  delivery_fee numeric NOT NULL DEFAULT 80 CHECK (delivery_fee >= 0),
  total numeric NOT NULL CHECK (total >= 0),
  payment_method text NOT NULL DEFAULT 'Cash on Delivery' CHECK (payment_method = 'Cash on Delivery'),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Confirmed','Shipped','Delivered','Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Order Items
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

-- ----------------------------------------------------------------------------
-- 2. SECURITY DEFINER FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

-- Check admin privileges
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

-- Auto-create profile on auth sign up
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic Checkout RPC Function
DROP FUNCTION IF EXISTS public.place_order(jsonb, jsonb, numeric, numeric, numeric);
DROP FUNCTION IF EXISTS public.place_order(jsonb, jsonb, numeric, numeric, numeric, text);

CREATE OR REPLACE FUNCTION public.place_order(
  p_address_snapshot jsonb,
  p_items jsonb,
  p_subtotal numeric DEFAULT NULL,
  p_delivery_fee numeric DEFAULT NULL,
  p_total numeric DEFAULT NULL,
  p_payment_method text DEFAULT 'Cash on Delivery'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_order record;
  v_item jsonb;
  v_agg record;
  v_product record;
  v_quantity integer;
  v_unit_price numeric;
  v_server_subtotal numeric := 0;
  v_standard_delivery_fee numeric := 80;
  v_free_delivery_threshold numeric := 3000;
  v_server_delivery_fee numeric := 80;
  v_server_total numeric := 0;
  v_order_number text;
  v_count integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Please log in to place an order.';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot place order: Cart is empty.';
  END IF;

  -- 1. Lock rows and decrement inventory
  FOR v_agg IN 
    SELECT 
      (item->>'product_id')::uuid AS product_id,
      SUM((item->>'quantity')::integer) AS total_quantity
    FROM jsonb_array_elements(p_items) AS item
    GROUP BY (item->>'product_id')::uuid
    ORDER BY (item->>'product_id')::uuid ASC
  LOOP
    SELECT id, name, price, stock
    INTO v_product
    FROM public.products
    WHERE id = v_agg.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID "%" does not exist.', v_agg.product_id;
    END IF;

    IF v_product.stock < v_agg.total_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Available: %', v_product.name, v_product.stock;
    END IF;

    UPDATE public.products
    SET stock = stock - v_agg.total_quantity
    WHERE id = v_agg.product_id;
  END LOOP;

  -- 2. Calculate authoritative server totals
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT price INTO v_unit_price
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid;

    v_quantity := (v_item->>'quantity')::integer;
    v_server_subtotal := v_server_subtotal + (v_unit_price * v_quantity);
  END LOOP;

  IF v_server_subtotal >= v_free_delivery_threshold THEN
    v_server_delivery_fee := 0;
  ELSE
    v_server_delivery_fee := v_standard_delivery_fee;
  END IF;

  v_server_total := v_server_subtotal + v_server_delivery_fee;

  -- 3. Order number sequence
  SELECT count(*) + 1 INTO v_count FROM public.orders
    WHERE EXTRACT(year FROM created_at) = EXTRACT(year FROM now());
  v_order_number := 'ZV-' || EXTRACT(year FROM now())::text || '-' || lpad(v_count::text, 4, '0');

  -- 4. Create Order
  INSERT INTO public.orders (
    order_number, user_id, address_snapshot,
    subtotal, delivery_fee, total,
    payment_method, status
  )
  VALUES (
    v_order_number, v_user_id, p_address_snapshot,
    v_server_subtotal, v_server_delivery_fee, v_server_total,
    'Cash on Delivery', 'Pending'
  )
  RETURNING * INTO v_order;

  -- 5. Insert Items
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

  RETURN to_jsonb(v_order);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, numeric, numeric, numeric, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. ROW-LEVEL SECURITY POLICIES (RLS)
-- ----------------------------------------------------------------------------

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO authenticated;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO authenticated;

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.addresses TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.order_items TO authenticated;

-- Categories RLS
DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_manage_categories" ON public.categories;
CREATE POLICY "admin_manage_categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Products RLS
DROP POLICY IF EXISTS "public_read_products" ON public.products;
CREATE POLICY "public_read_products" ON public.products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_manage_products" ON public.products;
CREATE POLICY "admin_manage_products" ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Profiles RLS
DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
CREATE POLICY "users_read_own_profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.profiles;
CREATE POLICY "admin_read_all_profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());

-- Addresses RLS
DROP POLICY IF EXISTS "users_manage_own_addresses" ON public.addresses;
CREATE POLICY "users_manage_own_addresses" ON public.addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Orders RLS
DROP POLICY IF EXISTS "users_read_own_orders" ON public.orders;
CREATE POLICY "users_read_own_orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_manage_all_orders" ON public.orders;
CREATE POLICY "admin_manage_all_orders" ON public.orders FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Order Items RLS
DROP POLICY IF EXISTS "users_read_own_order_items" ON public.order_items;
CREATE POLICY "users_read_own_order_items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

DROP POLICY IF EXISTS "admin_read_all_order_items" ON public.order_items;
CREATE POLICY "admin_read_all_order_items" ON public.order_items FOR ALL TO authenticated USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. SEED DATA: CATEGORIES & SAMPLE PRODUCTS
-- ----------------------------------------------------------------------------

INSERT INTO public.categories (id, name, description, image_url) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Long Dresses', 'Elegant flowing long dresses for graceful occasions.', 'https://images.pexels.com/photos/27133206/pexels-photo-27133206.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111102', 'Midi Dresses', 'Sophisticated midi-length dresses that blend comfort and style.', 'https://images.pexels.com/photos/17901631/pexels-photo-17901631.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111103', 'Tunics & Blouses', 'Tasteful blouses and long tunics for everyday elegance.', 'https://images.pexels.com/photos/10686399/pexels-photo-10686399.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111104', 'Two-Piece Sets', 'Coordinated two-piece outfits that make styling effortless.', 'https://images.pexels.com/photos/28168157/pexels-photo-28168157.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111105', 'Wide-Leg Trousers', 'Contemporary wide-leg trousers for a polished silhouette.', 'https://images.pexels.com/photos/31400265/pexels-photo-31400265.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111106', 'Handbags', 'Curated handbags to complete your look.', 'https://images.pexels.com/photos/27954772/pexels-photo-27954772.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111107', 'Shoes', 'Elegant footwear from heels to flats.', 'https://images.pexels.com/photos/17826424/pexels-photo-17826424.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'),
  ('11111111-1111-1111-1111-111111111108', 'Scarves & Accessories', 'Silk scarves and finishing touches for every outfit.', 'https://images.pexels.com/photos/29057421/pexels-photo-29057421.jpeg?auto=compress&cs=tinysrgb&h=650&w=940')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.products (name, description, price, stock, sizes, colors, image_urls, category_id, featured) VALUES
  ('Rose Bloom Long Dress', 'A flowing rose-pink long dress with delicate pleating and a flattering waist tie. Perfect for festive gatherings and elegant evenings.', 2890, 15, ARRAY['S','M','L','XL'], ARRAY['Rose','Beige'], ARRAY['https://images.pexels.com/photos/27133206/pexels-photo-27133206.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111101', true),
  ('Ivory Elegance Gown', 'A timeless ivory long dress with a classic silhouette. Soft fabric and graceful cut make it a wardrobe essential for special occasions.', 3290, 8, ARRAY['XS','S','M','L'], ARRAY['Ivory','White'], ARRAY['https://images.pexels.com/photos/27560852/pexels-photo-27560852.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111101', true),
  ('Sage Tiered Midi Dress', 'Breezy sage green tiered midi dress designed for casual outings and weekend lunches. Soft, lightweight, and effortlessly chic.', 2190, 20, ARRAY['S','M','L'], ARRAY['Sage','Olive'], ARRAY['https://images.pexels.com/photos/17901631/pexels-photo-17901631.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111102', true),
  ('Plum Wrap Midi Dress', 'Sophisticated plum wrap dress with a V-neckline and tie waist. Transitions smoothly from daywear to evening dinner.', 2490, 12, ARRAY['M','L','XL'], ARRAY['Plum','Burgundy'], ARRAY['https://images.pexels.com/photos/17805179/pexels-photo-17805179.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111102', false),
  ('Embroidered White Tunic', 'Crisp white tunic blouse featuring subtle tonal embroidery along the neckline and cuffs. Pairs beautifully with trousers or palazzos.', 1790, 25, ARRAY['S','M','L','XL','XXL'], ARRAY['White','Off-White'], ARRAY['https://images.pexels.com/photos/10686399/pexels-photo-10686399.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111103', false),
  ('Dusty Rose Silk Blouse', 'Luxurious silk-blend blouse in dusty rose with mother-of-pearl buttons. Refined elegance for work and intimate get-togethers.', 2090, 10, ARRAY['XS','S','M','L'], ARRAY['Dusty Rose','Blush'], ARRAY['https://images.pexels.com/photos/8350172/pexels-photo-8350172.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111103', true),
  ('Olive Linen Co-ord Set', 'Two-piece relaxed-fit linen set in earthy olive green. Includes a loose-fit tunic and matching wide trousers.', 3590, 14, ARRAY['S','M','L','XL'], ARRAY['Olive','Khaki'], ARRAY['https://images.pexels.com/photos/28168157/pexels-photo-28168157.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111104', true),
  ('Sky Blue Cotton Suit', 'Breathable two-piece cotton set in soft sky blue. Tailored top with comfortable matching bottoms.', 2990, 18, ARRAY['S','M','L','XL'], ARRAY['Sky Blue'], ARRAY['https://images.pexels.com/photos/28168159/pexels-photo-28168159.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111104', false),
  ('Sand Pleated Wide Trousers', 'High-waisted pleated wide-leg trousers in sand beige. Tailored with care for a modern modest silhouette.', 1890, 22, ARRAY['26','28','30','32','34'], ARRAY['Sand','Beige','Camel'], ARRAY['https://images.pexels.com/photos/31400265/pexels-photo-31400265.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111105', false),
  ('Terracotta Shoulder Bag', 'Structured faux-leather shoulder bag in warm terracotta with gold-tone hardware and comfortable strap.', 2290, 16, ARRAY['One Size'], ARRAY['Terracotta','Brown'], ARRAY['https://images.pexels.com/photos/27954772/pexels-photo-27954772.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111106', true),
  ('Nude Block Heel Mules', 'Comfortable 2-inch block heel mules in nude leather. Versatile enough to match both traditional and contemporary outfits.', 2390, 12, ARRAY['36','37','38','39','40'], ARRAY['Nude','Beige'], ARRAY['https://images.pexels.com/photos/17826424/pexels-photo-17826424.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111107', false),
  ('Floral Silk Blend Scarf', 'Generously sized silk-blend scarf featuring an artistic botanical print. Drape over the shoulders or wear as a headscarf.', 990, 30, ARRAY['One Size'], ARRAY['Multi Floral','Soft Rose'], ARRAY['https://images.pexels.com/photos/29057421/pexels-photo-29057421.jpeg?auto=compress&cs=tinysrgb&h=900&w=600'], '11111111-1111-1111-1111-111111111108', true)
ON CONFLICT DO NOTHING;
