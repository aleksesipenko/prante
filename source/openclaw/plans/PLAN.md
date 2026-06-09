# PRANTE OpenClaw Translator MVP — build plan

Дата: 2026-06-09  
Host: WSL / `/home/alex`  
OpenClaw: `2026.6.1 (2e08f0f)`  
OpenClaw profile: `prante` → state under `~/.openclaw-prante`, workspace expected at `~/.openclaw/workspace-prante`  
PRANTE repo: `/home/alex/prante-repo` → `/mnt/c/Users/alex2/Desktop/ПРАНТЕ`  
Mode: single-user local WSL runtime, Telegram-first, no upstream OpenClaw patches.

## Upstream documentation checked

- `openclaw docs plugin architecture`
- `openclaw docs skills`
- `openclaw docs agents workspace`
- `openclaw docs telegram channel bot token`
- https://docs.openclaw.ai/tools/creating-skills
- https://docs.openclaw.ai/concepts/agent-workspace
- https://docs.openclaw.ai/plugins/building-plugins
- https://docs.openclaw.ai/plugins/tool-plugins
- https://docs.openclaw.ai/channels/telegram
- https://docs.openclaw.ai/tools/skills-config
- https://docs.openclaw.ai/gateway/config-agents
- https://docs.openclaw.ai/concepts/memory
- https://docs.openclaw.ai/plugins/manifest

Working interpretation from docs:

