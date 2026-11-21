-- ============================================================
-- TRUCK TRACKING MASTER — Supabase SQL Schema
-- Run this in your Supabase SQL Editor (project > SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE (extends auth.users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  user_id_code TEXT UNIQUE,
  phone_number TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup with auto-admin for designated administrator
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_code TEXT;
BEGIN
  generated_code := COALESCE(
    NEW.raw_user_meta_data->>'user_id_code',
    'USR-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6))
  );

  INSERT INTO public.profiles (id, email, full_name, user_id_code, phone_number, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    generated_code,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    CASE
      WHEN LOWER(NEW.email) = 'mallikarjun.patil8638@gmail.com' THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    END
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE
      WHEN LOWER(EXCLUDED.email) = 'mallikarjun.patil8638@gmail.com' THEN 'admin'
      ELSE public.profiles.role
    END,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Security Trigger: Prevent unauthorized role modification and self-escalation
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- If user is designated superadmin, allow setting admin
    IF LOWER(NEW.email) = 'mallikarjun.patil8638@gmail.com' AND NEW.role = 'admin' THEN
      RETURN NEW;
    END IF;

    -- Only active administrators can modify roles
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access Denied: Only authorized administrators can modify user roles.';
    END IF;

    -- Administrators cannot modify their own role
    IF (SELECT auth.uid()) = OLD.id THEN
      RAISE EXCEPTION 'Access Denied: Administrators cannot modify their own role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- ─────────────────────────────────────────────────────────────
-- 2. UPLOAD BATCHES TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.upload_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name         TEXT NOT NULL,
  file_path         TEXT,
  total_records     INTEGER NOT NULL DEFAULT 0,
  imported_records  INTEGER NOT NULL DEFAULT 0,
  duplicate_records INTEGER NOT NULL DEFAULT 0,
  failed_records    INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  uploaded_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  column_mapping    JSONB,
  errors            JSONB DEFAULT '[]'::jsonb,
  uploader_name     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────────
-- 3. VEHICLES TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name       TEXT NOT NULL,
  agreement_number    TEXT,
  registration_number TEXT UNIQUE,
  chassis_number      TEXT,
  engine_number       TEXT,
  vehicle_type        TEXT,
  vehicle_make        TEXT,
  vehicle_model       TEXT,
  vehicle_year        INTEGER,
  vehicle_color       TEXT,
  finance_company     TEXT,
  branch              TEXT,
  status              TEXT DEFAULT 'active',
  remarks             TEXT,
  photographs         JSONB DEFAULT '[]'::jsonb,
  documents           JSONB DEFAULT '[]'::jsonb,
  agreement_details   JSONB DEFAULT '{}'::jsonb,
  delivery_details    JSONB DEFAULT '{}'::jsonb,
  custom_fields       JSONB DEFAULT '{}'::jsonb,
  uploaded_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  upload_batch_id     UUID REFERENCES public.upload_batches(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Enable pg_trgm for high-speed wildcard & substring searches (ilike)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS vehicles_customer_name_idx    ON public.vehicles USING gin (to_tsvector('english', customer_name));
CREATE INDEX IF NOT EXISTS vehicles_customer_trgm_idx    ON public.vehicles USING gin (customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS vehicles_registration_trgm_idx ON public.vehicles USING gin (registration_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS vehicles_agreement_trgm_idx   ON public.vehicles USING gin (agreement_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS vehicles_chassis_trgm_idx     ON public.vehicles USING gin (chassis_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS vehicles_engine_trgm_idx      ON public.vehicles USING gin (engine_number gin_trgm_ops);

CREATE TRIGGER set_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4. AUDIT LOGS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   TEXT,
  details       JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx   ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx    ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx   ON public.audit_logs (created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 4B. VEHICLE ACCESS LOGS (Tracks user access & location)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_access_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name           TEXT,
  user_id_code        TEXT,
  user_phone          TEXT,
  user_email          TEXT,
  vehicle_id          UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  customer_name       TEXT,
  agreement_number    TEXT,
  registration_number TEXT,
  vehicle_model       TEXT,
  accessed_at         TIMESTAMPTZ DEFAULT NOW(),
  latitude            NUMERIC,
  longitude           NUMERIC,
  location_accuracy   NUMERIC,
  location_status     TEXT NOT NULL DEFAULT 'denied' CHECK (location_status IN ('granted', 'denied', 'unavailable', 'not_supported')),
  google_maps_url     TEXT,
  ip_address          TEXT,
  user_agent          TEXT,
  notification_sent   BOOLEAN DEFAULT false,
  notification_channel TEXT,
  notification_error  TEXT,
  is_read             BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS val_user_id_idx    ON public.vehicle_access_logs (user_id);
CREATE INDEX IF NOT EXISTS val_vehicle_id_idx ON public.vehicle_access_logs (vehicle_id);
CREATE INDEX IF NOT EXISTS val_accessed_at_idx ON public.vehicle_access_logs (accessed_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 4C. ADMIN NOTIFICATION LOGS (WhatsApp / SMS Delivery)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_notification_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_log_id       UUID REFERENCES public.vehicle_access_logs(id) ON DELETE SET NULL,
  channel             TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  recipient           TEXT NOT NULL,
  message_body        TEXT NOT NULL,
  provider            TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  provider_response   JSONB,
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS anl_created_at_idx ON public.admin_notification_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS anl_status_idx     ON public.admin_notification_logs (status);

-- ─────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_batches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_access_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_logs ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role (optimized subquery)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is admin (optimized subquery)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── PROFILES RLS ──
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    -- Prevent users from changing their own role
    AND role = (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role bypass" ON public.profiles;
CREATE POLICY "Service role bypass"
  ON public.profiles
  TO service_role
  USING (true);

-- ── VEHICLES RLS ──
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
CREATE POLICY "Authenticated users can view vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert vehicles" ON public.vehicles;
CREATE POLICY "Admins can insert vehicles"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update vehicles" ON public.vehicles;
CREATE POLICY "Admins can update vehicles"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete vehicles" ON public.vehicles;
CREATE POLICY "Admins can delete vehicles"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ── UPLOAD BATCHES RLS ──
DROP POLICY IF EXISTS "Admins can manage upload batches" ON public.upload_batches;
CREATE POLICY "Admins can manage upload batches"
  ON public.upload_batches FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ── AUDIT LOGS RLS ──
DROP POLICY IF EXISTS "Users can view their own logs" ON public.audit_logs;
CREATE POLICY "Users can view their own logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all logs" ON public.audit_logs;
CREATE POLICY "Admins can view all logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── VEHICLE ACCESS LOGS RLS ──
DROP POLICY IF EXISTS "Users can view their own vehicle access logs" ON public.vehicle_access_logs;
CREATE POLICY "Users can view their own vehicle access logs"
  ON public.vehicle_access_logs FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all vehicle access logs" ON public.vehicle_access_logs;
CREATE POLICY "Admins can view all vehicle access logs"
  ON public.vehicle_access_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can insert vehicle access logs" ON public.vehicle_access_logs;
CREATE POLICY "Authenticated users can insert vehicle access logs"
  ON public.vehicle_access_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ── ADMIN NOTIFICATION LOGS RLS ──
DROP POLICY IF EXISTS "Admins can view notification logs" ON public.admin_notification_logs;
CREATE POLICY "Admins can view notification logs"
  ON public.admin_notification_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins and service role can insert notification logs" ON public.admin_notification_logs;
CREATE POLICY "Admins and service role can insert notification logs"
  ON public.admin_notification_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 6. STORAGE BUCKET & RLS POLICIES (ADMIN-ONLY UPLOAD/MODIFY)
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-uploads', 'vehicle-uploads', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins can upload storage objects" ON storage.objects;
CREATE POLICY "Admins can upload storage objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vehicle-uploads' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update storage objects" ON storage.objects;
CREATE POLICY "Admins can update storage objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vehicle-uploads' AND public.is_admin())
  WITH CHECK (bucket_id = 'vehicle-uploads' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete storage objects" ON storage.objects;
CREATE POLICY "Admins can delete storage objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'vehicle-uploads' AND public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can read storage objects" ON storage.objects;
CREATE POLICY "Authenticated users can read storage objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'vehicle-uploads');

-- ─────────────────────────────────────────────────────────────
-- 7. GRANT PERMISSIONS
-- ─────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.vehicles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.upload_batches TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT ON public.vehicle_access_logs TO authenticated;
GRANT SELECT, INSERT ON public.admin_notification_logs TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 7. DESIGNATED ADMINISTRATOR SETUP
-- ─────────────────────────────────────────────────────────────
UPDATE public.profiles
SET role = 'admin'
WHERE LOWER(email) = 'mallikarjun.patil8638@gmail.com';

-- Idempotent column additions for existing installations
ALTER TABLE public.upload_batches ADD COLUMN IF NOT EXISTS errors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.upload_batches ADD COLUMN IF NOT EXISTS uploader_name TEXT;
ALTER TABLE public.vehicle_access_logs ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- 8. SAMPLE DUMMY DATA (remove before production)
-- ─────────────────────────────────────────────────────────────
-- INSERT INTO public.vehicles (customer_name, agreement_number, registration_number, chassis_number, engine_number, vehicle_make, vehicle_model, vehicle_year, vehicle_color, finance_company, branch, status)
-- VALUES
--   ('John Doe', 'AGR-001', 'ABC 1234', 'CHS001234', 'ENG001234', 'Toyota', 'Hilux', 2022, 'White', 'Standard Bank', 'Johannesburg', 'active'),
--   ('Jane Smith', 'AGR-002', 'XYZ 5678', 'CHS005678', 'ENG005678', 'Ford', 'Ranger', 2021, 'Blue', 'Absa Bank', 'Cape Town', 'active'),
--   ('Bob Johnson', 'AGR-003', 'DEF 9012', 'CHS009012', 'ENG009012', 'Isuzu', 'D-Max', 2023, 'Silver', 'Nedbank', 'Durban', 'active');
