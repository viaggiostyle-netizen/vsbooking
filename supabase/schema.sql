-- ViaggioStyle - Supabase schema
-- Ejecutar en SQL Editor de Supabase.

create extension if not exists pgcrypto;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  service_name text not null,
  service_price integer not null,
  service_duration integer not null,
  appointment_date date not null,
  appointment_time time not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled', 'no_show', 'no_show_with_notice')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  total_completed integer not null default 0,
  total_no_show integer not null default 0,
  total_cancelled integer not null default 0,
  total_spent integer not null default 0,
  is_recurrent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingresos (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete cascade,
  client_name text not null,
  client_phone text not null,
  service_name text not null,
  amount integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.historial_clientes (
  id uuid primary key default gen_random_uuid(),
  client_phone text not null,
  appointment_id uuid references public.appointments(id) on delete cascade,
  event_type text not null
    check (event_type in ('completed', 'no_show', 'no_show_with_notice', 'cancelled')),
  event_date timestamptz not null default now()
);

create table if not exists public.servicios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null,
  duration integer not null,
  is_active boolean not null default true,
  created_at timestamp not null default now()
);

create table if not exists public.horarios_trabajo (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true
);

create table if not exists public.metricas (
  id uuid primary key default gen_random_uuid(),
  total_ingresos integer not null default 0,
  total_turnos integer not null default 0,
  total_clientes integer not null default 0,
  total_no_show integer not null default 0,
  updated_at timestamp not null default now()
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_email text not null,
  target_email text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_logs_created_at
  on public.admin_logs(created_at desc);

create index if not exists idx_admin_logs_action
  on public.admin_logs(action);

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value text,
  created_at timestamptz not null default now()
);

insert into public.system_settings (setting_key, setting_value)
values
  ('appointment_cancellation_hours', '24'),
  (
    'appointment_cancellation_message',
    'Las cancelaciones fuera de plazo no estan permitidas. Por favor comunicate por WhatsApp con la barberia.'
  ),
  ('appointment_whatsapp_contact', '+5491112345678')
on conflict (setting_key) do nothing;

insert into public.admins (email)
values
  ('camiloviaggio01@gmail.com'),
  ('viaggiostyle@gmail.com')
on conflict (email) do nothing;

create index if not exists idx_appointments_date
  on public.appointments(appointment_date);

create index if not exists idx_appointments_phone
  on public.appointments(client_phone);

create index if not exists idx_clientes_phone
  on public.clientes(phone);

create index if not exists idx_ingresos_date
  on public.ingresos(created_at);

create unique index if not exists idx_admins_email
  on public.admins(lower(email));

create unique index if not exists idx_ingresos_appointment_unique
  on public.ingresos(appointment_id)
  where appointment_id is not null;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_appointments_updated_at on public.appointments;
create trigger update_appointments_updated_at
before update on public.appointments
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_clientes_updated_at on public.clientes;
create trigger update_clientes_updated_at
before update on public.clientes
for each row
execute function public.update_updated_at_column();

create or replace function public.handle_completed_appointment()
returns trigger as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    insert into public.ingresos (
      appointment_id,
      client_name,
      client_phone,
      service_name,
      amount
    )
    values (
      new.id,
      new.client_name,
      new.client_phone,
      new.service_name,
      new.service_price
    );

    insert into public.clientes (name, phone, total_completed, total_spent)
    values (
      new.client_name,
      new.client_phone,
      1,
      new.service_price
    )
    on conflict (phone)
    do update set
      total_completed = public.clientes.total_completed + 1,
      total_spent = public.clientes.total_spent + excluded.total_spent;

    update public.clientes
    set is_recurrent = true
    where phone = new.client_phone
      and total_completed >= 5;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists on_appointment_completed on public.appointments;
create trigger on_appointment_completed
after update on public.appointments
for each row
execute function public.handle_completed_appointment();

