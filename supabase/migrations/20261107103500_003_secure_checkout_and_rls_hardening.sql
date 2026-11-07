-- ============================================================================
-- ZOVIA: PRODUCTION-HARDENED DATABASE MIGRATION (FINAL PRODUCTION REVISION)
-- Concurrency-Safe Checkout, Genuinely Monotonic Sequence Reconciliation,
-- Dynamic Row-Level Order Immutability, Strict Status Enforcement,
-- Single-Restoration Stock Cancel, Universal RLS Cleanup & Non-Recursive Admin Triggers
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & MONOTONIC CONCURRENCY-SAFE ORDER SEQUENCE
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create sequence if not present (starts at 1001 for clean 6-digit formatting)
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1001;

-- Concurrency-safe sequence reconciliation:
-- 1. Pause in-flight checkouts by revoking execute on the legacy place_order function.
-- 2. Acquire ACCESS EXCLUSIVE lock on public.orders so all active checkout transactions
--    must finish before reconciliation begins, and no new orders can be inserted.
--    (Note: Sequences do NOT support LOCK TABLE in PostgreSQL; locking orders and revoking
--    the checkout function provides guaranteed checkout coordination).
-- 3. Parse existing order numbers strictly without silently swallowing formatting errors.
-- 4. Advance sequence strictly ahead of both current sequence state and all existing orders.
DO $$
DECLARE
  v_seq_last_val bigint;
  v_is_called boolean;
  v_next_seq_val bigint;
  v_max_order_val bigint := 0;
  v_required_min_next bigint;
  v_final_next_val bigint;
  v_rec record;
  v_order_num_part bigint;
BEGIN
  -- A. Temporarily revoke execute on legacy place_order to prevent concurrent checkouts
  BEGIN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated';
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  -- B. Acquire ACCESS EXCLUSIVE lock on public.orders
  -- Waits for in-flight checkouts to finish and blocks any new order inserts during reconciliation
  LOCK TABLE public.orders IN ACCESS EXCLUSIVE MODE;

  -- C. Inspect current sequence state checking both last_value and is_called
  SELECT last_value, is_called 
  INTO v_seq_last_val, v_is_called 
  FROM public.order_number_seq;

  IF v_is_called THEN
    v_next_seq_val := v_seq_last_val + 1;
  ELSE
    v_next_seq_val := v_seq_last_val;
  END IF;

  -- D. Inspect all existing order numbers across orders table
  -- Strictly validates format: raises descriptive exception on corrupt/malformed numbers
  FOR v_rec IN 
    SELECT id, order_number FROM public.orders ORDER BY created_at ASC
  LOOP
    IF v_rec.order_number IS NULL OR TRIM(v_rec.order_number) = '' THEN
      RAISE EXCEPTION 'Sequence reconciliation error: Order ID % has a NULL or empty order_number.', v_rec.id;
    END IF;

    IF NOT (v_rec.order_number ~ '^ZV-[0-9]{4}-[0-9]+$') THEN
      RAISE EXCEPTION 'Sequence reconciliation error: Order ID % has invalid order_number format "%". Expected format ZV-YYYY-XXXX.',
        v_rec.id, v_rec.order_number;
    END IF;

    v_order_num_part := (substring(v_rec.order_number from '^ZV-[0-9]{4}-([0-9]+)$'))::bigint;
    v_max_order_val := GREATEST(v_max_order_val, v_order_num_part);
  END LOOP;

  -- E. Target next value calculation:
  --    - Strictly greater than every existing order number (>= v_max_order_val + 1)
  --    - Strictly greater than any consumed sequence value (>= v_next_seq_val)
  --    - At least 1001 (initial start)
  v_required_min_next := v_max_order_val + 1;
  v_final_next_val := GREATEST(COALESCE(v_next_seq_val, 1001), v_required_min_next, 1001);

  -- Only advance if the required next value is strictly ahead of current sequence position.
  -- NEVER resets backwards or reuses previously consumed values.
  IF v_final_next_val > v_next_seq_val THEN
    PERFORM setval('public.order_number_seq', v_final_next_val, false);
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 2. EXTENDED PREFLIGHT INTEGRITY CHECKS (ZERO DATA MUTATION)
-- Verifies existing data without altering or overwriting any user records
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_bad_prices integer;
  v_bad_stocks integer;
  v_bad_prod_status integer;
  v_null_order_nums integer;
  v_bad_payments integer;
  v_bad_statuses integer;
  v_dup_orders integer;
  v_bad_quantities integer;
  v_bad_unit_prices integer;
  v_bad_line_totals integer;
