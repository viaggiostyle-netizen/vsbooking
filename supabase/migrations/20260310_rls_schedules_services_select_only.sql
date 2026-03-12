
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
    DROP POLICY IF EXISTS "public write bookings" ON public.bookings;
    DROP POLICY IF EXISTS "public read bookings" ON public.bookings;
    CREATE POLICY "bookings_select_only"
      ON public.bookings FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedules') THEN
    DROP POLICY IF EXISTS "public write schedules" ON public.schedules;
    DROP POLICY IF EXISTS "public read schedules" ON public.schedules;
    CREATE POLICY "schedules_select_only"
      ON public.schedules FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'services') THEN
    DROP POLICY IF EXISTS "public write services" ON public.services;
    DROP POLICY IF EXISTS "public read services" ON public.services;
    CREATE POLICY "services_select_only"
      ON public.services FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'servicios') THEN
    DROP POLICY IF EXISTS "public write servicios" ON public.servicios;
    DROP POLICY IF EXISTS "public read servicios" ON public.servicios;
    CREATE POLICY "servicios_select_only"
      ON public.servicios FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
