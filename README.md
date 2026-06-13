# AuthorHub

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bhsversion7-byte/Authorhub)
![React](https://img.shields.io/badge/React-19-2C2621)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20Ready-4A6357)
![Vercel](https://img.shields.io/badge/Vercel-Deployable-2C2621)
![License](https://img.shields.io/badge/License-MIT-B5A48F)

AuthorHub is a privacy-first creative command center for novel writers, fanfic authors, worldbuilders, and indie creators. It turns scattered character notes, relationship maps, timelines, publication links, and author metadata into a single warm, high-density writing workspace.

The default visual language is **Midnight Jazz Cafe**: cream paper, Morandi ink tones, serif editorial rhythm, soft physical shadows, and compact SaaS-grade information density.

## Why AuthorHub

Most writing tools are either too linear or too cold. AuthorHub is designed for story universes:

- Build character planets and relationship lines visually.
- Edit relation labels directly from the graph or the right-side panel.
- Keep timelines, settings, outline, platform URLs, and media references together.
- Export your universe as JSON or Markdown.
- Stay privacy-first with Supabase Auth and localStorage failover.
- Deploy your own private writing hub to Vercel in minutes.

## Product Highlights

- **Instant auth wall**: Supabase Auth blocks the app before private data loads.
- **Native guided tour**: no black-box onboarding library, no harsh dark overlay. A hand-built `TourProvider` uses glowing arrows, warm bubbles, smooth scroll, and one-time persistence.
- **Force-directed relation graph**: D3-powered character planets, draggable nodes, editable edge labels, tag badges, protagonist aura, and focus isolation.
- **Adaptive character cards**: image carousel, responsive attribute grid, custom tags, Morandi color picker, long-form background and hidden-setting fields.
- **Timeline workspace**: horizontal card slider, media-ready event cards, and gentle links to ChatGPT, DeepSeek, and Claude for background research.
- **Dedicated user center**: username, email, password update, JSON/Markdown export, cloud data clear, logout, feedback email, and privacy-blurred donation QR panels.
- **Floating jazz player**: draggable, collapsible, cross-page audio widget with public-domain jazz samples and graceful error skip.
- **Local-first fallback**: when Supabase or the network is unstable, data stays in localStorage and the app continues working.

## Screenspace Philosophy

AuthorHub is tuned for the density writers often prefer at 80 percent browser zoom, but applied directly in CSS so the app feels right at 100 percent. Typography stays inside a restrained 10px-28px scale, with form controls and cards tightened for professional dashboard use.

## Tech Stack

- React 19
- Vite
- D3.js
- Supabase Auth
- LocalStorage offline fallback
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

Without Supabase variables, AuthorHub uses a local demo auth flow so you can inspect the interface immediately.

## Supabase Setup

Create a free Supabase project, then set only the public frontend variables:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Never commit service role keys, personal access tokens, database passwords, manuscript files, screenshots, or private exports.

## Deploy

### One-click

Use the Vercel button at the top of this README.

### CLI

```bash
npm run build
npx vercel --prod
```

Add your Supabase environment variables in Vercel Project Settings before enabling real users.

## Recommended GitHub Topics

`saas-template`, `supabase`, `relation-graph`, `novel-writer`, `author-tools`, `indie-hacker`

## Privacy & Safety

AuthorHub is built as a private writing companion:

- Auth gate before the main interface.
- Client-side image URL workflow and 5MB upload guard pattern.
- JSON and Markdown export.
- Full data clear control.
- `.env` and common private draft formats ignored by default.
- LocalStorage fallback for offline writing continuity.

For a larger hosted beta, add Supabase Row Level Security, Storage policies, Edge Function rate limiting, and database backups.

## Feedback

AuthorHub welcomes creator feedback and story-structure ideas:

[bhsversion@163.com](mailto:bhsversion@163.com?subject=AuthorHub_Feedback)

## License

MIT. Fork it, bind your own Supabase project, deploy your own private AuthorHub, and shape it around your fictional universe.