BEGIN
  -- Products: NULL or negative prices
  SELECT count(*) INTO v_bad_prices FROM public.products WHERE price IS NULL OR price < 0;
  IF v_bad_prices > 0 THEN
    RAISE EXCEPTION 'Preflight check failed: % product(s) have NULL or negative prices.', v_bad_prices;
  END IF;

  -- Products: NULL or negative stock
  SELECT count(*) INTO v_bad_stocks FROM public.products WHERE stock IS NULL OR stock < 0;
  IF v_bad_stocks > 0 THEN
    RAISE EXCEPTION 'Preflight check failed: % product(s) have NULL or negative stock.', v_bad_stocks;
  END IF;

  -- Products: NULL or invalid status values if column already exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'status'
  ) THEN
    EXECUTE 'SELECT count(*) FROM public.products WHERE status IS NULL OR status NOT IN (''active'', ''inactive'', ''draft'', ''archived'')'
      INTO v_bad_prod_status;
    IF v_bad_prod_status > 0 THEN
      RAISE EXCEPTION 'Preflight check failed: % product(s) have NULL or invalid status values.', v_bad_prod_status;
    END IF;
  END IF;

  -- Orders: NULL or empty order numbers
  SELECT count(*) INTO v_null_order_nums FROM public.orders WHERE order_number IS NULL OR TRIM(order_number) = '';
  IF v_null_order_nums > 0 THEN
    RAISE EXCEPTION 'Preflight check failed: % order(s) have NULL or empty order numbers.', v_null_order_nums;
  END IF;

  -- Orders: Non-COD payment methods
  SELECT count(*) INTO v_bad_payments FROM public.orders WHERE payment_method IS NULL OR payment_method != 'Cash on Delivery';
  IF v_bad_payments > 0 THEN
    RAISE EXCEPTION 'Preflight check failed: % order(s) have non-COD payment methods.', v_bad_payments;
  END IF;

  -- Orders: NULL or invalid status values
  SELECT count(*) INTO v_bad_statuses FROM public.orders WHERE status IS NULL OR status NOT IN ('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled');
  IF v_bad_statuses > 0 THEN
    RAISE EXCEPTION 'Preflight check failed: % order(s) have NULL or invalid statuses.', v_bad_statuses;
  END IF;

  -- Orders: Duplicate order numbers
  SELECT count(*) INTO v_dup_orders FROM (
    SELECT order_number FROM public.orders GROUP BY order_number HAVING count(*) > 1
  ) sub;
  IF v_dup_orders > 0 THEN
    RAISE EXCEPTION 'Preflight check failed: % duplicate order_number(s) exist.', v_dup_orders;
  END IF;

  -- Order Items: NULL or non-positive quantities
  SELECT count(*) INTO v_bad_quantities FROM public.order_items WHERE quantity IS NULL OR quantity <= 0;
  IF v_bad_quantities > 0 THEN
    RAISE EXCEPTION 'Preflight check failed: % order item(s) have NULL or non-positive quantity.', v_bad_quantities;
  END IF;

  -- Order Items: NULL or negative unit prices
  SELECT count(*) INTO v_bad_unit_prices FROM public.order_items WHERE unit_price IS NULL OR unit_price < 0;
  IF v_bad_unit_prices > 0 THEN
    RAISE EXCEPTION 'Preflight check failed: % order item(s) have NULL or negative unit_price.', v_bad_unit_prices;
  END IF;

  -- Order Items: Negative line totals if column already exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'line_total'
  ) THEN
    EXECUTE 'SELECT count(*) FROM public.order_items WHERE line_total IS NOT NULL AND line_total < 0'
      INTO v_bad_line_totals;
    IF v_bad_line_totals > 0 THEN
      RAISE EXCEPTION 'Preflight check failed: % order item(s) have negative line_total.', v_bad_line_totals;
    END IF;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 3. SCHEMA HARDENING & CONSTRAINTS (PRESERVING ALL EXISTING DATA)
