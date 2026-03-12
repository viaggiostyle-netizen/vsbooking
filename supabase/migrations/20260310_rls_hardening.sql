
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;


DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_settings') THEN
    EXECUTE 'ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;



DROP POLICY IF EXISTS "admins_deny_anon" ON public.admins;
CREATE POLICY "admins_deny_anon"
  ON public.admins FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "admins_deny_authenticated" ON public.admins;
CREATE POLICY "admins_deny_authenticated"
  ON public.admins FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);


DROP POLICY IF EXISTS "admin_logs_deny_anon" ON public.admin_logs;
CREATE POLICY "admin_logs_deny_anon"
  ON public.admin_logs FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "admin_logs_deny_authenticated" ON public.admin_logs;
CREATE POLICY "admin_logs_deny_authenticated"
  ON public.admin_logs FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);


DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_settings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "system_settings_deny_anon" ON public.system_settings';
    EXECUTE 'CREATE POLICY "system_settings_deny_anon" ON public.system_settings FOR ALL TO anon USING (false) WITH CHECK (false)';
    EXECUTE 'DROP POLICY IF EXISTS "system_settings_deny_authenticated" ON public.system_settings';
    EXECUTE 'CREATE POLICY "system_settings_deny_authenticated" ON public.system_settings FOR ALL TO authenticated USING (false) WITH CHECK (false)';
  END IF;
END $$;