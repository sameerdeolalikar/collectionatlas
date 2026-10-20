"use strict";
const $ = (id) => document.getElementById(id),
  clone = (x) => structuredClone(x),
  NS = "http://www.w3.org/2000/svg";
let doc = null,
  analysis = null,
  id = null,
  revision = 0,
  dirty = false,
  busy = false,
  undo = [],
  redo = [],
  selected = new Set(),
  query = "",
  filter = "all",
  pageNumber = 0,
  zoom = 1,
  month = "2026-10",
  editCallback = null;
const KIND = "collectionatlas",
  KEY = "items";
function node(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function button(text, fn, cls) {
  const b = node("button", text, cls);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}
function svg(tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  if (text !== undefined) n.textContent = text;
  return n;
}
function say(text) {
  $("status").textContent = text;
  $("status").hidden = !text;
}
function fail(error) {
  for (const key of ["error", "dialog-error"]) {
    $(key).textContent = error.message || String(error);
    $(key).hidden = false;
  }
}
function controls() {
  document
    .querySelectorAll("button,input,select,textarea")
    .forEach((e) => (e.disabled = busy));
  $("undo").disabled = busy || !undo.length;
  $("redo").disabled = busy || !redo.length;
  $("save").disabled = busy || !doc;
}
async function api(path, data) {
  const r = await fetch(
    "/api/" + path,
    data === undefined
      ? {}
      : {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "Workspace",
          },
          body: JSON.stringify(data),
        },
  );
  const value = await r.json();
  if (!r.ok) throw Error(value.error || "Request failed.");
  return value;
}
async function task(message, fn) {
  if (busy) return;
  busy = true;
  controls();
  $("error").hidden = true;
  $("dialog-error").hidden = true;
  say(message);
  try {
    await fn();
  } catch (e) {
    fail(e);
    say("");
  } finally {
    busy = false;
    controls();
  }
}
async function change(next, message = "Changes applied. Save when ready.") {
  const checked = await api("validate", next);
  undo.push(clone(doc));
  undo = undo.slice(-50);
  redo = [];
  doc = checked.document;
  analysis = checked.analysis;
  dirty = true;
  selected = new Set(
    [...selected].filter((k) => doc[KEY].some((x) => x.id === k)),
  );
  render();
  say(message);
}
function refreshFacets() {
  const control = $(
    KIND === "collectionatlas" ? "tool-collection" : "tool-equipment",
  );
  if (!control) return;
  const values =
    KIND === "collectionatlas"
      ? doc.folders
      : [...new Set(doc.events.map((e) => e.resource))].sort();
  if (filter !== "all" && !values.includes(filter)) filter = "all";
  control.replaceChildren(
    new Option(
      KIND === "collectionatlas" ? "All collections" : "All equipment",
      "all",
    ),
  );
  values.forEach((value) => control.add(new Option(value, value)));
  control.value = filter;
}
function render() {
  refreshFacets();
  const active = document.activeElement?.id;
  $("document-title").textContent = doc.title;
  $("revision").textContent = dirty
    ? "Unsaved changes"
    : `Saved revision ${revision}`;
  $("metrics").replaceChildren();
  Object.entries(analysis.metrics).forEach(([label, value]) => {
    const n = node("div", undefined, "metric");
    n.append(node("strong", String(value)), node("span", label));
    $("metrics").append(n);
  });
  renderWorkspace();
  controls();
  if (active && $(active)) $(active).focus({ preventScroll: true });
}
function field(label, key, value, type = "text", options) {
  const wrap = node("label", label);
  const input = node(
    options ? "select" : type === "textarea" ? "textarea" : "input",
  );
  input.id = "field-" + key;
  input.name = key;
  if (!options && type !== "textarea") input.type = type;
  if (options) options.forEach((o) => input.add(new Option(o, o)));
  if (type === "checkbox") input.checked = value;
  else input.value = value;
  wrap.append(input);
  if (type === "textarea") wrap.className = "wide";
  $("fields").append(wrap);
  return input;
}
function dialog(title, fields, callback) {
  $("editor-title").textContent = title;
  $("fields").replaceChildren();
  $("dialog-error").hidden = true;
  fields.forEach((f) => field(...f));
  editCallback = () => {
    const values = {};
    fields.forEach(([, key, , type]) => {
      const e = $("field-" + key);
      values[key] =
        type === "number"
          ? Number(e.value)
          : type === "checkbox"
            ? e.checked
            : e.value;
    });
    return callback(values);
  };
  $("editor").showModal();
  $("fields").querySelector("input,select,textarea")?.focus();
}
$("cancel").onclick = () => $("editor").close();
$("editor-form").onsubmit = (e) => {
  e.preventDefault();
  task("Validating edits…", async () => {
    await editCallback();
    $("editor").close();
  });
};
function editEntry(entry) {
  const original = entry ? clone(entry) : newEntry();
  dialog(
    entry ? "Edit entry" : "Add entry",
    entryFields(original),
    async (values) => {
      const next = clone(doc);
      const result = normalizeEntry({ ...original, ...values });
      if (entry)
        next[KEY] = next[KEY].map((x) => (x.id === entry.id ? result : x));
      else next[KEY].push(result);
      selected = new Set([result.id]);
      await change(next);
    },
  );
}
function removeEntry(key) {
  if (
    !confirm(
      "Remove this entry? Undo remains available until you open another document.",
    )
  )
    return;
  task("Checking removal…", () =>
    change({ ...doc, [KEY]: doc[KEY].filter((x) => x.id !== key) }),
  );
}
function selectField(label, options, value, callback) {
  const l = node("label", label),
    s = node("select");
  s.id = "tool-" + label.toLowerCase().replaceAll(" ", "-");
  for (const [v, t] of options) s.add(new Option(t, v));
  s.value = value;
  s.onchange = () => callback(s.value);
  l.append(s);
  return l;
}
function setupTools() {
  const tools = $("tools");
  tools.replaceChildren();
  const l = node("label", "Search entries"),
    input = node("input");
  input.type = "search";
  input.id = "search";
  input.oninput = () => {
    query = input.value.toLowerCase();
    pageNumber = 0;
    renderWorkspace();
    controls();
  };
  l.append(input);
  tools.append(l);
  domainTools(tools);
}
function download(name, data, type) {
  const u = URL.createObjectURL(new Blob([data], { type })),
    a = node("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
async function library() {
  const rows = await api("documents");
  $("library").replaceChildren(new Option("Select a document", ""));
  rows.forEach((x) =>
    $("library").add(new Option(`${x.title} · v${x.revision}`, x.id)),
  );
  $("library").value = id || "";
}
async function load(document, key = null, rev = 0) {
  const checked = await api("validate", document);
  doc = checked.document;
  analysis = checked.analysis;
  id = key;
  revision = rev;
  dirty = !key;
  undo = [];
  redo = [];
  selected.clear();
  query = "";
  filter = "all";
  pageNumber = 0;
  zoom = 1;
  setupTools();
  render();
}
$("new").onclick = () => {
  if (dirty && !confirm("Discard unsaved changes and load the sample?")) return;
  task("Loading sample…", async () => {
    await load(await api("sample"));
    say("Fictional sample ready.");
  });
};
$("save").onclick = () =>
  task("Saving document…", async () => {
    const r = await api("save", { id, revision, document: doc });
    id = r.id;
    revision = r.revision;
    dirty = false;
    await library();
    render();
    say(`Saved revision ${revision} locally.`);
  });
$("open").onclick = () => {
  const key = $("library").value;
  if (!key) return;
  if (dirty && !confirm("Discard unsaved changes and open the saved document?"))
    return;
  task("Opening document…", async () => {
    const r = await api("documents/" + key);
    await load(r.document, r.id, r.revision);
    say("Saved document opened.");
  });
};
$("undo").onclick = () =>
  task("Restoring previous state…", async () => {
    if (!undo.length) return;
    const next = undo.at(-1),
      checked = await api("validate", next);
    undo.pop();
    redo.push(clone(doc));
    doc = checked.document;
    analysis = checked.analysis;
    dirty = true;
    selected = new Set(
      [...selected].filter((k) => doc[KEY].some((x) => x.id === k)),
    );
    render();
    say("Change undone.");
  });
$("redo").onclick = () =>
  task("Reapplying change…", async () => {
    if (!redo.length) return;
    const next = redo.at(-1),
      checked = await api("validate", next);
    redo.pop();
    undo.push(clone(doc));
    doc = checked.document;
    analysis = checked.analysis;
    dirty = true;
    render();
    say("Change reapplied.");
  });
$("add").onclick = () => editEntry();
$("settings").onclick = () =>
  dialog("Document settings", settingsFields(), (values) =>
    change({ ...doc, ...values }),
  );
$("export").onclick = () =>
  task("Validating export…", async () => {
    const checked = await api("validate", doc);
    download(
      KIND + ".json",
      JSON.stringify(checked.document, null, 2) + "\n",
      "application/json",
    );
    say("Validated document exported.");
  });
$("import").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (dirty && !confirm("Replace unsaved changes with this import?")) {
    e.target.value = "";
    return;
  }
  task("Validating import…", async () => {
    try {
      if (file.size > 256000) throw Error("Imports are limited to 256 KB.");
      await load(JSON.parse(await file.text()));
      say("Document imported. Save to add it to the library.");
    } finally {
      e.target.value = "";
    }
  });
};
$("print").onclick = () => window.print();
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
function settingsFields() {
  return [["Document title", "title", doc.title]];
}

function unique() {
  return "entry-" + crypto.randomUUID().slice(0, 12);
}
function newEntry() {
  return {
    id: unique(),
    name: "New material",
    folder: doc.folders[0],
    kind: "paper",
    status: "available",
    quantity: 1,
    tags: [],
    note: "—",
  };
}
function entryFields(x) {
  return [
    ["Material name", "name", x.name],
    ["Collection", "folder", x.folder, "text", doc.folders],
    [
      "Material type",
      "kind",
      x.kind,
      "text",
      ["paper", "fabric", "wood", "metal"],
    ],
    [
      "Status",
      "status",
      x.status,
      "text",
      ["available", "reserved", "archived"],
    ],
    ["Quantity", "quantity", x.quantity, "number"],
    ["Tags (comma-separated)", "tags", x.tags.join(", ")],
    ["Notes", "note", x.note, "textarea"],
  ];
}
function normalizeEntry(x) {
  return {
    ...x,
    tags:
      typeof x.tags === "string"
        ? x.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : x.tags,
  };
}
function domainTools(tools) {
  tools.append(
    selectField(
      "Collection",
      [["all", "All collections"], ...doc.folders.map((f) => [f, f])],
      filter,
      (v) => {
        filter = v;
        pageNumber = 0;
        renderWorkspace();
        controls();
      },
    ),
    button("Add collection", () =>
      dialog("Add collection", [["Collection name", "name", ""]], (v) =>
        change({ ...doc, folders: [...doc.folders, v.name] }),
      ),
    ),
  );
}
function renderWorkspace() {
  const root = $("workspace");
  root.replaceChildren();
  const rows = doc.items
    .filter(
      (x) =>
        (filter === "all" || x.folder === filter) &&
        [x.name, x.kind, ...x.tags].join(" ").toLowerCase().includes(query),
    )
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const total = Math.max(1, Math.ceil(rows.length / 4));
  pageNumber = Math.min(pageNumber, total - 1);
  const card = node("section", undefined, "card"),
    top = node("div", undefined, "heading");
  top.append(node("h2", `${rows.length} matching materials`));
  const actions = node("div", undefined, "row");
  const selectedCount = node(
    "span",
    `${selected.size} selected · ${[...selected].filter((k) => !rows.some((x) => x.id === k)).length} hidden by filters`,
    "muted",
  );
  selectedCount.id = "selection-count";
  actions.append(
    selectedCount,
    button("Select visible page", () => {
      rows
        .slice(pageNumber * 4, pageNumber * 4 + 4)
        .forEach((x) => selected.add(x.id));
      renderWorkspace();
      controls();
    }),
    button("Clear selection", () => {
      selected.clear();
      renderWorkspace();
      controls();
    }),
    button("Move selected", () => {
      if (!selected.size) {
        say("Select materials first.");
        return;
      }
      dialog(
        `Move ${selected.size} selected materials`,
        [
          [
            "Destination collection",
            "folder",
            doc.folders[0],
            "text",
            doc.folders,
          ],
        ],
        (v) =>
          change({
            ...doc,
            items: doc.items.map((x) =>
              selected.has(x.id) ? { ...x, folder: v.folder } : x,
            ),
          }),
      );
    }),
    button("Archive selected", () => {
      if (!selected.size) {
        say("Select materials first.");
        return;
      }
      if (
        confirm(
          `Archive all ${selected.size} selected materials, including selections hidden by filters?`,
        )
      )
        task("Archiving selection…", () =>
          change({
            ...doc,
            items: doc.items.map((x) =>
              selected.has(x.id) ? { ...x, status: "archived" } : x,
            ),
          }),
        );
    }),
  );
  top.append(actions);
  card.append(top);
  const grid = node("div", undefined, "grid");
  for (const item of rows.slice(pageNumber * 4, pageNumber * 4 + 4)) {
    const n = node("article", undefined, "material"),
      label = node("label", "Select " + item.name),
      check = node("input");
    check.type = "checkbox";
    check.id = "check-" + item.id;
    check.checked = selected.has(item.id);
    check.onchange = () => {
      check.checked ? selected.add(item.id) : selected.delete(item.id);
      renderWorkspace();
      controls();
      $("check-" + item.id)?.focus({ preventScroll: true });
    };
    label.prepend(check);
    const swatch = node("div", undefined, "swatch " + item.kind);
    swatch.setAttribute("aria-hidden", "true");
    const edit = button("Edit material", () => editEntry(item));
    edit.setAttribute("aria-label", "Edit " + item.name);
    n.append(
      swatch,
      node("h3", item.name),
      node(
        "p",
        `${item.folder} · ${item.kind} · ${item.quantity} units`,
        "muted",
      ),
      node("span", item.status, "tag"),
      node("p", item.tags.join(" · ") || "No tags", "muted"),
      label,
      edit,
    );
    grid.append(n);
  }
  if (!rows.length)
    grid.append(node("p", "No materials match your filters.", "empty"));
  const nav = node("div", undefined, "row"),
    prev = button("Previous page", () => {
      pageNumber = Math.max(0, pageNumber - 1);
      renderWorkspace();
      controls();
    }),
    next = button("Next page", () => {
      pageNumber = Math.min(total - 1, pageNumber + 1);
      renderWorkspace();
      controls();
    });
  nav.append(
    prev,
    node("p", `Page ${pageNumber + 1} of ${total}`, "muted"),
    next,
  );
  card.append(grid, nav);
  root.append(card);
}

task("Preparing workspace…", async () => {
  await load(await api("sample"));
  await library();
  say("Fictional sample loaded. Changes stay local.");
});
