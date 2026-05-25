import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const adapterSource = fs.readFileSync(new URL("../content/content-adapter.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(adapterSource, sandbox);

const tools = sandbox.window.PranteContentTools;

const defaults = {
  chat: {
    startMessage: "Я помогу подготовить текст.",
    commands: ["Загрузить документ", "Вставить текст"],
  },
  report: {
    metrics: [{ value: "23", label: "повтора" }],
  },
};

const schema = [
  { section: "Старт", path: "chat.startMessage", label: "Стартовое сообщение", type: "text", required: true, maxLength: 120 },
  { section: "Кнопки", path: "chat.commands[0]", label: "Кнопка 1", type: "string", required: true, maxLength: 24 },
  { section: "Кнопки", path: "chat.commands[1]", label: "Кнопка 2", type: "string", required: true, maxLength: 24 },
  { section: "Отчёт", path: "report.metrics[0].value", label: "Метрика", type: "string", required: true, maxLength: 8 },
];

{
  const rows = tools.parseCsv("path,value\nchat.startMessage,\"Новый текст\"\nreport.metrics[0].value,31\n");
  const result = tools.mergeContent(defaults, rows, schema);
  assert.equal(result.content.chat.startMessage, "Новый текст");
  assert.equal(result.content.report.metrics[0].value, "31");
  assert.equal(result.warnings.length, 0);
}

{
  const rows = tools.parseCsv("Раздел,Поле,Текст,Подсказка,Лимит\nСтарт,Стартовое сообщение,\"Новый текст из нормальной таблицы\",,120\nОтчёт,Метрика,42,,8\n");
  const result = tools.mergeContent(defaults, rows, schema);
  assert.equal(result.content.chat.startMessage, "Новый текст из нормальной таблицы");
  assert.equal(result.content.report.metrics[0].value, "42");
  assert.equal(result.warnings.length, 0);
}

{
  const rows = tools.parseCsv("Раздел;Поле;Текст;Подсказка;Лимит\nСтарт;Стартовое сообщение;Текст из Excel-friendly CSV;;120\n");
  const result = tools.mergeContent(defaults, rows, schema);
  assert.equal(result.content.chat.startMessage, "Текст из Excel-friendly CSV");
  assert.equal(result.warnings.length, 0);
}

{
  const rows = [{ path: "chat.commands[0]", value: "" }];
  const result = tools.mergeContent(defaults, rows, schema);
  assert.equal(result.content.chat.commands[0], "Загрузить документ");
  assert.equal(result.warnings.some((warning) => warning.code === "empty_value"), true);
}

{
  const rows = [{ path: "chat.startMessage", value: "Здравствуйте. Я помогу подготовить текст." }];
  const result = tools.mergeContent(defaults, rows, schema);
  assert.equal(result.errors.some((error) => error.code === "duplicate_greeting"), true);
}

{
  const rows = [{ path: "chat.commands[1]", value: "Очень длинная кнопка, которая не влезет" }];
  const result = tools.mergeContent(defaults, rows, schema);
  assert.equal(result.warnings.some((warning) => warning.code === "max_length"), true);
}

{
  const rows = tools.gvizTableToRows({
    cols: [{ label: "Раздел" }, { label: "Поле" }, { label: "Текст" }],
    rows: [{ c: [{ v: "Старт" }, { v: "Стартовое сообщение" }, { v: "Из gviz" }] }],
  });
  assert.equal(JSON.stringify(rows), JSON.stringify([{ "Раздел": "Старт", "Поле": "Стартовое сообщение", "Текст": "Из gviz" }]));
}
