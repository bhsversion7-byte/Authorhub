# AuthorHub

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bhsversion7-byte/Authorhub)
![React](https://img.shields.io/badge/React-19-2c2a29)
![Supabase](https://img.shields.io/badge/Supabase-Auth-6c8b88)
![Vercel](https://img.shields.io/badge/Vercel-ready-2c2a29)

AuthorHub is a privacy-first, structured story-universe workspace for novel writers, fanfic authors, and indie creators. It combines an author dashboard, editable novel metadata, force-directed character relation graphs, rich timeline cards, local-first persistence, and a warm cream-colored reading interface designed for long writing sessions.

## Highlights

- Privacy-first auth wall powered by Supabase Auth, with a local demo fallback when no environment variables are configured.
- Obsidian-like character relation graph with draggable planets, editable edge labels, custom tags, soft protagonist aura, and focused relation editing.
- Timeline editor with horizontal slider controls, image carousels, and gentle handoff links to ChatGPT, DeepSeek, and Claude.
- Author center with export, clear data, donation QR placeholders, feedback mailto, reading settings, and privacy blur mode.
- Offline-first localStorage fallback so drafts stay available during network instability.
- Warm beige visual system with compact typography, serif headings, Morandi accents, and responsive panels.

## Tech Stack

- React 19
- Vite
- D3.js
- Supabase Auth
- LocalStorage persistence fallback
- Vercel static deployment

## 1-Minute Local Start

```bash
git clone https://github.com/bhsversion7-byte/Authorhub.git
cd Authorhub
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:6173`.

Without Supabase variables, AuthorHub uses a local demo auth gate so you can inspect the UI immediately. To enable real auth, create a Supabase project and fill:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

## Supabase Notes

Only the public anon key belongs in frontend env variables. Never commit `.env`, service role keys, personal drafts, exported data, screenshots, or private novel manuscripts. The repository `.gitignore` already excludes common private files and local environment files.

## Recommended GitHub Topics

`saas-template`, `supabase`, `relation-graph`, `novel-writer`, `author-tools`, `indie-hacker`

## Safety Model

AuthorHub is built as a local-first writing companion. Current safeguards include:

- Auth gate before the main interface.
- 5MB client-side limit for image file additions.
- Data export and clear controls.
- LocalStorage persistence fallback.
- `.env` and private draft file exclusions.

For production multi-user hosting, add database row-level security, storage upload policies, and per-user API rate limiting in Supabase Edge Functions or your API layer.

## License

MIT. Replace demo data, configure your own Supabase project, and deploy your own private AuthorHub.
