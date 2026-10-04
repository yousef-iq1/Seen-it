# Seen It

Seen It is a bilingual movie and TV discovery application that learns from user preferences and turns them into personalized recommendations.

## Highlights

- Personalized swipe-based recommendation flow
- Large catalog hosted separately for fast search and ranking
- Responsive mobile-first interface
- Arabic and English with RTL/LTR support
- Email/password accounts with Supabase Auth and cross-device sync
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

1. Create a Supabase project.
2. Apply `supabase/SETUP.sql`.
3. Deploy the protected registration function used for immediate email/password account creation.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the web service.
5. Host `catalog.json` and `overviews.json` in a public storage bucket and set `NEXT_PUBLIC_DATA_BASE_URL`.

Account deletion is performed by an authenticated database RPC and does not require a privileged Supabase key in the web-service environment.

## Deployment

A Render blueprint is included in `render.yaml`. The site can also be deployed manually as a Node web service using:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Node: 22

## Repository safety

Do not commit `.env*` files, access tokens, passwords, or server-side secrets. Only the Supabase publishable key belongs in browser configuration.

For the full production setup, see `DEPLOYMENT.md`.