-- ----------------------------------------------------------------------------

-- A. Products: Ensure status column exists, default 'active', NOT NULL, valid status check
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.products 
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_status_check 
  CHECK (status IS NOT NULL AND status IN ('active', 'inactive', 'draft', 'archived'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_check;
ALTER TABLE public.products ADD CONSTRAINT products_price_check 
  CHECK (price IS NOT NULL AND price >= 0);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_check;
ALTER TABLE public.products ADD CONSTRAINT products_stock_check 
  CHECK (stock IS NOT NULL AND stock >= 0);

-- B. Orders: Add inventory tracking and timestamp columns
-- Note on Historical Inventory: Migration 001 place_order() contained no stock deduction statements.
-- Empirical inspection confirmed product stock was not decremented for existing orders.
-- Therefore, historical orders default to stock_deducted = false.
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS stock_deducted boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS stock_restored boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.orders 
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check 
  CHECK (payment_method = 'Cash on Delivery');

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IS NOT NULL AND status IN ('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'));

-- C. Order Items: Add line_total (populating new column from existing quantity * unit_price)
ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS line_total numeric;

UPDATE public.order_items 
  SET line_total = quantity * unit_price 
  WHERE line_total IS NULL;

ALTER TABLE public.order_items 
  ALTER COLUMN line_total SET DEFAULT 0;

ALTER TABLE public.order_items 
  ALTER COLUMN line_total SET NOT NULL;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_line_total_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_line_total_check 
  CHECK (line_total IS NOT NULL AND line_total >= 0);

-- D. Indexes & Unique Constraints
-- Ensure unique constraint on orders.order_number without creating redundant duplicate index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.orders'::regclass 
      AND contype = 'u' 
      AND conname = 'orders_order_number_key'
  ) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);


-- ----------------------------------------------------------------------------
-- 4. HARDENED is_admin() FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ----------------------------------------------------------------------------
-- 5. PROFILE REGISTRATION & ROLE TAMPERING PREVENTION TRIGGER
-- ----------------------------------------------------------------------------

-- A. Auto-create customer profile on auth signup (ALWAYS forces role = 'customer')
-- If profile insertion fails, the transaction aborts to maintain atomic consistency with auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'New Customer'),
    NEW.email,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    'customer'
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END;
$$;

-- Safely replace on_auth_user_created if permitted; existing trigger calls replaced function
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- B. Engine-level trigger: prevents non-admins from assigning or updating to 'admin'
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On INSERT: If non-admin attempts to set role != 'customer', force it back to 'customer'
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'customer' AND NOT public.is_admin() THEN
      NEW.role := 'customer';
    END IF;
  END IF;

  -- On UPDATE: Disallow any role changes by non-admins
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Customers cannot modify account roles.' USING ERRCODE = '42501';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Profile ID is immutable.' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();


-- ----------------------------------------------------------------------------
-- 6. DYNAMIC ROW-LEVEL ORDER IMMUTABILITY & GROUPED CANCELLATION RESTORATION TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_order_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_json jsonb;
  v_new_json jsonb;
  v_diff_keys text;
  v_item record;