- Workspace files (`AGENTS.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `MEMORY.md`, `HEARTBEAT.md`, optional `BOOTSTRAP.md`) define the personal assistant behavior and memory policy.
- Skills are workspace-local procedural guidance: when to run workflows, how to interpret outputs, what not to overclaim.
- Plugins are deterministic runtime capabilities: typed tools registered through OpenClaw plugin SDK, with manifest contracts. They are the right place for repeat detection, glossary matching, segmentation, QA metrics, memory record operations, and any library-backed text analysis.
- OpenClaw memory is transparent file-backed Markdown in the workspace. For MVP, durable translator preferences and approved rules live in workspace memory files plus a deterministic SQLite store owned by the PRANTE plugin.
- Telegram single-user access should use allowlist with Alex's numeric Telegram id, not open public DM.

## Product scope

PRANTE is not Alfred-with-law-words-swapped. It is a personal translation assistant for one translator.

MVP capabilities must be useful through Telegram and CLI:

1. **Pre-translation analysis**
   - accept pasted text;
   - segment text;
   - count repeated segments/ngrams/frequent fragments;
   - extract term candidates;
   - identify style/readability risks;
   - return a concise translator-facing analysis.

2. **Glossary workflow**
   - detect source terms against the approved glossary;
   - propose term candidates from the current text;
   - allow the user to save/approve terms;
   - apply approved preferred/forbidden variants during QA and draft instructions.

3. **Translation memory / adaptive memory workflow**
   - store approved source ↔ target segment pairs;
   - retrieve fuzzy matches using deterministic scoring;
   - compare draft vs final translations;
   - propose post-edit patterns/rules;
   - never activate a rule automatically without user approval.

4. **Draft translation workflow**
   - the agent uses deterministic context from plugin tools first;
   - the LLM drafts/explains translation decisions second;
   - the response names constraints and caveats like a translator assistant, not like backend logs.

5. **QA workflow**
   - check terminology consistency;
   - flag missing/forbidden terms;
   - compare source/target segment counts and suspicious length ratios;
   - produce actionable QA warnings.

6. **Operator/diagnostic workflow**
   - `openclaw --profile prante status`, `doctor`, `status --deep`, plugin inspect/validate, channel probe, model probe, CLI agent message flow must be part of verification.
   - Final user-facing claims require real CLI/tool output.

## What belongs where

### Workspace bootstrap

`~/.openclaw/workspace-prante/AGENTS.md`

- translator-facing boundary;
- Telegram UX rules;
- anti-overclaim rules;
- product-first error language;
- no internal infra leakage;
- memory approval discipline;
- how to use tools and skills.

`SOUL.md`

- persona: “ПРАНТЕ” as calm, precise, Russian-speaking translation partner;
- direct but not chatty;
- asks clarifying questions only when needed for language pair/domain/client constraints;
- never pretends deterministic checks are subjective guesses.

`USER.md`

- single-user profile for Alex/operator in this MVP;
- translation preferences initially unknown;
- ask for target language/domain when absent;
- do not store smoke tests or operator chatter as translator facts.

`TOOLS.md`

- concrete tool map;
- PRANTE plugin tool names and expected usage;
- CLI test commands;
- fallback behavior if a tool errors.

`MEMORY.md`

- durable approved translator preferences and project-level standing rules only;
- no raw documents, no pasted source texts, no unapproved candidate rules.

`memory/YYYY-MM-DD.md`

- daily working notes and session summaries if the agent needs to remember non-bootstrap context.

`BOOTSTRAP.md`

- first-run onboarding for single translator: name, language pairs, domains, preferred style, whether to use formal/informal address, default glossary behavior.

### Skills

Workspace-local skills under `~/.openclaw/workspace-prante/skills/`:

1. `prante-translation-pass`
   - full end-to-end translation workflow;
   - sequence: detect request → call deterministic analysis → glossary/TM retrieval → draft → QA → memory proposal;
   - tells the agent when to ask language/domain questions.

2. `prante-glossary-memory`
   - approval loop for terms/rules/TM units;
   - how to save only confirmed entries;
   - how to distinguish one-off instructions from durable rules.

3. `prante-qa-review`
   - terminology/style/segment QA workflow;
   - output format for actionable warnings.

4. `prante-operator-smoke`
   - operator testing mode;
   - do not write tests to memory;
   - use OpenClaw CLI flows; report evidence.

Skills should not implement algorithms. They tell the model how to orchestrate plugin tools and phrase outcomes.

### Plugin(s)

One focused plugin is better than a zoo.

Create one local OpenClaw tool plugin:

`prante-translator-tools`

Owned deterministic tool surface:

- `prante_analyze_text`
  - input: text, sourceLang?, targetLang?, domain?, maxTerms?;
  - output: language-neutral segmentation, counts, repeated fragments, term candidates, style/readability metrics.

- `prante_glossary_lookup`
  - input: text, sourceLang?, targetLang?, project?;
  - output: matched approved terms, forbidden variant alerts, candidate unknown terms.

- `prante_memory_lookup`
  - input: sourceText/sourceSegments, sourceLang?, targetLang?, scope?, limit?;
  - output: fuzzy TM matches with scores and provenance.

- `prante_save_memory_candidate`
  - input: type=`glossary_term|tm_unit|rule|post_edit_pattern`, payload, approvalStatus;
  - guard: status defaults to `candidate`; `active/user_approved/client_approved` only if the user explicitly asked to remember/save/approve.

- `prante_compare_translation`
  - input: sourceText, draftText?, finalText, sourceLang?, targetLang?;
  - output: alignment-ish segment comparison, diff summary, candidate post-edit patterns.

- `prante_qa_check`
  - input: sourceText, targetText, glossary?, rules?, sourceLang?, targetLang?;
  - output: terminology consistency, missing/forbidden term checks, segment count/length warnings, final actionable list.

Implementation principle:

- Use deterministic OSS libraries already named in PRANTE docs/research where practical:
  - RapidFuzz for fuzzy TM/string matching;
  - FlashText or equivalent trie matching for glossary terms;
  - YAKE for keyword/term candidates when available;
  - simple transparent fallback heuristics if optional libraries are absent.
- Do not build a translation engine from scratch.
- Do not fine-tune or train models in MVP.
- Keep storage local SQLite under OpenClaw profile/workspace local state, not committed to PRANTE repo.

### Model/LLM role

The LLM is responsible for:

- drafting target text;
- explaining translation decisions;
- proposing candidate rules from deterministic evidence;
- phrasing the Telegram answer.

The LLM is not responsible for:

- counting repeats;
- declaring glossary/TM truth;
- saving memory without approval;
- pretending QA passed without tool evidence.

## MVP UX

### First-run / onboarding

User sends `/start` or first message. PRANTE responds in Russian:

- briefly says it helps with pre-translation analysis, glossary, draft translation, QA, and adaptive memory;
- asks only for missing essentials:
  - language pair;
  - main domains/genres;
  - whether to save approved terms/rules by default after explicit confirmation.

### Main text analysis

User sends text like:

> Проанализируй перед переводом EN→RU: ...

Expected answer:

- краткий статус: source length, segments;
- повторы: top repeated fragments;
- термины-кандидаты;
- known glossary hits;
- style/readability risks;
- next actions: “сделать черновик”, “проверить перевод”, “сохранить термины”.

No markdown tables in Telegram; use bullets and field:value blocks.

### Draft translation

User asks:

> Сделай черновик RU с учётом терминов.

Expected answer:

- draft translation;
- short “принятые ограничения” block;
- if uncertainty: 2–4 translator notes, not backend excuses.

### Glossary/memory approval

User says:

> Сохрани: translation memory = переводческая память; memory leak не переводить как утечка памяти в этом проекте.

Expected answer:

- confirms exactly what was saved;
- scope/status;
- warns if the rule conflicts with existing memory.

### QA

User sends source + target/final translation:

- PRANTE runs deterministic QA;
- returns actionable warnings;
- suggests whether to remember post-edit patterns only after approval.

## Testing surface

### Static / config checks

- `openclaw --profile prante config validate`
- `openclaw --profile prante plugins validate <plugin path>` or package validate command generated by OpenClaw scaffold
- `openclaw --profile prante plugins inspect prante-translator-tools --runtime --json`
- `openclaw --profile prante skills list`
- `openclaw --profile prante skills check --agent main`

### Runtime health checks

- `openclaw --profile prante status`
- `openclaw --profile prante doctor`
- `openclaw --profile prante doctor --fix` only after reading expected changes
- `openclaw --profile prante status --deep`
- `openclaw --profile prante health`
- `openclaw --profile prante channels status --probe`
- Telegram Bot API `getMe` for the PRANTE token; expected identity must be recorded without exposing token.

### CLI user-message flows

Use OpenClaw CLI, not direct scripts, for acceptance tests:

- `openclaw --profile prante agent --message "..."`

Minimum smoke messages:

1. pre-translation analysis of a repeated EN paragraph;
2. glossary save request;
3. second analysis that must use saved glossary;
4. draft translation request;
5. QA check for a deliberately inconsistent target;
6. post-edit comparison and candidate rule proposal;
7. operator smoke: no memory write.

### Plugin deterministic tests

- Unit tests for segmentation/repeats;
- Unit tests for glossary lookup and forbidden variants;
- Unit tests for SQLite save/retrieve;
- Unit tests for fuzzy memory lookup;
- Unit tests for QA checks.

### Final verifier

Only after build claims pass:

- launch independent Hermes verifier subagent;
- verifier behaves like a translator, not like implementation author;
- verifier runs OpenClaw CLI messages through `openclaw --profile prante agent --message ...`;
- if any product feature fails or gives useless output, return to implementation.

## Definition of Done

MVP is done only when all are true:

1. `prante` OpenClaw profile has valid config and single-user Telegram token configured securely.
2. Gateway can start locally on WSL and is reboot-safe enough for local development (`gateway install`/systemd user or explicit run script if service install is blocked, documented).
3. PRANTE bot identity is verified with Telegram `getMe` and does not conflict with existing bots.
4. Workspace exists at `~/.openclaw/workspace-prante` and contains PRANTE-specific `AGENTS.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `MEMORY.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, and workspace-local skills.
5. Workspace is local git repo with initial commit, mirroring Alfred safety-net practice.
6. One local OpenClaw plugin `prante-translator-tools` is installed/enabled without upstream patches.
7. Plugin registers deterministic tools and passes its tests/build/validation.
8. Skills list shows PRANTE skills ready.
9. `openclaw --profile prante status`, `doctor`, and `status --deep` have no unexplained blockers. Any expected local-only warning is documented.
10. All CLI user-message flows work through OpenClaw agent, not just direct plugin scripts.
11. Translation analysis, glossary memory, TM lookup, draft workflow, QA, and post-edit comparison each produce useful translator-facing output.
12. Independent Hermes verifier approves or issues are fixed and reverified.
13. Final report includes evidence commands and outputs, but not secrets.

## Task decomposition

### Track A — Runtime/config contour

- Run `openclaw --profile prante setup --non-interactive --accept-risk --mode local --workspace ~/.openclaw/workspace-prante`.
- Configure gateway mode/local auth/token via CLI config commands.
- Configure Telegram channel with token via `openclaw channels add --channel telegram --bot-token ...` or token-file/SecretRef if supported.
- Configure allowlist for Alex Telegram id `873529051` and `commands.ownerAllowFrom`.
- Install/start gateway or create documented local dev service/runner.
- Run status/doctor/status --deep/channel probe.

### Track B — Workspace/persona/skills

- Seed workspace through OpenClaw setup first.
- Preserve upstream bootstrap intent; overwrite/extend files with PRANTE-specific content only after reading defaults.
- Write `AGENTS.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `MEMORY.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`.
- Create skills: `prante-translation-pass`, `prante-glossary-memory`, `prante-qa-review`, `prante-operator-smoke`.
- Initialize git repo in workspace and commit baseline.

### Track C — Plugin/tool implementation

- Scaffold `prante-translator-tools` with `openclaw plugins init` if CLI supports it.
- Use `defineToolPlugin` and TypeBox schemas.
- Implement deterministic analysis using a small TypeScript wrapper and Python helper if needed, or pure TypeScript when library coverage is good.
- Use local SQLite store under profile/workspace state.
- Build/test/validate/install/enable plugin.

### Track D — CLI acceptance tests

- Write smoke prompt pack.
- Run direct plugin unit tests.
- Run OpenClaw CLI agent messages for each product flow.
- Inspect sessions/logs/tool traces to prove deterministic tools were invoked.

### Track E — independent verification

- Run Hermes verifier subagent after all internal gates pass.
- Fix verifier findings.
- Produce final report.

## Non-goals for MVP

- Multi-user routing.
- Scalable SaaS architecture.
- Production VPS deployment.
- Full CAT-tool file formats and TMX import/export beyond small local structure.
- Real adaptive MT training/fine-tuning.
- Web app replacement for Telegram flow.
- Upstream OpenClaw patches.
