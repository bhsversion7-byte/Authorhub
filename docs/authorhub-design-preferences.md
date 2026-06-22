# AuthorHub Design Preferences

This file records the active visual and engineering preferences for AuthorHub polish passes.

## Product Summary

- AuthorHub is a private manuscript atlas for writers. It helps a user organize author identity, reading/display preferences, novels, outlines, settings, themes, character relationship graphs, character detail cards, timelines, reference images, and account/data operations.
- The site is not a generic landing page after login. The logged-in app is the product surface: a writing cockpit with a persistent sidebar, paper background, music player, author dashboard, user center, and per-novel workspace.
- Data is privacy-first. Authenticated content is tied to the current account, with local fallback/cache behavior when cloud sync is unavailable. The user-facing copy should stay calm and privacy-aware.

## Functional Regions To Preserve

- Landing gateway: cinematic 3D book, quote atmosphere, "开始落墨", login/register panel, and the two landing fonts 香萃刻宋 and 油印体.
- Sidebar / preview frame: logo, 作者主页, 用户中心, manuscript index, individual novel entries, add novel button, and the small collapse control. It is the main navigation and should remain stable.
- Author profile: editable author identity fields, creation progress ring, global reading settings, font size, font family, day/night mode, and privacy blur.
- User center: username/email, day/night switch, password change, JSON/Markdown export, clear data, logout, unregister account, feedback email, donation panel, and privacy-protected QR reveal.
- Novel section: yellow novel selection/header card, outline card, setting card, theme tag card, platform/publish pill, and editable metadata.
- Relation graph: dotted star-map canvas, add character, focus/reset controls, draggable character nodes, relationship labels, graph/detail split adjustment, and right-side character detail editor.
- Character detail: image upload/URL, name, age, role, tags, custom tags, planet color palette, background story, hidden setting, save/delete character, relationship creation/clear controls.
- Timeline flow: event cards, add time point, left/right timeline navigation, selected event editor, background/plot focus editors, reference images, AI handoff buttons, save/delete time point.
- Floating music player: visible but low-interference control for play/pause, previous/next, track metadata, collapse, and drag positioning.
- Guided onboarding: seven live-target steps for sidebar preview, author profile, user center, music player, novel cards, relation graph/detail, and timeline.

## Core Direction

- Visual mood: jazz cafe, paper texture, low-saturation Morandi colors, editorial, refined but approachable.
- Keep the current functional regions and overall aesthetic logic intact. Do not redesign the product unless explicitly requested.
- Cards need clear distinction. They should not blur into one flat surface, and should not feel cold or metallic.
- Page background should keep the landing-page paper environment quality: visible, textured, not a flat solid color.
- Light mode and dark mode should correspond to each other. Dark mode is not color removal; card colors should be darker companion versions of light mode colors.
- Avoid cold metallic surfaces, abrupt neon glow, square form language, and generic AI SaaS gradients. Warm paper, ink, Morandi companion colors, and editorial hierarchy are the baseline.
- The landing page must preserve the two designated fonts: 香萃刻宋 and 油印体. Performance improvements cannot remove these fonts.

## Color And Surface Map

- Global background: high-quality landing-page paper texture, visible and clear, never replaced by a flat solid color.
- Novel selection/header card: uniform Morandi yellow `#F3E5AB`, not a gradient.
- Outline card: light grey rice-paper surface.
- Setting card: matte blue-stone grey companion surface.
- Theme tag card: soft lilac/purple surface.
- Relation graph: muted green-grey star-map surface with dotted grid.
- Character detail: warm beige paper card.
- Timeline: light green companion in light mode, deep green companion in dark mode.
- Author profile card: warm cream/brown companion in dark mode.
- Progress card: green companion surface; the white progress-ring center keeps dark ink text in dark mode.
- User account/donation cards: soft green and blue/grey companion surfaces.
- Destructive actions: muted rose/red surface matching confirm delete buttons.
- Primary manuscript actions: dark coffee/ink button with white text.

## Interaction Rules

