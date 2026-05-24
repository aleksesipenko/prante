# Project 2 — Task 3 MVP prototype plan

> Source: Telegram chat `Цифровые кафедры. Общий проект`, message from Alsu (`@alllssooou`) on 2026-05-22 14:47 MSK.

## 1. Exact task from Alsu

Assigned people:
- `@aleksesipenko`
- `@kssonnii`
- `@diliara_nu`

Task text:
- read point `2.3`;
- read two guides:
  - `как сделать прототип`
  - `no-code решения, которые можно использовать`
- then **refine the prototype into an MVP**, taking into account the results of the earlier product research, so the prototype becomes a полноценная базовая версия IT-продукта.

## 2. Links from Alsu for Task 3

1. Figma clickable prototype guide  
   `https://convertmonster.ru/blog/landing-page-primery-blog/figma-samostoyatelnoe-sozdanie-klikabelnogo-prototipa-chast-1/`

2. No-code tools overview  
   `https://timeweb.com/ru/community/articles/luchshie-no-code-i-low-code-platformy-rossiyskie-i-zarubezhnye-zero-coding-instrumenty`

## 3. What matters from the links

### From the Figma guide
Main takeaway:
- we do **not** need to build real backend code to prove MVP for the assignment;
- we need a **clickable user flow** with clear transitions and a believable product scenario;
- the fastest robust path is a structured prototype with:
  - screens/frames,
  - transitions between states,
  - clickable CTA buttons,
  - one full user path from input to result.

### From the no-code guide
Main takeaway:
- no-code is acceptable as a delivery format for a prototype;
- but most listed tools are website builders, not a good natural fit for a Telegram-first bot flow;
- for PRANTE, **Figma is the fastest and least risky choice** for the deadline;
- no-code builders are better as backup for a landing/demo page, not as the main prototype vehicle.

## 4. Decision: how we will implement Task 3

We will implement this as a **clickable MVP prototype**, not as a full production bot.

### Primary format
- **Figma clickable prototype** in Telegram-first style.

### Optional secondary artifact
- short markdown/one-pager in repo that explains:
  - what the MVP includes;
  - what user problem each screen solves;
  - what is mocked vs what would be real in production.

## 5. Why this approach is correct for the assignment

Because the repo currently contains:
- product description,
- research,
- architecture drafts,
- SSOT docs,
- but almost no actual product code yet.

So the honest and defensible MVP for the school task is:
- a realistic product flow,
- tied to research,
- showing how the core value is delivered,
- without pretending that a full backend is already implemented.

## 6. MVP scope for the prototype

### Must-have screens / states

1. **Start / value proposition**
   - what PRANTE is;
   - who it is for;
   - CTA: send text / upload document.

2. **Input step**
   - user sends source text or document;
   - show supported input modes: text, PDF/DOCX.

3. **Pre-translation analysis report**
   - repeated fragments;
   - key terms;
   - style/genre signal;
   - readability/risk notes.

4. **Glossary suggestions**
   - candidate terms;
   - recommended translations;
   - add to glossary / ignore.

5. **Draft translation**
   - draft generated with glossary consideration;
   - explicit note that draft is editable.

6. **Post-edit / learning step**
   - user corrects translation;
   - system offers to remember term/style preference.

7. **Result / project memory value**
   - saved glossary items;
   - saved translation preference/rule;
   - next time the bot works better.

### Nice-to-have if time remains
- comparison view: draft vs final;
- export report;
- project/client/genre mode selector;
- quick explanation of “why this term is suggested”.

## 7. What from research must be visible in the prototype

The prototype must explicitly reflect already documented research:

### User pain
From repo docs:
- manual pre-translation analysis is slow and repetitive;
- translators need repeats, terms, style consistency, and a draft quickly.

### Target audience
- student translators;
- freelance translators;
- small translation teams.

### Product differentiation
PRANTE is not a giant CAT system.
It is:
- lightweight,
- Telegram-first,
- fast to start,
- focused on preparation + terminology + draft + gradual learning.

### MVP value statement
The prototype must show that PRANTE:
- saves preparation time,
- reduces terminology mistakes,
- keeps style under control,
- improves with repeated use.

## 8. Recommended prototype storyline

Use one coherent scenario:

1. Translator receives a new source text.
2. Sends it to PRANTE in Telegram.
3. PRANTE returns:
   - repeats,
   - terms,
   - style/genre notes,
   - glossary suggestions.
4. User accepts key glossary items.
5. PRANTE generates draft translation.
6. User edits the draft.
7. PRANTE asks to save preferred terms/style patterns.
8. User sees that the system becomes more personalized.

This scenario best matches both the product brief and the UTP already fixed in repo docs.

## 9. Screen content that should be emphasized

### Block A — “before translation”
- upload text;
- quick analysis;
- repeated fragments;
- key terms;
- style / readability warnings.

### Block B — “during translation”
- glossary-aware draft;
- term consistency hints;
- editable result.

### Block C — “after translation”
- compare / improve;
- remember corrections;
- project memory and personalization.

## 10. What NOT to do

To stay credible and on time, do not:
- promise a full working AI system by tomorrow;
- overload the prototype with enterprise CAT features;
- add complex dashboards unrelated to the core flow;
- center the prototype around web admin instead of translator workflow;
- pretend that all backend logic is already implemented.

## 11. Practical build plan

### Step 1
Lock the MVP narrative:
- Telegram-first assistant for pre-translation analysis.

### Step 2
Select one core user scenario:
- freelancer receives text → analyzes → gets draft → saves glossary/rules.

### Step 3
Prepare 6–8 Figma frames:
- welcome,
- input,
- analysis,
- glossary,
- draft,
- save corrections,
- memory/result.

### Step 4
Connect frames with clickable transitions.

### Step 5
Add short product copy from existing repo docs.

### Step 6
Add 3 explicit “MVP, not final production” notes:
- mocked LLM response;
- mocked glossary suggestion;
- mocked learning/save flow.

### Step 7
Prepare a short verbal explanation for team/demo:
- what problem is solved;
- what makes this MVP complete enough;
- what would be next after MVP.

## 12. Proposed split inside Task 3

### Алекс
- assemble the final product flow;
- define MVP boundaries;
- ensure alignment with repo docs and architecture.

### Dilyara
- tighten product copy;
- connect screens to research/hypotheses;
- make the value proposition and UX wording clearer.

### kssonnii
- help with screen structure / visual cleanup / consistency;
- verify that the prototype reads clearly for an outside reviewer.

## 13. Deliverables to send back to Alsu

Minimum acceptable package:
- Figma prototype link;
- short note: what exactly was upgraded from prototype to MVP;
- 3–5 bullets showing how research influenced the result.

## 14. Short ready-made positioning for the team

PRANTE MVP is a Telegram-first prototype that demonstrates the full minimal translator flow:
- text input,
- pre-translation analysis,
- glossary recommendations,
- draft translation,
- correction memory.

The point of the MVP is not to show a giant finished platform, but to prove that the product already delivers a coherent and useful base workflow for a translator.
