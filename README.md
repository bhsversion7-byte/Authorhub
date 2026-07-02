# AuthorHub

AuthorHub is a private workspace for fiction writers who need more than a blank document. It brings together outlines, settings, theme tags, character details, relationship graphs, timelines, reference images, sharing, and export tools in one calm manuscript desk.

The project is built for long writing sessions: warm paper textures, compact controls, readable panels, and a layout that keeps the story structure visible without turning the page into a generic dashboard.

[Open AuthorHub](https://authorhub.cn)

## Screenshots

![AuthorHub landing page](docs/screenshots/landing.jpg)

![AuthorHub workspace](docs/screenshots/workspace.png)

## What You Can Do

- Keep multiple novels in one author workspace.
- Write and revise outlines, settings, theme tags, and publishing metadata.
- Build a character relationship graph with draggable nodes and editable relationship labels.
- Store character details, private notes, tags, colors, and reference images.
- Arrange timeline events manually with drag ordering.
- Share a novel as a read-only public link, choosing which sections are visible.
- Invite a collaborator into a shared editing version.
- Export your work to JSON or Markdown.
- Use local fallback storage when the backend is not configured.

## Privacy Model

AuthorHub treats draft data as private user data.

- The production app uses Supabase Auth before loading a workspace.
- Private manuscript data is stored per user in Supabase with row-level security.
- Public read-only links are token-based and server-filtered.
- Read-only sharing removes private fields such as hidden notes and secrets.
- Image uploads are moved to Supabase Storage when available, so large images do not keep bloating the main document JSON.

## Tech Stack

- React 19
- Vite 8
- Supabase Auth, Postgres, RLS, and Storage
- D3 for the relationship graph
- Three.js / React Three Fiber for the landing book
- SortableJS for manual ordering
- lucide-react for icons

## Local Development

```bash
git clone https://github.com/bhsversion7-byte/Authorhub.git
cd Authorhub
npm install
npm run dev
```

The dev server runs at:

```text
http://localhost:6173
```

Create a local `.env` from `.env.example` when you want to connect Supabase:

```bash
cp .env.example .env
```

Without Supabase variables, the app can still run in local demo mode for interface review.

## Useful Checks

```bash
npm run build
npm run verify:markdown
npm run verify:share
npm run verify:graph
npm audit --omit=dev
```

## Notes For Contributors

Please do not commit local drafts, exported manuscripts, `.env` files, Vercel output, Supabase temp files, or generated QA screenshots. The repository keeps those paths ignored by default.

The visual direction should stay quiet and task-focused: manuscript paper, Morandi colors, clear typography, restrained motion, and controls that feel familiar to writers using the tool every day.

## Feedback

Questions, bug reports, and writing-workflow ideas are welcome.

Email: [bhsversion@163.com](mailto:bhsversion@163.com?subject=AuthorHub_Feedback)
