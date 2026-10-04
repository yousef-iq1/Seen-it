# Seen It deployment

## Services required

- GitHub repository
- Render Web Service
- Supabase project
- Google Cloud OAuth client for Sign in with Google

## 1. Create the Supabase project

Create a fresh Supabase project for this portfolio copy.

Open **SQL Editor**, paste the entire contents of `supabase/SETUP.sql`, and run it once.

## 2. Get the API values

From the Supabase project **Connect** / API keys area, copy:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Secret key (`sb_secret_...`) → `SUPABASE_SECRET_KEY`

The secret key is server-only. Never commit it or expose it to browser code.

## 3. Deploy to Render

Create a Render Web Service from the GitHub repository.

- Runtime: Node
- Build command: `npm install && npm run build`
- Start command: `npm start`

Add these environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

The site can boot without Supabase in guest mode, but accounts, cross-device sync, sharing, and permanent account deletion require these values.

## 4. Configure Google sign-in

In Google Auth Platform, create a **Web application** OAuth client.

Use the production Render origin as an Authorized JavaScript origin, for example:

```text
https://your-service.onrender.com
```

In the Google OAuth client, use the Supabase callback URL shown on the Supabase Google provider page as an Authorized redirect URI.

Then enable the Google provider in Supabase and enter the Google Client ID and Client Secret.

In Supabase **Authentication → URL Configuration**:

- Set the Site URL to the production Render URL.
- Add the production Render URL to the Redirect URLs list.
- After the custom domain is connected, add that URL too and make it the Site URL.

## 5. Verify the production copy

Check:

- guest discovery and swiping
- search and recommendations
- English and Arabic layouts
- Google sign-in
- cloud sync after refresh / another browser session
- public profile and public list links
- sign out
- account deletion
