create extension if not exists pgcrypto;

-- Core catalog of services offered in booking flow.
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  duration integer not null check (duration > 0),
  created_at timestamptz not null default now(),
  unique (name)
);

-- CRM base table.
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  total_completed integer not null default 0 check (total_completed >= 0),
  is_recurrent boolean not null default false,
  created_at timestamptz not null default now()
);

-- Operational appointments table.
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  date date not null,
  time time without time zone not null,
  status text not null check (
    status in ('PENDIENTE', 'COMPLETADO', 'NO_VINO_AVISO', 'NO_SHOW', 'CANCELADO')
  ),
  price_snapshot numeric(12, 2) not null check (price_snapshot >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevents double booking in same slot unless previous one was cancelled.
create unique index if not exists uq_appointments_slot_active
  on appointments(date, time)
  where status <> 'CANCELADO';

create index if not exists idx_appointments_date on appointments(date);
create index if not exists idx_appointments_status on appointments(status);
create index if not exists idx_appointments_date_time on appointments(date, time);
create index if not exists idx_appointments_client on appointments(client_id);

-- Accounting log generated only when appointment is completed.
create table if not exists revenue_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references appointments(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_revenue_logs_date on revenue_logs(date);
create index if not exists idx_revenue_logs_client on revenue_logs(client_id);

create or replace function touch_appointment_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_appointments_touch_updated_at on appointments;
create trigger trg_appointments_touch_updated_at
before update on appointments
for each row
execute function touch_appointment_updated_at();
