# API contract draft

Статус: черновой контракт для backend и будущего web UI.

## 1. Principles

- API возвращает структурированный JSON.
- Долгие операции создают job/run и обновляются событиями.
- LLM output не считается источником истины без сохраненного structured result.
- Memory update требует подтверждения пользователя.

## 2. Document endpoints

### Create document

`POST /documents`

Body:

```json
{
  "project_id": "project_123",
  "source_text": "...",
  "source_lang": "en",
  "target_lang": "ru",
  "document_type": "plain_text"
}
```

Response:

```json
{
  "document_id": "doc_123",
  "analysis_run_id": "run_123"
}
```

### Get document

`GET /documents/{document_id}`

## 3. Analysis endpoints

### Start analysis

`POST /documents/{document_id}/analyze`

Body:

```json
{
  "detect_repeats": true,
  "extract_terms": true,
  "match_glossary": true,
  "readability": true
}
```

Response:

```json
{
  "analysis_run_id": "run_123",
  "status": "queued"
}
```

### Get analysis result

`GET /analysis-runs/{analysis_run_id}`

Response:

```json
{
  "analysis_run_id": "run_123",
  "status": "completed",
  "result": {
    "repeats": {},
    "glossary_matches": [],
    "term_candidates": [],
    "readability": {}
  }
}
```

## 4. Translation endpoints

### Generate draft

`POST /documents/{document_id}/draft`

Body:

```json
{
  "project_id": "project_123",
  "provider": "llm_default",
  "use_translation_memory": true,
  "use_glossary": true,
  "use_style_rules": true
}
```

Response:

```json
{
  "draft_id": "draft_123",
  "status": "completed",
  "segments": []
}
```

### Submit final version

`POST /documents/{document_id}/final`

Body:

```json
{
  "translation_text": "...",
  "status": "user_final"
}
```

### Submit client-approved version

`POST /documents/{document_id}/approved`

Body:

```json
{
  "translation_text": "...",
  "status": "client_approved"
}
```

## 5. Learning endpoints

### Learn from edits

`POST /documents/{document_id}/learn-from-edits`

Response:

```json
{
  "glossary_candidates": [],
  "rule_candidates": [],
  "tm_units": [],
  "post_edit_patterns": []
}
```

### Approve memory candidates

`POST /memory/approve`

Body:

```json
{
  "candidate_ids": ["cand_1", "cand_2"],
  "scope": "project"
}
```

Response:

```json
{
  "approved": ["cand_1", "cand_2"],
  "status": "ok"
}
```

## 6. Glossary endpoints

- `GET /glossaries/{project_id}`
- `POST /glossary-terms`
- `PATCH /glossary-terms/{term_id}`
- `DELETE /glossary-terms/{term_id}`

## 7. Event stream draft

Future web UI can subscribe to:

`GET /runs/{run_id}/events`

Events:

```json
{"type": "document.parsed", "document_id": "doc_123"}
{"type": "analysis.repeats.completed", "count": 12}
{"type": "glossary.matches.completed", "count": 8}
{"type": "translation.draft.completed", "segments": 42}
{"type": "memory.candidates.created", "terms": 4, "rules": 2}
```
