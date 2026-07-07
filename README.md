<div align="center">

<img src="public/authorhub-logo.png" alt="AuthorHub" width="92" />

# AuthorHub · 落墨

**A private manuscript atlas for novelists.**
Not a text editor. Not a dashboard. A quiet writing desk where your whole story universe — outlines, settings, characters, timelines, references — lives in one place.

[**✦ Open the live app → authorhub.cn**](https://authorhub.cn)

**English** · [简体中文](./README.zh-CN.md)

<br/>

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20·%20Auth%20·%20RLS%20·%20Storage-3FCF8E?logo=supabase&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-force%20graph-F9A03C?logo=d3dotjs&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-R3F-000000?logo=threedotjs&logoColor=white)
![SortableJS](https://img.shields.io/badge/SortableJS-drag%20%26%20drop-1B9E4B)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)

</div>

<p align="center">
  <img src="docs/screenshots/landing.jpg" alt="AuthorHub landing page" width="820" />
</p>

---

## ✦ Why AuthorHub

A novel is rarely kept alive by its manuscript alone.

By the middle of a long book, character relationships tangle, timelines start fighting each other, and worldbuilding ends up scattered across chat logs, notes apps, and your own head. AuthorHub exists for exactly that mess: it lets you **see the structure of your story without leaving the flow of writing it** — and keeps your private drafts genuinely private while you do.

The interface stays warm, papery, and low-distraction on purpose. The features can be rich; using them should never feel like operating a cold enterprise system.

<p align="center">
  <img src="docs/screenshots/workspace.png" alt="AuthorHub workspace" width="820" />
</p>

## ✨ Features

| | |
|---|---|
| 📚 **Multi-novel workspace** | Every novel keeps its own outline, settings, tags, cover color, and publishing links. |
| 🌌 **Character relation star-map** | A D3 force graph with draggable nodes, focus/reset, main-character centering, relationship labels, and a highlighted main-pair line. Shift+drag to box-select stars, then right-click to lock their position - new characters won't reshuffle them. |
| 🧑‍🎨 **Rich character cards** | Images, age, role, **multi-select tags**, background, and a private hidden-settings field only you can see. |
| 🕰️ **Interactive timeline** | Drag events into narrative order — organized by story beats, not just dates. |
| 🏷️ **Themes & references** | Theme tags, world settings, reference images, and text cards, all drag-to-reorder in one place. |
| 🖋️ **Focus editor** | Expand outline/settings into an immersive full-page view, with optional page-by-page navigation for long documents, in-editor search, and a live word count. |
| 🔗 **Sharing & collaboration** | Generate a co-edit or read-only link, revoke it at any time, and see who's actively co-editing with you — readers only ever see the sections you choose to expose. |
| 🛡️ **Server-side privacy filtering** | Read-only shares strip hidden/secret fields and author-identifying links *on the server* — not just hidden in the client. |
| 📤 **Export your data** | One-click JSON and Markdown export so your archive always belongs to you. |
| ☁️ **Cloud sync + local safety net** | Signed-in edits sync to Supabase, with an immediate local cache so a crash or flaky network never eats your work. |
| 🎐 **Little delights** | A cinematic 3D book on the landing page, a floating jazz-café music player, drifting literary quotes, and reading-font controls. |

## 🎨 Design philosophy

AuthorHub is meant to be **quiet, literary, and comfortable to sit inside for hours.**

We favor paper texture, soft Morandi tones, clear button states, and a stable layout — no showy animation, nothing that steals attention from the story itself. It should feel like a writing desk that's been used with care, not a page built to show off its tech.

## 🔒 Privacy & data

Drafts are treated as private by default.

- The workspace requires sign-in; documents are isolated per user and guarded by **Supabase Row-Level Security**.
- Share links are token-based and never expose your whole workspace.
- Read-only shares remove `secret` / `hidden` / `privateNote` fields **and** author-identifying platform links, filtered server-side.
- Images migrate to Supabase Storage so large files don't bloat the main document.
- The local manuscript cache is cleared on **sign-out and account deletion**, so signing out on a shared computer leaves nothing behind.
- A single cloud-load failure can never let stale fallback data overwrite your real cloud document.

## 🧱 Tech stack

<div align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-F9A03C?logo=d3dotjs&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?logo=threedotjs&logoColor=white)
![SortableJS](https://img.shields.io/badge/SortableJS-1B9E4B)
![Lucide](https://img.shields.io/badge/lucide--react-F56565?logo=lucide&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

</div>

- **React 19 + Vite 8** — the app shell and build.
- **Supabase** — Auth, Postgres, Row-Level Security, and Storage.
- **D3.js** — the force-directed character relationship graph.
- **Three.js / React Three Fiber** — the cinematic landing-page book.
- **SortableJS** — drag-to-reorder for novels, timeline events, and tags.
- **lucide-react** — the icon set.
- **Cloudflare Turnstile** — an optional bot-detection layer on top of a self-hosted numeric captcha.

## 🚧 Status

AuthorHub is under active, careful refinement. The current focus is making the core writing experience rock-solid: share permissions, cloud save, mobile touch, star-map performance, timeline ordering, and export backups all keep getting polished.

If you're using it, the friction you hit in real writing is the most valuable feedback there is — small annoyances matter, because this tool is built for long, repeated use.

## 💬 Feedback

Bugs, ideas, and impressions are all welcome:

**[bhsversion@163.com](mailto:bhsversion@163.com?subject=AuthorHub_Feedback)**

<div align="center">
<br/>
<sub>Made for writers who keep a whole world in their head — <a href="https://authorhub.cn">authorhub.cn</a></sub>
</div>
