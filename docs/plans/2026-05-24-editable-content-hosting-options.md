# PRANTE — editable text + hosted HTML animation options

Source context:
- `artifacts/telethon/2026-05-24/Цифровые_кафедры_Общий_проект/messages.md`
- `docs/telegram/digests/2026-05-24-cifrovye-kafedry.md`
- User direction: build HTML with animation first, then convert to video; team must be able to control/edit all visible text; avoid ad-hoc custom CMS/framework hacks.

## Core requirement

We need a hosted PRANTE prototype where Hermes/code owns layout, animation, and product flow, while Alex/team can edit all visible text through a convenient non-developer surface.

## Non-negotiables

- Visible copy must not be hardcoded inside animation components.
- All text should live in structured content files or a CMS schema.
- The hosted site must have a stable public URL for the team.
- Team edits should be reviewable and reversible.
- Before video export, we should freeze a content version and render video from that exact version.

## Recommended content model

Keep text separate from UI code:

```text
content/
  site.json              # landing/hero copy
  bot-flow.json          # Telegram bot messages, commands, buttons
  analysis-demo.json     # repeats, terms, glossary candidates, draft translation
  handoff.md             # text for Alsu/team handoff
```

The HTML/React/Astro/Next layer reads this content and renders the animated prototype.

## Option A — Netlify + Decap CMS + static/Astro site

### What it is

A static site hosted on Netlify, with `/admin` powered by Decap CMS. Editors log into a browser UI, edit structured fields, and Decap commits changes to the Git repo.

### Why it fits

- Established open-source Git-based CMS.
- Works with static sites and Jamstack.
- Git Gateway + Netlify Identity can allow editors to edit without direct GitHub repo access.
- Very good for a short school/project prototype.

### Pros

- Fastest realistic setup.
- No database or custom backend.
- Every text edit becomes a Git commit.
- Easy rollback/history.
- Good enough editor UI for structured content.
- Public URL is simple via Netlify.

### Cons

- Editor UI is functional, not beautiful.
- Preview is not as slick as TinaCMS.
- Git Gateway/Identity setup needs careful permissions.

### Best use

Use this if the priority is shipping quickly with the least infrastructure.

## Option B — TinaCMS + Next/Astro-style app

### What it is

Git-backed CMS with stronger visual editing and Markdown-first workflow. Content stays in Git, but editors get a more modern editing experience.

### Why it fits

- Tina stores content as Markdown/Git-backed files.
- Better visual editing story than Decap.
- More pleasant if the team will keep editing after the first submission.

### Pros

- Better editor UX.
- Git-native content.
- Cleaner schema/code relationship for modern React sites.
- More future-proof if PRANTE becomes a real project page.

### Cons

- More setup than Decap.
- Usually pushes us toward Next/React and Tina-specific config.
- May require TinaCloud/account decisions.
- Slower to set up under deadline.

### Best use

Use this if we care about a polished editing experience and are okay spending more setup time.

## Option C — Headless CMS: Sanity / Payload / Directus

### What it is

A real CMS/admin studio with structured content, roles, collaboration, and API delivery. The frontend reads content via API or build step.

### Pros

- Strong editing UI.
- Better collaboration/roles.
- More scalable if this becomes a real public product site.
- Sanity especially has good content studio ergonomics.

### Cons

- Overkill for the current task.
- Introduces database/API/vendor or hosting complexity.
- More moving parts before video export.
- Harder to keep the prototype simple and reproducible.

### Best use

Use this only if PRANTE is becoming a maintained product site beyond the school submission.

## Option D — Google Sheet / Airtable as copy table

### What it is

Put every visible string in a table, export/read it as JSON, and let the site render from that.

### Pros

- Very familiar for non-developers.
- Fast team editing.
- Lowest onboarding friction.

### Cons

- Versioning/review can get messy.
- Less structured than a CMS.
- Runtime API/export issues can break the hosted page.
- Easy to accidentally damage keys/structure.

### Best use

Use only as a temporary copy-review surface, not as the main production content source.

## Recommendation

Use **Option A: Netlify + Decap CMS + static/Astro/Vite site**.

Reason: it best matches the current need — hosted public prototype, team-editable text, no custom CMS, no database, and clean Git history. It is enough for PRANTE now and does not block future migration to Tina/Sanity if the project grows.

## Proposed implementation

1. Move all visible text from HTML into `content/*.json` / `content/*.md`.
2. Build the animated bot-first page from content files.
3. Add `/admin` with Decap CMS config:
   - Bot flow messages;
   - commands/buttons;
   - landing copy;
   - analysis demo terms;
   - handoff text.
4. Deploy to Netlify from GitHub repo.
5. Enable Identity/Git Gateway and invite team editors.
6. Team edits text through `/admin`.
7. Each edit creates a Git commit and rebuilds the hosted site.
8. When copy is approved, tag/freeze a version.
9. Convert the final hosted HTML animation to video from the frozen version.

## Definition of done

- Hosted public URL exists.
- `/admin` editor exists.
- At least Alex + team can edit text without touching code.
- All major visible text is CMS-controlled.
- HTML animation still works after content edits.
- Final video can be rendered from the same hosted page/version.

## Suggested team-facing explanation

> Я собираю анимированный HTML-прототип, но текст не будет зашит в код. Весь текст вынесем в удобную админку: сообщения бота, кнопки, термины, описания и лендинг. Вы сможете править формулировки через браузер, а код будет отвечать только за дизайн, анимацию и структуру сценария. После финального согласования мы заморозим версию и из неё сделаем видео.
