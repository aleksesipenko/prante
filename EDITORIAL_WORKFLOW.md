# ПРАНТЕ — редакторский контур через Google Sheets

## Что редактирует команда

Команда переводчиков редактирует только тексты прототипа в Google Sheets. Код, визуальный стиль и порядок сценария остаются в репозитории.

## Как создать таблицу

1. Откройте Google Sheets.
2. Импортируйте файл `docs/prototypes/final-mvp/content/editor-texts-template.xlsx`.
3. Дайте редакторам права на редактирование таблицы.
4. В Google Sheets выберите `File → Share → Publish to web`.
5. Опубликуйте лист в формате CSV.
6. Скопируйте обычную edit-ссылку на таблицу.
7. Возьмите `sheetId` из edit-ссылки: это часть между `/d/` и `/edit`.
8. Возьмите `gid` из конца edit-ссылки, если он есть.
9. Скопируйте published CSV URL для sync-скрипта.
10. Вставьте значения в `docs/prototypes/final-mvp/content/editor-config.json`:

```json
{
  "sheetCsvUrl": "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv",
  "sheetId": "google-sheet-id-from-edit-url",
  "sheetGid": "0",
  "sheetEditUrl": "https://docs.google.com/spreadsheets/d/.../edit",
  "refreshSeconds": 20
}
```

Published CSV URL и `sheetId` дают публичное чтение. Это нормально для MVP, потому что в таблице лежат только публичные тексты прототипа.

В таблице редакторы меняют только колонку `Текст`. Колонки `Раздел`, `Поле`, `Подсказка` и `Лимит` нужны, чтобы не потеряться и не писать слишком длинные фразы.

Для ручной работы используйте именно `.xlsx`: он открывается в Excel нормальными колонками, с переносами строк и закреплённой шапкой. Файл `editor-texts-template.csv` нужен как технический CSV для сайта и sync-скриптов. Если всё же нужно открыть CSV в Excel, берите `editor-texts-template.excel.csv`: в нём разделитель `;`, который русская локаль Excel обычно распознаёт корректно.

## Как редакторам смотреть preview

Открыть:

```text
docs/prototypes/final-mvp/admin/
```

На проде это будет `/docs/prototypes/final-mvp/admin/`.

Preview показывает:

- загружается ли контент из Google Sheets;
- есть ли ошибки;
- есть ли предупреждения по длине текстов;
- как текст выглядит в Telegram-макете.

## Как зафиксировать финальный snapshot в Git

Когда тексты согласованы, разработчик запускает:

```bash
python docs/prototypes/final-mvp/scripts/sync_google_sheet.py
```

Скрипт скачает published CSV, проверит поля и обновит `content/prante-content.json`. Этот JSON остаётся fallback для сайта, если Google Sheets временно недоступен.

Если правки пришли локальным Excel-файлом, можно проверить его так:

```bash
python docs/prototypes/final-mvp/scripts/sync_google_sheet.py --source docs/prototypes/final-mvp/content/editor-texts-template.xlsx --dry-run
```
