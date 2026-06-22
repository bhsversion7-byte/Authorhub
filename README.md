<div align="center">

# 📖 AuthorHub · 落墨

### A privacy-first creative command center for fiction writers
### 写作者的隐私优先创作中台

[**🌐 Live Demo · authorhub.cn**](https://authorhub.cn) &nbsp;·&nbsp; [**▶️ Vercel Mirror**](https://author-hub-public.vercel.app) &nbsp;·&nbsp; [English](#-english) &nbsp;·&nbsp; [简体中文](#-简体中文)

[![Live](https://img.shields.io/badge/Live-authorhub.cn-4A6357?style=flat-square)](https://authorhub.cn)
![React](https://img.shields.io/badge/React-19-2C2621?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-8-6C5E7A?style=flat-square&logo=vite)
![D3](https://img.shields.io/badge/D3.js-graph-8C6239?style=flat-square&logo=d3dotjs)
![three.js](https://img.shields.io/badge/three.js-3D-2E4C6D?style=flat-square&logo=threedotjs)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-4A6357?style=flat-square&logo=supabase)
![License](https://img.shields.io/badge/License-MIT-B5A48F?style=flat-square)

*Turn scattered character notes, relationship maps, timelines, and worldbuilding into one warm, manuscript-first workspace — wrapped in a **Midnight Jazz Cafe** aesthetic of cream paper, Morandi ink, and quiet editorial depth.*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bhsversion7-byte/Authorhub)

</div>

---

## 🌟 English

**AuthorHub** is a private *atlas* for story universes. Most writing tools are either a blank linear page or a cold enterprise dashboard. AuthorHub is built for the messy, interconnected reality of fiction: characters who pull at each other, timelines that branch, settings that need to stay consistent across hundreds of thousands of words — all in a space calm enough to live in during long writing sessions.

> Build character constellations, edit relationships right on the graph, keep your outline, settings, timeline and publishing links together, and never hand your private drafts to a black box.

### ✨ Highlights

| | Feature |
|---|---|
| 🎬 | **Cinematic landing** — a procedurally-rendered 3D book (three.js) you can drag open to enter your studio. No stock cover image. |
| 🔒 | **Privacy-first auth wall** — Supabase Auth gates the app *before* any private data loads, with a server-verified captcha and a graceful offline/local fallback. |
| 🌌 | **Force-directed relation graph** — D3-powered character "planets" you can drag, with inline-editable relationship labels, protagonist aura, tag badges, and focus isolation. |
| 🧑‍🎤 | **Adaptive character cards** — image carousel, custom tags, Morandi color picker, long-form background and a private *hidden-setting* field. |
| 🗂️ | **Drag-to-reorder novels** — reorder your manuscripts in the sidebar with a smooth SortableJS row-drag; order persists. |
| 🕰️ | **Timeline workspace** — horizontal event cards with reference media and gentle research links. |
| 🤖 | **One-click AI handoff** — copies a structured prompt of your universe and opens ChatGPT, DeepSeek, or Claude for plot-hole and worldbuilding review. |
| 🎷 | **Floating jazz player** — a draggable, collapsible, cross-page audio companion for deep-work sessions. |
| 🌗 | **Calm, configurable** — day/night mode, font family & size, and a one-key **privacy blur** (press `Esc`) to hide everything when someone walks by. |
| 💾 | **Local-first & portable** — works offline via localStorage, syncs to the cloud (debounced), and exports your whole universe to **JSON or Markdown** anytime. |

### 🧱 Tech stack

`React 19` · `Vite 8 (Rolldown)` · `D3.js` · `three.js / React-Three-Fiber` · `Supabase (Auth + Postgres + RLS)` · `SortableJS` · `Vercel`

### 🚀 Quick start

```bash
git clone https://github.com/bhsversion7-byte/Authorhub.git
cd Authorhub
npm install
cp .env.example .env.local   # optional — runs in local demo mode without it
npm run dev                  # http://localhost:6173
```

Without Supabase variables, AuthorHub runs a **local demo auth** flow so you can explore the full interface immediately.

### ⚙️ Connect Supabase (optional)

Create a free Supabase project and set only the **public** frontend variables:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Run [`supabase.schema.sql`](./supabase.schema.sql) in the SQL editor to create the `profiles` and `author_hub_documents` tables (Row Level Security included).

For real signups, set a private **`CAPTCHA_SECRET`** environment variable in your hosting platform — the captcha API requires it and fails closed without it. Never commit service-role keys, database passwords, or manuscript files.

### ▲ Deploy

One-click with the Vercel button above, or:

```bash
npm run build
npx vercel --prod
```

Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `CAPTCHA_SECRET` in your project settings before enabling real users.

### 🛡️ Privacy & safety

Auth gate before the interface · client-side image workflow with a 5 MB upload guard · JSON/Markdown export · full data-clear control · private drafts ignored by `.gitignore` · localStorage fallback for offline continuity. For a larger hosted beta, add Supabase Storage policies, Edge Function rate limiting, and database backups.

### 💌 Feedback & License

Creator feedback and story-structure ideas welcome: [bhsversion@163.com](mailto:bhsversion@163.com?subject=AuthorHub_Feedback)

Released under the **MIT License** — fork it, bind your own Supabase project, and shape your own private writing hub.

---

## 🪶 简体中文

**AuthorHub（落墨）** 是一个为虚构创作者打造的「隐私优先创作中台」。它不是一张冰冷的空白文档，也不是企业级后台报表，而是一座可以长时间停留的**故事宇宙地图**：人物彼此牵引、时间线不断分叉、设定需要在几十万字里保持自洽——这一切都被收进一个温暖、克制、以手稿为中心的工作空间。

> 搭建人物星图，在关系图上直接编辑羁绊，把大纲、设定集、时间线与发布链接放在一起，永远不必把私密草稿交给黑盒。

默认视觉语言是 **午夜爵士咖啡馆（Midnight Jazz Cafe）**：奶油纸张、莫兰迪墨色、衬线编辑感与柔和的物理阴影。

### ✨ 核心亮点

| | 功能 |
|---|---|
| 🎬 | **电影感入场** —— 代码程序化生成的 3D 书籍（three.js），拖动翻开即进入你的创作工作室，不依赖任何封面图片。 |
| 🔒 | **隐私优先门禁** —— Supabase 认证在任何私密数据加载**之前**先拦截，配合服务端校验的图形验证码与离线本地回落。 |
| 🌌 | **力导向关系星图** —— D3 驱动的人物「星球」可自由拖拽，关系标签可在图上直接编辑，含主角光环、标签徽章与聚焦隔离。 |
| 🧑‍🎤 | **自适应人物卡** —— 图片轮播、自定义标签、莫兰迪取色器、长篇背景与私密「隐藏设定」字段。 |
| 🗂️ | **小说拖拽排序** —— 用顺滑的 SortableJS 行拖拽在侧栏重排你的作品，顺序自动保存。 |
| 🕰️ | **时间线工作区** —— 横向事件卡片，支持参考图与温和的资料检索入口。 |
| 🤖 | **一键 AI 接力** —— 自动整理你的设定为结构化提示词，并打开 ChatGPT / DeepSeek / Claude 帮你查逻辑漏洞与考据世界观。 |
| 🎷 | **悬浮爵士播放器** —— 可拖拽、可收起、跨页面的音乐伴侣，陪你进入深度写作。 |
| 🌗 | **安静且可配置** —— 日间/夜间模式、字体与字号设置，以及一键 **隐私模糊**（按 `Esc`），有人路过时瞬间隐藏全部内容。 |
| 💾 | **本地优先且可迁移** —— 离线时用 localStorage 工作，联网后防抖同步云端，并可随时导出整个宇宙为 **JSON 或 Markdown**。 |

### 🧱 技术栈

`React 19` · `Vite 8 (Rolldown)` · `D3.js` · `three.js / React-Three-Fiber` · `Supabase（认证 + Postgres + 行级安全）` · `SortableJS` · `Vercel`

### 🚀 一分钟启动

```bash
git clone https://github.com/bhsversion7-byte/Authorhub.git
cd Authorhub
npm install
cp .env.example .env.local   # 可选——不配置也能进入本地演示模式
npm run dev                  # http://localhost:6173
```

未配置 Supabase 变量时，AuthorHub 会启用**本地演示门禁**，让你立即体验完整界面。

### ⚙️ 接入 Supabase（可选）

新建一个免费 Supabase 项目，只设置**公开**前端变量：

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

在 SQL 编辑器中执行 [`supabase.schema.sql`](./supabase.schema.sql) 创建 `profiles` 与 `author_hub_documents` 表（已内置行级安全策略）。

正式开放注册时，请在托管平台设置私密的 **`CAPTCHA_SECRET`** 环境变量——验证码接口依赖它，缺失时会安全拒绝。切勿提交 service-role 密钥、数据库密码或手稿文件。

### ▲ 部署

点击上方 Vercel 按钮一键部署，或：

```bash
npm run build
npx vercel --prod
```

正式上线前，在项目设置中添加 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 与 `CAPTCHA_SECRET`。

### 🛡️ 隐私与安全

进入界面前先过认证门禁 · 客户端图片流程含 5MB 上传保护 · 支持 JSON/Markdown 导出 · 提供一键清空数据 · 私密草稿默认被 `.gitignore` 忽略 · localStorage 离线续写回落。若要做更大规模的公测，建议补充 Supabase Storage 策略、Edge Function 限流与数据库备份。

### 💌 反馈与许可

欢迎创作者反馈与故事结构建议：[bhsversion@163.com](mailto:bhsversion@163.com?subject=AuthorHub_Feedback)

基于 **MIT 许可证** 发布——欢迎 fork、绑定你自己的 Supabase 项目，打造属于你的私密创作中台。

<div align="center">

---

*Made for storytellers. 为讲故事的人而做。* ✍️

[⬆️ Back to top](#-authorhub--落墨)

</div>