create or replace function public.handle_appointment_history()
returns trigger as $$
begin
  if new.status <> old.status
    and new.status in ('completed', 'no_show', 'no_show_with_notice', 'cancelled') then
    insert into public.historial_clientes (client_phone, appointment_id, event_type)
    values (new.client_phone, new.id, new.status);
  end if;

  if new.status = 'no_show' and old.status <> 'no_show' then
    insert into public.clientes (name, phone, total_no_show)
    values (new.client_name, new.client_phone, 1)
    on conflict (phone)
    do update set
      total_no_show = public.clientes.total_no_show + 1;
  end if;

  if new.status in ('no_show_with_notice', 'cancelled') and old.status <> new.status then
    insert into public.clientes (name, phone, total_cancelled)
    values (new.client_name, new.client_phone, 1)
    on conflict (phone)
    do update set
      total_cancelled = public.clientes.total_cancelled + 1;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists on_appointment_history on public.appointments;
create trigger on_appointment_history
after update on public.appointments
for each row
execute function public.handle_appointment_history();

create or replace function public.refresh_metricas_snapshot()
returns trigger as $$
declare
  target_id uuid := '00000000-0000-0000-0000-000000000001';
  v_total_ingresos integer := 0;
  v_total_turnos integer := 0;
  v_total_clientes integer := 0;
  v_total_no_show integer := 0;
begin
  select coalesce(sum(amount), 0) into v_total_ingresos from public.ingresos;
  select count(*) into v_total_turnos from public.appointments;
  select count(*) into v_total_clientes from public.clientes;
  select count(*) into v_total_no_show from public.appointments where status = 'no_show';

  insert into public.metricas (
    id,
    total_ingresos,
    total_turnos,
    total_clientes,
    total_no_show,
    updated_at
  )
  values (
    target_id,
    v_total_ingresos,
    v_total_turnos,
    v_total_clientes,
    v_total_no_show,
    now()
  )
  on conflict (id)
  do update set
    total_ingresos = excluded.total_ingresos,
    total_turnos = excluded.total_turnos,
    total_clientes = excluded.total_clientes,
    total_no_show = excluded.total_no_show,
    updated_at = excluded.updated_at;

  return null;
end;
$$ language plpgsql;

drop trigger if exists refresh_metricas_from_appointments on public.appointments;
create trigger refresh_metricas_from_appointments
after insert or update or delete on public.appointments
for each statement
execute function public.refresh_metricas_snapshot();

drop trigger if exists refresh_metricas_from_ingresos on public.ingresos;
create trigger refresh_metricas_from_ingresos
after insert or update or delete on public.ingresos
for each statement
execute function public.refresh_metricas_snapshot();

drop trigger if exists refresh_metricas_from_clientes on public.clientes;
create trigger refresh_metricas_from_clientes
after insert or update or delete on public.clientes
for each statement
execute function public.refresh_metricas_snapshot();

alter table public.appointments enable row level security;
alter table public.clientes enable row level security;
alter table public.ingresos enable row level security;
alter table public.historial_clientes enable row level security;
alter table public.servicios enable row level security;
alter table public.horarios_trabajo enable row level security;
alter table public.metricas enable row level security;
alter table public.admins enable row level security;
alter table public.admin_logs enable row level security;
alter table public.system_settings enable row level security;

drop policy if exists "public read appointments" on public.appointments;
create policy "public read appointments"
  on public.appointments
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public write appointments" on public.appointments;
create policy "public write appointments"
  on public.appointments
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public read clientes" on public.clientes;
create policy "public read clientes"
  on public.clientes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public write clientes" on public.clientes;
create policy "public write clientes"
  on public.clientes
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public read ingresos" on public.ingresos;
create policy "public read ingresos"
  on public.ingresos
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public write ingresos" on public.ingresos;
create policy "public write ingresos"
  on public.ingresos
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public read historial_clientes" on public.historial_clientes;
create policy "public read historial_clientes"
  on public.historial_clientes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public write historial_clientes" on public.historial_clientes;
create policy "public write historial_clientes"
  on public.historial_clientes
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public read servicios" on public.servicios;
create policy "public read servicios"
  on public.servicios
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public write servicios" on public.servicios;
create policy "public write servicios"
  on public.servicios
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public read horarios_trabajo" on public.horarios_trabajo;
create policy "public read horarios_trabajo"
  on public.horarios_trabajo
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public write horarios_trabajo" on public.horarios_trabajo;
create policy "public write horarios_trabajo"
  on public.horarios_trabajo
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public read metricas" on public.metricas;
create policy "public read metricas"
  on public.metricas
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public write metricas" on public.metricas;
create policy "public write metricas"
  on public.metricas
  for all
  to anon, authenticated
  using (true)
  with check (true);
