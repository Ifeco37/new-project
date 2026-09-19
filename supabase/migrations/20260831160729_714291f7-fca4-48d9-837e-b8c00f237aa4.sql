-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  supplier TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated admins manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SALES
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  selling_price NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  customer_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated admins manage sales" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX sales_product_id_idx ON public.sales(product_id);

-- Stock control: reduce quantity on sale, block overselling
CREATE OR REPLACE FUNCTION public.handle_sale_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available INTEGER;
BEGIN
  SELECT quantity INTO available FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF available IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  IF NEW.quantity > available THEN
    RAISE EXCEPTION 'Not enough stock. Only % unit(s) available.', available;
  END IF;
  NEW.total_amount := NEW.quantity * NEW.selling_price;
  UPDATE public.products SET quantity = quantity - NEW.quantity WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_before_insert
BEFORE INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.handle_sale_insert();

-- Restore stock when a sale is deleted
CREATE OR REPLACE FUNCTION public.handle_sale_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products SET quantity = quantity + OLD.quantity WHERE id = OLD.product_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER sales_after_delete
AFTER DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.handle_sale_delete();

-- SEED DATA
INSERT INTO public.products (id, name, sku, category, price, quantity, supplier) VALUES
  ('11111111-1111-4111-8111-000000000001', 'Indomie Noodles (Carton)', 'SKU-1001', 'Food', 7200.00, 48, 'Dufil Prima Foods'),
  ('11111111-1111-4111-8111-000000000002', 'Golden Penny Spaghetti', 'SKU-1002', 'Food', 850.00, 120, 'Flour Mills Nigeria'),
  ('11111111-1111-4111-8111-000000000003', 'Peak Milk 400g', 'SKU-1003', 'Beverages', 5200.00, 9, 'FrieslandCampina'),
  ('11111111-1111-4111-8111-000000000004', 'Milo Refill 500g', 'SKU-1004', 'Beverages', 4800.00, 25, 'Nestle Nigeria'),
  ('11111111-1111-4111-8111-000000000005', 'Ariel Detergent 1kg', 'SKU-1005', 'Household', 3100.00, 0, 'P&G Nigeria'),
  ('11111111-1111-4111-8111-000000000006', 'Dangote Sugar 1kg', 'SKU-1006', 'Food', 1900.00, 60, 'Dangote Group'),
  ('11111111-1111-4111-8111-000000000007', 'Eva Bottled Water (Pack)', 'SKU-1007', 'Beverages', 1500.00, 7, 'Coca-Cola HBC'),
  ('11111111-1111-4111-8111-000000000008', 'Hypo Bleach 1L', 'SKU-1008', 'Household', 1200.00, 34, 'Tolaram Group');

INSERT INTO public.sales (product_id, quantity, selling_price, customer_name, created_at) VALUES
  ('11111111-1111-4111-8111-000000000001', 2, 7500.00, 'Chidinma Stores', now() - interval '5 days'),
  ('11111111-1111-4111-8111-000000000002', 10, 900.00, 'Musa Provisions', now() - interval '3 days'),
  ('11111111-1111-4111-8111-000000000004', 3, 5000.00, 'Blessing Mart', now() - interval '2 days'),
  ('11111111-1111-4111-8111-000000000006', 5, 2000.00, 'Emeka Ventures', now() - interval '1 day'),
  ('11111111-1111-4111-8111-000000000003', 1, 5500.00, 'Walk-in Customer', now());