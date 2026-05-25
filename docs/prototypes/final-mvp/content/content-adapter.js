(function (root) {
  "use strict";

  const DEFAULT_CONFIG = {
    sheetCsvUrl: "",
    sheetId: "",
    sheetGid: "",
    sheetEditUrl: "",
    refreshSeconds: 20,
    localDraftKey: "",
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function parsePath(path) {
    const parts = [];
    String(path || "").replace(/([^.[\]]+)|\[(\d+)\]/g, (_, key, index) => {
      parts.push(index === undefined ? key : Number(index));
      return "";
    });
    return parts;
  }

  function getPath(object, path) {
    return parsePath(path).reduce((current, part) => {
      if (current === undefined || current === null) return undefined;
      return current[part];
    }, object);
  }

  function setPath(object, path, value) {
    const parts = parsePath(path);
    let current = object;
    parts.forEach((part, index) => {
      const last = index === parts.length - 1;
      if (last) {
        current[part] = value;
        return;
      }
      const nextPart = parts[index + 1];
      if (current[part] === undefined || current[part] === null) {
        current[part] = typeof nextPart === "number" ? [] : {};
      }
      current = current[part];
    });
  }

  function detectCsvDelimiter(text) {
    const firstLine = String(text || "").split(/\r?\n/).find((line) => line.trim()) || "";
    const counts = { ",": 0, ";": 0 };
    let quoted = false;

    for (let i = 0; i < firstLine.length; i += 1) {
      const char = firstLine[i];
      const next = firstLine[i + 1];
      if (char === '"' && quoted && next === '"') {
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (!quoted && (char === "," || char === ";")) {
        counts[char] += 1;
      }
    }

    return counts[";"] > counts[","] ? ";" : ",";
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    const delimiter = detectCsvDelimiter(text);

    for (let i = 0; i < String(text || "").length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (quoted) {
        if (char === '"' && next === '"') {
          field += '"';
          i += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        quoted = true;
      } else if (char === delimiter) {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (char !== "\r") {
        field += char;
      }
    }
    row.push(field);
    rows.push(row);

    const headers = (rows.shift() || []).map((header) => header.trim());
    return rows
      .filter((cells) => cells.some((cell) => String(cell || "").trim() !== ""))
      .map((cells) => {
        const item = {};
        headers.forEach((header, index) => {
          item[header] = cells[index] === undefined ? "" : cells[index];
        });
        return item;
      });
  }

  function coerceValue(raw, field) {
    const value = String(raw ?? "");
    if (field.type === "number") {
      const parsed = Number(value.replace(",", "."));
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  }

  function normalizeRows(rows) {
    return (rows || []).map((row) => ({
      path: String(row.path || row.Path || row["Ключ"] || row["Путь"] || "").trim(),
      section: String(row.section || row.Section || row["Раздел"] || "").trim(),
      label: String(row.label || row.Label || row["Поле"] || row["Название"] || "").trim(),
      value: row.value === undefined
        ? (row.Value === undefined ? (row["Текст"] === undefined ? "" : String(row["Текст"])) : String(row.Value))
        : String(row.value),
    }));
  }

  function contentToSheetRows(content, schema) {
    return (schema || []).map((field) => ({
      "Раздел": field.section || "",
      "Поле": field.label || "",
      "Текст": String(getPath(content, field.path) ?? ""),
      "Подсказка": field.notes || "",
      "Лимит": field.maxLength || "",
    }));
  }

  function escapeCsvCell(value, delimiter) {
    const text = String(value ?? "");
    if (text.includes('"') || text.includes("\n") || text.includes("\r") || text.includes(delimiter)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function rowsToCsv(rows, options) {
    const delimiter = (options && options.delimiter) || ",";
    const headers = (options && options.headers) || ["Раздел", "Поле", "Текст", "Подсказка", "Лимит"];
    const lines = [headers.map((header) => escapeCsvCell(header, delimiter)).join(delimiter)];
    (rows || []).forEach((row) => {
      lines.push(headers.map((header) => escapeCsvCell(row[header], delimiter)).join(delimiter));
    });
    return `${lines.join("\n")}\n`;
  }

  function schemaKey(field) {
    return `${String(field.section || "").trim()}|||${String(field.label || "").trim()}`.toLowerCase();
  }

  function gvizTableToRows(table) {
    if (!table || !Array.isArray(table.cols) || !Array.isArray(table.rows)) return [];
    const headers = table.cols.map((col) => String(col.label || "").trim());
    return table.rows.map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        const cell = row.c && row.c[index];
        item[header] = cell && cell.v !== null && cell.v !== undefined ? String(cell.v) : "";
      });
      return item;
    });
  }

  function validateContent(content, schema) {
    const errors = [];
    const warnings = [];

    (schema || []).forEach((field) => {
      const value = getPath(content, field.path);
      const text = String(value ?? "").trim();
      if (field.required && !text) {
        errors.push({ code: "required", path: field.path, message: `${field.label || field.path}: пустое обязательное поле` });
      }
      if (field.maxLength && text.length > Number(field.maxLength)) {
        warnings.push({
          code: "max_length",
          path: field.path,
          message: `${field.label || field.path}: ${text.length}/${field.maxLength} символов`,
        });
      }
    });

    const startMessage = String(getPath(content, "chat.startMessage") || "").trim();
    if (/^здравствуйте[.!?,\s]/i.test(startMessage)) {
      errors.push({
        code: "duplicate_greeting",
        path: "chat.startMessage",
        message: "Стартовое сообщение не должно начинаться с «Здравствуйте»: приветствие уже рисуется отдельно.",
      });
    }

    return { errors, warnings };
  }

  function mergeContent(defaults, sheetRows, schema) {
    const content = clone(defaults);
    const warnings = [];
    const errors = [];
    const allowed = new Map((schema || []).map((field) => [field.path, field]));
    const allowedByLabel = new Map((schema || []).map((field) => [schemaKey(field), field]));
    const rows = normalizeRows(sheetRows);

    rows.forEach((row) => {
      const field = row.path ? allowed.get(row.path) : allowedByLabel.get(`${row.section}|||${row.label}`.toLowerCase());
      if (!field) {
        const rowName = row.path || [row.section, row.label].filter(Boolean).join(" / ");
        if (rowName) {
          warnings.push({ code: "unknown_path", path: rowName, message: `Поле ${rowName} не входит в разрешённую схему.` });
        }
        return;
      }

      if (!row.value.trim()) {
        warnings.push({ code: "empty_value", path: field.path, message: `${field.label || field.path}: пустая ячейка, оставлен fallback из JSON.` });
        return;
      }

      setPath(content, field.path, coerceValue(row.value, field));
    });

    const validation = validateContent(content, schema);
    return {
      content,
      errors: errors.concat(validation.errors),
      warnings: warnings.concat(validation.warnings),
      source: rows.length ? "sheet" : "fallback",
    };
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function fetchText(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.text();
  }

  function configFromQuery(config) {
    const params = new URLSearchParams(root.location ? root.location.search : "");
    return {
      ...config,
      sheetCsvUrl: params.get("sheetCsvUrl") || params.get("sheet") || config.sheetCsvUrl || "",
      sheetId: params.get("sheetId") || config.sheetId || "",
      sheetGid: params.get("sheetGid") || params.get("gid") || config.sheetGid || "",
      sheetEditUrl: params.get("sheetEditUrl") || config.sheetEditUrl || "",
      localDraftKey: params.get("localDraftKey") || config.localDraftKey || "",
    };
  }

  async function loadDefaultContent(basePath) {
    return fetchJson(`${basePath || "."}/content/prante-content.json`);
  }

  async function loadEditorSchema(basePath) {
    return fetchJson(`${basePath || "."}/content/editor-schema.json`);
  }

  async function loadContentConfig(basePath) {
    try {
      const config = await fetchJson(`${basePath || "."}/content/editor-config.json`);
      return { ...DEFAULT_CONFIG, ...configFromQuery(config) };
    } catch (error) {
      return { ...DEFAULT_CONFIG, ...configFromQuery({}) };
    }
  }

  function loadGvizContent(config) {
    return new Promise((resolve) => {
      if (!root.document || !config.sheetId) {
        resolve({ rows: [], loaded: false, error: null });
        return;
      }

      const callbackName = `__pranteSheet${Date.now()}${Math.floor(Math.random() * 10000)}`;
      const script = root.document.createElement("script");
      const timeout = root.setTimeout(() => {
        cleanup();
        resolve({ rows: [], loaded: false, error: "Google Sheets JSONP timeout" });
      }, 12000);

      function cleanup() {
        root.clearTimeout(timeout);
        try { delete root[callbackName]; } catch (error) { root[callbackName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      root[callbackName] = (payload) => {
        cleanup();
        if (payload && payload.status === "error") {
          resolve({ rows: [], loaded: false, error: payload.errors && payload.errors[0] ? payload.errors[0].detailed_message : "Google Sheets returned an error" });
          return;
        }
        resolve({ rows: gvizTableToRows(payload && payload.table), loaded: true, error: null });
      };

      const params = new URLSearchParams({
        tqx: `responseHandler:${callbackName}`,
        tq: "select *",
      });
      if (config.sheetGid) params.set("gid", config.sheetGid);
      script.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(config.sheetId)}/gviz/tq?${params.toString()}`;
      script.onerror = () => {
        cleanup();
        resolve({ rows: [], loaded: false, error: "Google Sheets JSONP script failed" });
      };
      root.document.head.appendChild(script);
    });
  }

  async function loadSheetContent(sheetSource) {
    const config = typeof sheetSource === "string" ? { sheetCsvUrl: sheetSource } : (sheetSource || {});
    if (config.localDraftKey && root.localStorage) {
      try {
        const text = root.localStorage.getItem(config.localDraftKey) || "";
        return { rows: text ? parseCsv(text) : [], loaded: Boolean(text), error: null };
      } catch (error) {
        return { rows: [], loaded: false, error: error.message };
      }
    }
    if (config.sheetId) return loadGvizContent(config);
    if (!config.sheetCsvUrl) return { rows: [], loaded: false, error: null };
    try {
      const text = await fetchText(config.sheetCsvUrl);
      return { rows: parseCsv(text), loaded: true, error: null };
    } catch (error) {
      return { rows: [], loaded: false, error: error.message };
    }
  }

  async function loadMergedContent(options) {
    const basePath = (options && options.basePath) || ".";
    const defaults = await loadDefaultContent(basePath);
    const schema = await loadEditorSchema(basePath);
    const config = await loadContentConfig(basePath);
    const sheet = await loadSheetContent(config);
    const merged = mergeContent(defaults, sheet.rows, schema.fields || schema);

    return {
      ...merged,
      schema: schema.fields || schema,
      config,
      sheet,
      fallbackContent: defaults,
    };
  }

  root.PranteContentTools = {
    parseCsv,
    getPath,
    setPath,
    mergeContent,
    validateContent,
    loadDefaultContent,
    loadEditorSchema,
    loadContentConfig,
    loadSheetContent,
    gvizTableToRows,
    loadMergedContent,
    contentToSheetRows,
    rowsToCsv,
  };
})(typeof window !== "undefined" ? window : globalThis);
