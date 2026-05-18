# Data model MVP

Статус: рабочая схема для обсуждения.  
Цель: зафиксировать минимальные сущности для глоссария, переводческой памяти и learning loop.

## 1. Users

```sql
users(
  id primary key,
  telegram_id unique,
  display_name,
  created_at
)
```

## 2. Projects

```sql
projects(
  id primary key,
  user_id references users(id),
  name,
  client_name,
  source_lang,
  target_lang,
  domain,
  genre,
  created_at
)
```

## 3. Documents

```sql
documents(
  id primary key,
  user_id references users(id),
  project_id references projects(id),
  title,
  source_text_hash,
  source_lang,
  target_lang,
  document_type,
  raw_file_path,
  created_at
)
```

## 4. Segments

```sql
segments(
  id primary key,
  document_id references documents(id),
  segment_index integer,
  source_text,
  source_hash,
  char_start integer,
  char_end integer
)
```

## 5. Translation variants

```sql
translation_variants(
  id primary key,
  segment_id references segments(id),
  variant_type, -- draft | user_final | client_approved
  text,
  provider,
  model,
  prompt_hash,
  created_at
)
```

## 6. Glossary terms

```sql
glossary_terms(
  id primary key,
  user_id references users(id),
  project_id references projects(id),
  source_lang,
  target_lang,
  source_term,
  preferred_target,
  forbidden_variants_json,
  notes,
  status, -- candidate | user_approved | client_approved | active | deprecated
  confidence real,
  evidence_json,
  created_at,
  updated_at
)
```

## 7. Translation memory units

```sql
translation_memory_units(
  id primary key,
  user_id references users(id),
  project_id references projects(id),
  source_lang,
  target_lang,
  source_text,
  target_text,
  status, -- candidate | user_approved | client_approved | active | deprecated
  match_scope, -- global | client | project | genre
  usage_count integer default 0,
  last_used_at,
  created_at
)
```

## 8. Translation rules

```sql
translation_rules(
  id primary key,
  user_id references users(id),
  scope_type, -- global | client | project | genre | language_pair
  scope_id,
  rule_type, -- terminology | style | formatting | qa | prompt
  rule_text,
  machine_readable_json,
  status, -- candidate | user_approved | client_approved | active | deprecated | conflict
  confidence real,
  evidence_json,
  created_at,
  updated_at
)
```

## 9. Post-edit patterns

```sql
post_edit_patterns(
  id primary key,
  user_id references users(id),
  project_id references projects(id),
  pattern_type, -- term_substitution | style_rewrite | punctuation | syntax | formatting
  source_pattern,
  draft_pattern,
  final_pattern,
  support_count integer,
  confidence real,
  status,
  examples_json,
  created_at
)
```

## 10. Analysis runs

```sql
analysis_runs(
  id primary key,
  document_id references documents(id),
  user_id references users(id),
  status, -- queued | running | completed | failed
  settings_json,
  result_json,
  created_at,
  completed_at
)
```

## 11. Design notes

- Все memory/rules/glossary записи должны иметь `status`.
- Все автоматически созданные записи сначала получают `candidate`.
- Active memory не обновляется без user approval.
- Для каждого правила и термина нужно хранить `evidence_json`.
- В будущем TM units и segments можно индексировать в Qdrant по embedding + payload filters.
