# Seen It

Seen It is a bilingual movie and TV discovery application that learns from user preferences and turns them into personalized recommendations.

## Highlights

- Personalized swipe-based recommendation flow
- Large local catalog for fast search and ranking
- Responsive mobile-first interface
- Arabic and English with RTL/LTR support
- Supabase authentication and cross-device sync
- Public profiles and shareable lists
- Installable PWA with offline-friendly fallbacks
- Server-side ranking and search routes

## Stack

- Next.js
- React
- TypeScript
- Zustand
- Supabase
- Tailwind CSS
- Framer Motion

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The application can run in guest mode without Supabase. Add the public Supabase URL and publishable key to enable accounts and cloud sync.

## Production build

```bash
npm run build
npm start
```

## Supabase setup

1. Create a new Supabase project.
2. Open the SQL editor and apply the migration files in `supabase/migrations` in filename order.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the web service.
4. Add the Supabase service-role key to the server environment as `SUPABASE_SECRET_KEY`. It is used only by the server-side account-deletion route.
5. Configure Google as an authentication provider in the Supabase dashboard.

## Deployment

A Render blueprint is included in `render.yaml`. The site can also be deployed manually as a Node web service using:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Node: 22

## Repository safety

Do not commit `.env*` files, service-role keys, access tokens, passwords, or provider secrets. Public Supabase browser keys belong in the deployment environment rather than source files. The service-role key must remain server-only.


For the full production setup, see `DEPLOYMENT.md`.
