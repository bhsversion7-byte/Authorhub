# Author Hub Public Template

Privacy-first novel planning SaaS template with demo data, character graph, timeline, author center, donation card, privacy blur, dark mode, and platform URL binding.

## Local

```bash
npm install
npm run dev:any -- --host 127.0.0.1 --port 6732 --strictPort
```

## Build

```bash
npm run build
```

## Supabase

This public template ships with local demo storage. For production cloud sync:

1. Create a Supabase project.
2. Run `supabase.schema.sql`.
3. Add the following environment variables in Vercel or Cloudflare Pages:

```txt
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Supabase Auth should handle email/password registration. Do not store plaintext passwords in app state or custom tables.

## DNS

The deployed static build can be hosted on Cloudflare Pages or Vercel. For Cloudflare Pages custom domains, add the domain in Pages first, then update authoritative nameservers or DNS records as instructed by Cloudflare.