BEGIN
  -- 1. Independent authorization check: trigger does NOT rely exclusively on RLS
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators are permitted to update orders.' USING ERRCODE = '42501';
  END IF;

  -- 2. Dynamic Row-Level Immutability:
  -- Strips authorized mutable fields ('status', 'stock_restored', 'updated_at') and
  -- asserts that every other column in public.orders is strictly identical.
  -- This dynamically protects every column in the table without relying on a hardcoded list.
  v_old_json := to_jsonb(OLD) - 'status' - 'stock_restored' - 'updated_at';
  v_new_json := to_jsonb(NEW) - 'status' - 'stock_restored' - 'updated_at';

  IF v_old_json IS DISTINCT FROM v_new_json THEN
    SELECT string_agg(key, ', ') INTO v_diff_keys
    FROM jsonb_each(to_jsonb(NEW))
    WHERE key NOT IN ('status', 'stock_restored', 'updated_at')
      AND (to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key);

    RAISE EXCEPTION 'Order data is immutable. Only status may be modified. Illegal modification attempted on field(s): %',
      COALESCE(v_diff_keys, 'unknown')
      USING ERRCODE = '42501';
  END IF;

  -- 3. Safely update timestamp on every authorized order update
  NEW.updated_at := now();

  -- 4. Protect stock_restored: callers cannot manually tamper with it
  -- It can ONLY transition to true internally when cancelling an order where stock was deducted
  IF NEW.stock_restored IS DISTINCT FROM OLD.stock_restored THEN
    IF NOT (OLD.status IS DISTINCT FROM 'Cancelled' AND NEW.status = 'Cancelled' AND OLD.stock_deducted = true AND OLD.stock_restored = false) THEN
      RAISE EXCEPTION 'Field "stock_restored" is internally managed and cannot be manually modified.' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 5. Validate status is not null and allowed
  IF NEW.status IS NULL OR NEW.status NOT IN ('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled') THEN
    RAISE EXCEPTION 'Invalid order status "%". Permitted values: Pending, Confirmed, Shipped, Delivered, Cancelled.', COALESCE(NEW.status, 'NULL');
  END IF;

  -- 6. Disallow reopening cancelled orders (prevents stock restoration loops)
  IF OLD.status = 'Cancelled' AND NEW.status != 'Cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot be reopened. A new order must be placed.' USING ERRCODE = '42501';
  END IF;

  -- 7. Disallow cancelling already delivered orders
  IF OLD.status = 'Delivered' AND NEW.status = 'Cancelled' THEN
    RAISE EXCEPTION 'Cannot cancel an order that has already been delivered.' USING ERRCODE = '42501';
  END IF;

  -- 8. Grouped cancellation inventory restoration:
  -- Restores stock ONLY if stock was deducted at checkout and has NOT yet been restored.
  -- Groups by product_id and sums quantities to safely handle multiple size/color entries of the same product.
  IF OLD.status IS DISTINCT FROM 'Cancelled' AND NEW.status = 'Cancelled' THEN
    IF OLD.stock_deducted = true AND OLD.stock_restored = false THEN
      FOR v_item IN 
        SELECT 
          product_id, 
          SUM(quantity) AS total_qty
        FROM public.order_items
        WHERE order_id = NEW.id 
          AND product_id IS NOT NULL
        GROUP BY product_id
        ORDER BY product_id ASC -- Deterministic order prevents deadlocks
      LOOP
        UPDATE public.products
        SET stock = stock + v_item.total_qty
        WHERE id = v_item.product_id;
      END LOOP;

      NEW.stock_restored := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_immutability ON public.orders;
CREATE TRIGGER trg_enforce_order_immutability
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_immutability();

-- C. Strict prevention of order and item deletion
CREATE OR REPLACE FUNCTION public.prevent_order_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'Order deletion is prohibited. Orders and line items must be preserved for financial auditing.' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_order_deletion ON public.orders;
CREATE TRIGGER trg_prevent_order_deletion
  BEFORE DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_order_deletion();

DROP TRIGGER IF EXISTS trg_prevent_order_items_deletion ON public.order_items;
CREATE TRIGGER trg_prevent_order_items_deletion
  BEFORE DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_order_deletion();


-- ----------------------------------------------------------------------------
-- 7. DYNAMIC UNIVERSAL RLS POLICY PURGE & RE-ESTABLISHMENT
-- ----------------------------------------------------------------------------

-- Dynamically drop EVERY existing policy on profiles, orders, and order_items (including custom-named policies)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'orders', 'order_items')
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Revoke all direct client write access
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM anon, authenticated, PUBLIC;

-- Grant minimal required permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated; -- Governed by RLS + trg_protect_profile_role

GRANT SELECT ON public.orders TO authenticated;
GRANT UPDATE ON public.orders TO authenticated; -- Governed by RLS + trg_enforce_order_immutability

