# 🚛 Truck Tracking Master

A secure, production-ready vehicle and customer information management system built with Next.js 14, Supabase, TypeScript, and Tailwind CSS.

---

## ✨ Features

| Stage | Feature | Status |
|-------|---------|--------|
| 1 | Project foundation, layouts, responsive design | ✅ |
| 2 | Supabase connection, env config, DB tables | ✅ |
| 3 | Auth (login/logout/reset/update password) | ✅ |
| 4 | Role-based access (admin/user), RLS policies | ✅ |
| 5 | Admin dashboard, user management | ✅ |
| 6 | Excel/CSV upload, column mapping, import | ✅ |
| 7 | Vehicle search (name, reg, agreement, chassis, engine) | ✅ |
| 8 | Audit logs & activity tracking | ✅ |
| 9 | Location privacy (optional permission, no tracking) | ✅ |
| 10 | Security hardened, ready for Vercel deployment | ✅ |

---

## 🛠 Tech Stack

- **Framework**: Next.js 14 App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + custom design system
- **Components**: shadcn/ui (Radix UI primitives)
- **Auth**: Supabase Authentication
- **Database**: Supabase PostgreSQL with RLS
- **Storage**: Supabase Storage (private buckets)
- **Deployment**: Vercel

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and paste the contents of `supabase-schema.sql`
3. Run the SQL to create all tables, RLS policies, and triggers

### 3. Configure environment variables
```bash
cp .env.local.example .env.local
```
Fill in your Supabase credentials from **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` ← Server-only, never expose!

### 4. Create the first admin user
In Supabase Auth → Users, manually create a user, then in the SQL Editor run:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```

### 5. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🔒 Security Architecture

### Row Level Security (RLS)
Every table has RLS enabled:
- **Vehicles**: All authenticated users can read; only admins can write
- **Profiles**: Users see only their own; admins see all
- **Upload Batches**: Admins only
- **Audit Logs**: Users see their own; admins see all

### Server-Side Authorization
Every protected API route verifies the user's role server-side before execution. The `SUPABASE_SERVICE_ROLE_KEY` is **never** exposed to the frontend.

### Role Escalation Prevention
- RLS policy prevents users from changing their own role
- API routes verify admin role independently on every request
- Middleware redirects non-admins away from `/admin/*`

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (protected)/
│   │   ├── layout.tsx          ← Auth guard
│   │   ├── dashboard/          ← User dashboard + search
│   │   └── admin/              ← Admin panel (role-gated)
│   ├── api/
│   │   └── admin/
│   │       ├── users/          ← User CRUD API
│   │       └── import/         ← Excel import API
│   ├── login/
│   ├── reset-password/
│   └── update-password/
├── components/
│   ├── ui/                     ← Base components (shadcn/ui)
│   ├── layout/                 ← Dashboard shell & sidebar
│   ├── dashboard/              ← User-facing components
│   └── admin/                  ← Admin-only components
├── lib/
│   ├── supabase/               ← Client, server, middleware
│   ├── utils.ts
│   ├── validations.ts          ← Zod schemas
│   └── constants.ts
├── middleware.ts                ← Route protection
└── types/
    └── database.ts             ← TypeScript types
```

---

## 🚢 Deploy to Vercel

1. Push code to GitHub
2. Connect repo to [vercel.com](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy!

---

## 📋 Supabase Setup Checklist

- [ ] Run `supabase-schema.sql` in SQL Editor
- [ ] Enable Email auth in Auth → Providers
- [ ] Set Site URL and Redirect URLs in Auth → URL Configuration
- [ ] Create first admin user and update their role to `admin`
- [ ] Verify RLS is ON for all tables (Auth → Policies)
