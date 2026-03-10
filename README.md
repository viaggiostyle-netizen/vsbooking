This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Auth Setup (Google + Admin Whitelist)

This project protects `/auth` and `/admin` using Google OAuth + a dynamic whitelist in `public.admins`.

### Required environment variables

Set these in local `.env.local` and in production (for example: Vercel Project Settings -> Environment Variables):

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

NEXTAUTH_URL=...
NEXTAUTH_SECRET=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Production note:
- `NEXTAUTH_URL` must be your public domain (for example `https://your-domain.com`).
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser.

### Google OAuth configuration

In Google Cloud Console (OAuth client type: Web application), configure:

- Authorized JavaScript origins:
  - `http://localhost:3000`
  - `https://your-domain.com`
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://your-domain.com/api/auth/callback/google`

### Supabase whitelist setup

Run in Supabase SQL Editor:

```sql
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_admins_email
  on public.admins(lower(email));

alter table public.admins enable row level security;
```

Insert initial admins:

```sql
insert into public.admins (email)
values
  ('camiloviaggio01@gmail.com'),
  ('viaggiostyle@gmail.com')
on conflict (email) do nothing;
```

### Validation checklist

1. Open `/api/auth/google-ready` -> should return `configured: true`.
2. Authorized email logs in -> redirected to `/admin`.
3. Non-authorized email -> `404`.
4. Admin management page `/admin/admins`:
   - can add/remove admins,
   - cannot delete last admin,
   - cannot delete current logged admin from the same session.
