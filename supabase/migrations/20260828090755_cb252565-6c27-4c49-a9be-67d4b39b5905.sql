CREATE TYPE public.app_role AS ENUM ('admin','artist','kathakar');
CREATE TYPE public.account_status AS ENUM ('pending','approved','rejected','revoked');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  bio text,
  status public.account_status NOT NULL DEFAULT 'pending',
  license_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved');
$$;

CREATE TABLE public.artist_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  available_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, available_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_availability TO authenticated;
GRANT ALL ON public.artist_availability TO service_role;
ALTER TABLE public.artist_availability ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kathakar_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  event_title text,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, booking_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin profiles select" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin profiles update" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "kathakar sees approved artists" ON public.profiles FOR SELECT TO authenticated USING (
  status = 'approved' AND public.has_role(id,'artist') AND public.is_approved(auth.uid()) AND public.has_role(auth.uid(),'kathakar')
);
CREATE POLICY "artist sees booking kathakars" ON public.profiles FOR SELECT TO authenticated USING (
  public.is_approved(auth.uid()) AND public.has_role(auth.uid(),'artist')
  AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.artist_id = auth.uid() AND b.kathakar_id = profiles.id)
);

CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin roles select" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "approved users read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

CREATE POLICY "artist manages own availability" ON public.artist_availability FOR ALL TO authenticated
  USING (artist_id = auth.uid() AND public.is_approved(auth.uid()))
  WITH CHECK (artist_id = auth.uid() AND public.is_approved(auth.uid()) AND public.has_role(auth.uid(),'artist'));
CREATE POLICY "kathakar views availability" ON public.artist_availability FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) AND (public.has_role(auth.uid(),'kathakar') OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "kathakar manages own bookings" ON public.bookings FOR ALL TO authenticated
  USING (kathakar_id = auth.uid() AND public.is_approved(auth.uid()))
  WITH CHECK (kathakar_id = auth.uid() AND public.is_approved(auth.uid()) AND public.has_role(auth.uid(),'kathakar'));
CREATE POLICY "artist views own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (artist_id = auth.uid() AND public.is_approved(auth.uid()));
CREATE POLICY "admin views bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "approved kathakars view booked dates" ON public.bookings FOR SELECT TO authenticated
USING (public.is_approved(auth.uid()) AND public.has_role(auth.uid(),'kathakar'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category text;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
BEGIN
  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'artist')::public.app_role;

  INSERT INTO public.profiles (id, full_name, email, phone, category, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.email,''),
    NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'category',''),
    'pending'
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := OLD.status;
    NEW.license_key := OLD.license_key;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_guard_privileges BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_privileges() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;

CREATE TABLE public.telegram_settings (
  id text PRIMARY KEY DEFAULT 'default',
  bot_token text,
  bot_username text,
  admin_chat_id text,
  webhook_url text,
  webhook_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_settings TO authenticated;
GRANT ALL ON public.telegram_settings TO service_role;
ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages telegram settings"
ON public.telegram_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER telegram_settings_updated_at
BEFORE UPDATE ON public.telegram_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();