- Card hover state: keep a subtle micro-bounce and a visible border reveal.
- Card hover state: do not add bright highlight, glow, or abrupt color changes unless a component specifically needs it.
- Active state: small press-down or scale response is preferred.
- Avoid Windows-side flicker and heavy animation. Motion should be restrained and performant.
- Hover and active states should feel like a soft paper lift or press, not a color replacement. When a card already has a light/dark companion color, hover should preserve that surface.
- Guided onboarding should use short copy, a clear arrow pointing to the live target, and a skip option at every step. It should introduce preview/navigation, author home, user center, music player, novel cards, relation graph/person detail, and timeline.
- Guided onboarding should not blur, darken, or over-highlight the application behind it. Users must see the live UI clearly while following the arrow.
- Confirmation modals should be viewport-owned overlays with full-app blur. They should not look like inline blocks inside a card.

## Fields And Tags

- Editable text fields can use a soft borderless micro-highlight frame.
- Attribute labels/tags themselves should not get a high-highlight treatment.
- Avoid square borders. Rounded, paper-like, soft-edge controls are preferred.
- Do not change existing colors casually. Use precise local fixes.
- Editable fields should keep the same rounded micro-highlight in default, hover, focus, and dark mode unless there is a functional error state.
- Tags, pills, and labels should remain readable but not over-highlighted. They are metadata, not primary actions.
- Focus/expanded text editors must remain readable in both modes; text, placeholder, and save/exit buttons need explicit dark-mode contrast.

## Button Rules

- Same semantic action means same visual language. For example, 保存人物 and 添加连线 are both primary relationship actions and should share background, border, text color, hover, and active behavior.
- 删除人物, 清空关系选择, and 删除时间点 are destructive actions and should share the same red background, fine outer border, white text, and active micro-press in both light and dark mode.
- 确认注销 inside the unregister modal should match 确定删除 danger modal styling.
- Buttons should not become low-contrast in dark mode. Icons must inherit the button text color.

## Implementation Rules

- Fix root causes and CSS ownership/override problems instead of piling on broad overrides.
- Keep edits scoped to the component or state that is broken.
- Clean redundant CSS when it is safe, but do not refactor unrelated areas during visual polish.
- Landing book should be immediate, responsive, and tactile: automatic page motion may continue until the reader grabs/drags the book; dragging should control page direction directly.
- Day/night mode is a user preference and must persist across refreshes.
- Do not add "loading manuscript" effects to normal page changes. Only account/session handoff may show a clean, simple privacy-space loader.
- Avoid repeated CSS memory layers. Prefer identifying which selector owns the broken state, then either remove the obsolete rule or place a tightly scoped final correction.
- Do not delete or change established feature zones while cleaning CSS. CSS cleanup should migrate final rules back to their owning component/area without changing behavior.
- Do not reintroduce old "loading manuscript" page transitions. Page changes should feel immediate.
- Do not reintroduce the old `bookcover.png` dependency; the landing book cover is procedurally designed in code.

## Dark Mode Rules

- Dark mode should echo the light mode surfaces: cream/yellow cards become muted amber companions, green cards become deep green companions, purple cards become deep plum companions.
- Text inside bright paper centers, such as the author progress ring, should keep dark ink even when the surrounding card is dark.
- Music player, add buttons, focus editors, tag chips, and modal buttons require explicit dark-mode readability checks.
- Dark mode is not a pure black skin. It should still feel like paper, ink, warm cafe light, and quiet editorial depth.

## Preserved Fixes And Decisions

- Day/night mode is persisted locally and should survive refreshes.
- The privacy-space loading state uses a small clean loader. It must be visible and not hidden by old `.loading-orbit` rules.
- Landing book auto-flips on page open and drag controls page progress directly. Mouse hover alone should not take over page turning.
- "开始落墨" closes the book and enters auth without a dramatic zoom.
- Logo wrapper has no grey mask or accidental border; logo lightbox close button belongs in the upper-right of the lightbox.
- Sidebar collapse button should appear as a single visible control, not duplicated.
- Preview/media carousel typography follows global font size/family settings.
- Cards keep hover micro-bounce plus border reveal, without hover glow/highlight color shifts.
- Focus/expanded editors are readable in light and dark mode.
- Dark mode music player text, add-novel/add-time buttons, tag chips, and modal actions have explicit contrast.
- Onboarding uses live target arrows and clear UI behind it; skip is available at each step.
- Unregister and delete confirmation modals are viewport-owned and use full-app blur, but onboarding does not.