GRANT SELECT ON public.order_items TO authenticated;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 7.1 Profiles RLS (Direct, non-recursive clauses)
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 7.2 Orders RLS (Customers read own; Admins read all and update status)
CREATE POLICY "orders_select_own_or_admin"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "orders_update_admin_only"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7.3 Order Items RLS (Customers read items for their orders; Admins read all)
CREATE POLICY "order_items_select_own_or_admin"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );


-- ----------------------------------------------------------------------------
-- 8. ATOMIC, CONCURRENCY-SAFE CHECKOUT RPC FUNCTION (80 BDT DELIVERY FEE)
-- ----------------------------------------------------------------------------

-- A. Explicitly drop legacy 5-parameter checkout function to eliminate overload ambiguity
DROP FUNCTION IF EXISTS public.place_order(jsonb, jsonb, numeric, numeric, numeric);

-- B. Create hardened authoritative checkout function
CREATE OR REPLACE FUNCTION public.place_order(
  p_address_snapshot jsonb,
  p_items jsonb,
  p_subtotal numeric DEFAULT NULL,       -- Client-sent value discarded (recalculated on server)
  p_delivery_fee numeric DEFAULT NULL,   -- Client-sent value discarded (recalculated on server)
  p_total numeric DEFAULT NULL,          -- Client-sent value discarded (recalculated on server)
  p_payment_method text DEFAULT 'Cash on Delivery'
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_order public.orders;
  v_item jsonb;
  v_agg record;
  v_product record;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_server_subtotal numeric := 0;
  v_standard_delivery_fee numeric := 80;   -- Matches DELIVERY_FEE in src/lib/format.ts
  v_free_delivery_threshold numeric := 3000; -- Matches FREE_DELIVERY_THRESHOLD in src/lib/format.ts
  v_server_delivery_fee numeric := 80;
  v_server_total numeric := 0;
  v_order_number text;
  v_seq_val bigint;
  v_recipient text;
  v_phone text;
  v_address_line text;
  v_city text;
  v_district text;
BEGIN
  -- 1. Verify Authenticated Customer
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: You must be logged in to place an order.' USING ERRCODE = '42501';
  END IF;

  -- 2. Restrict Payment Method to Cash on Delivery
  IF p_payment_method IS NOT NULL AND p_payment_method != 'Cash on Delivery' THEN
    RAISE EXCEPTION 'Invalid payment method "%". ZOVIA currently supports Cash on Delivery only.', p_payment_method;
  END IF;

  -- 3. Validate Address Snapshot
  IF p_address_snapshot IS NULL THEN
    RAISE EXCEPTION 'Delivery address is required.';
  END IF;

  v_recipient := TRIM(COALESCE(p_address_snapshot->>'recipient_name', ''));
  v_phone := TRIM(COALESCE(p_address_snapshot->>'phone', ''));
  v_address_line := TRIM(COALESCE(p_address_snapshot->>'address_line', ''));
  v_city := TRIM(COALESCE(p_address_snapshot->>'city', ''));
  v_district := TRIM(COALESCE(p_address_snapshot->>'district', ''));

  IF v_recipient = '' OR v_phone = '' OR v_address_line = '' OR v_city = '' OR v_district = '' THEN
    RAISE EXCEPTION 'Incomplete delivery address. Recipient name, phone, address, city, and district are mandatory.';
  END IF;

  -- 4. Validate Items Array
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot place order: Cart is empty.';
  END IF;

  -- 5. Validate Individual Item Structure
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF NULLIF(v_item->>'product_id', '') IS NULL THEN
      RAISE EXCEPTION 'Invalid item: Missing product ID.';
    END IF;

    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for product %. Quantity must be a positive integer.', v_item->>'product_id';
    END IF;
  END LOOP;

  -- 6. PHASE 1: Aggregate Duplicate Products & Lock Rows (Deadlock-Free Sorted Order)
  -- Aggregates total quantity per product_id to validate multi-size/multi-color combinations against total stock
  FOR v_agg IN 
    SELECT 
      (item->>'product_id')::uuid AS product_id,
      SUM((item->>'quantity')::integer) AS total_quantity
    FROM jsonb_array_elements(p_items) AS item
    GROUP BY (item->>'product_id')::uuid
    ORDER BY (item->>'product_id')::uuid ASC -- Consistent lock order prevents database deadlocks
  LOOP
    -- Lock the product row FOR UPDATE
    SELECT id, name, price, stock, status, image_urls
    INTO v_product
    FROM public.products
    WHERE id = v_agg.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID "%" does not exist in the catalog.', v_agg.product_id;
    END IF;

    -- Strict status check: Rejects any status other than 'active', including NULL
    IF v_product.status IS NULL OR v_product.status != 'active' THEN
      RAISE EXCEPTION 'Product "%" is currently unavailable for purchase (status: %).',
        v_product.name, COALESCE(v_product.status, 'NULL');
    END IF;

    -- Explicitly validate price & stock fields
    IF v_product.price IS NULL OR v_product.price < 0 THEN
      RAISE EXCEPTION 'Data error: Product "%" has an invalid price configuration.', v_product.name;
    END IF;

    IF v_product.stock IS NULL OR v_product.stock < 0 THEN
      RAISE EXCEPTION 'Data error: Product "%" has an invalid inventory count.', v_product.name;
    END IF;

    -- Check availability against total requested across all variants
    IF v_product.stock < v_agg.total_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Total requested: %, Available: %.',
        v_product.name, v_agg.total_quantity, v_product.stock;
    END IF;

    -- Safely decrement inventory
    UPDATE public.products
    SET stock = stock - v_agg.total_quantity
    WHERE id = v_agg.product_id;
  END LOOP;

  -- 7. PHASE 2: Authoritative Server Pricing & Subtotal Calculation
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    SELECT price INTO v_unit_price
    FROM public.products
    WHERE id = v_product_id;

    v_line_total := v_unit_price * v_quantity;
    v_server_subtotal := v_server_subtotal + v_line_total;
  END LOOP;

  -- 8. Calculate Delivery Fee & Total in BDT (Free over 3,000 BDT, otherwise 80 BDT)
  IF v_server_subtotal >= v_free_delivery_threshold THEN
    v_server_delivery_fee := 0;
  ELSE
    v_server_delivery_fee := v_standard_delivery_fee; -- 80 BDT
  END IF;
  v_server_total := v_server_subtotal + v_server_delivery_fee;

  -- 9. Monotonic Concurrency-Safe Order Number via Atomic Sequence
  -- Never truncates sequence values exceeding 6 digits
  v_seq_val := nextval('public.order_number_seq');
  v_order_number := 'ZV-' || TO_CHAR(now(), 'YYYY') || '-' || 
    CASE 
      WHEN length(v_seq_val::text) < 6 THEN LPAD(v_seq_val::text, 6, '0')
      ELSE v_seq_val::text
    END;

  -- 10. Insert Order Header Record (Atomic, with stock_deducted = true)
  INSERT INTO public.orders (
    order_number,
    user_id,
    address_snapshot,
    subtotal,
    delivery_fee,
    total,
    payment_method,
    status,
    stock_deducted,
    stock_restored,
    updated_at
  )
  VALUES (
    v_order_number,
    v_user_id,
    p_address_snapshot,
    v_server_subtotal,
    v_server_delivery_fee,
    v_server_total,
    'Cash on Delivery',
    'Pending',
    true,  -- Confirms stock was deducted at checkout
    false, -- Stock has not been restored
    now()
  )
  RETURNING * INTO v_order;

  -- 11. Insert Order Items (Preserving chosen size, color & DB-calculated line total)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    SELECT id, name, price, image_urls
    INTO v_product
    FROM public.products
    WHERE id = v_product_id;

    v_unit_price := v_product.price;
    v_line_total := v_unit_price * v_quantity;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      size,
      color,
      quantity,
      unit_price,
      line_total
    )
    VALUES (
      v_order.id,
      v_product.id,
      v_product.name,
      COALESCE(NULLIF(v_item->>'product_image', ''), v_product.image_urls[1]),
      NULLIF(v_item->>'size', ''),
      NULLIF(v_item->>'color', ''),
      v_quantity,
      v_unit_price,
      v_line_total
    );
  END LOOP;

  RETURN v_order;
END;
$$;

-- Revoke execution from public/anon; allow authenticated users only
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, numeric, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, numeric, numeric, numeric, text) TO authenticated;

COMMIT;
