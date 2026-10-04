# Seen It deployment

## Services required

- GitHub repository
- Render Web Service
- Supabase project

## Supabase

Apply `supabase/SETUP.sql`, create a public bucket for the catalog assets, and deploy the registration function used by the application.

The browser needs:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_DATA_BASE_URL=...
SEEN_IT_CATALOG_URL=...
```

The app uses email/password authentication. Registration creates an immediately active account through a rate-limited server-side Supabase function; no email-verification step is required. Account deletion uses an authenticated database RPC.

## Render

Create a Node web service from this repository.

- Runtime: Node
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Node: 22

The production service can run in guest mode if account variables are omitted, but cross-device sync and sharing require Supabase.

## Production checks

Verify:

- guest discovery and swiping
- catalog search and recommendations
- English and Arabic layouts
- email/password account creation and sign-in
- cloud sync after refresh
- public profile and public list links
- sign out and account deletion
