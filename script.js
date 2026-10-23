const originalInput = document.querySelector("#originalCode");
const modifiedInput = document.querySelector("#modifiedCode");
const originalCount = document.querySelector("#originalCount");
const modifiedCount = document.querySelector("#modifiedCount");
const results = document.querySelector("#results");
const diffOutput = document.querySelector("#diffOutput");
const toast = document.querySelector("#toast");

let currentDiff = [];

const examples = {
  original: `function saludar(nombre) {
  const mensaje = "Hola, " + nombre;
  console.log(mensaje);
}

saludar("mundo");`,
  modified: `function saludar(nombre = "mundo") {
  const mensaje = \`¡Hola, \${nombre}!\`;
  return mensaje;
}

console.log(saludar("equipo"));`,
};

function getLines(value) {
  if (!value) return [];
  return value.replace(/\r\n/g, "\n").split("\n");
}

function lineLabel(count) {
  return `${count} ${count === 1 ? "línea" : "líneas"}`;
}

function updateCounts() {
  const before = getLines(originalInput.value).length;
  const after = getLines(modifiedInput.value).length;
  originalCount.textContent = lineLabel(before);
  modifiedCount.textContent = lineLabel(after);
}

function calculateDiff(before, after) {
  const rows = Array.from({ length: before.length + 1 }, () =>
    new Uint32Array(after.length + 1),
  );

  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      rows[i][j] = before[i] === after[j]
        ? rows[i + 1][j + 1] + 1
        : Math.max(rows[i + 1][j], rows[i][j + 1]);
    }
  }

  const changes = [];
  let i = 0;
  let j = 0;
  let oldLine = 1;
  let newLine = 1;

  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      changes.push({ type: "same", text: before[i], oldLine, newLine });
      i += 1; j += 1; oldLine += 1; newLine += 1;
    } else if (j < after.length && (i === before.length || rows[i][j + 1] >= rows[i + 1][j])) {
      changes.push({ type: "add", text: after[j], oldLine: null, newLine });
      j += 1; newLine += 1;
    } else {
      changes.push({ type: "remove", text: before[i], oldLine, newLine: null });
      i += 1; oldLine += 1;
    }
  }

  return changes;
}

function renderDiff(changes) {
  diffOutput.replaceChildren();
  const fragment = document.createDocumentFragment();

  changes.forEach((change) => {
    const row = document.createElement("div");
    row.className = `diff-row ${change.type}`;
    row.setAttribute("role", "row");

    const oldNumber = document.createElement("span");
    const newNumber = document.createElement("span");
    const sign = document.createElement("span");
    const code = document.createElement("span");

    oldNumber.className = "line-no";
    newNumber.className = "line-no";
    sign.className = "line-sign";
    code.className = "line-code";

    oldNumber.textContent = change.oldLine ?? "";
    newNumber.textContent = change.newLine ?? "";
    sign.textContent = change.type === "add" ? "+" : change.type === "remove" ? "−" : "";
    code.textContent = change.text || " ";

    row.append(oldNumber, newNumber, sign, code);
    fragment.append(row);
  });

  diffOutput.append(fragment);
}

function compare() {
  const before = getLines(originalInput.value);
  const after = getLines(modifiedInput.value);

  if (!before.length && !after.length) {
    originalInput.focus();
    showToast("Pega al menos una versión para comparar");
    return;
  }

  currentDiff = calculateDiff(before, after);
  renderDiff(currentDiff);

  const totals = currentDiff.reduce((result, item) => {
    result[item.type] += 1;
    return result;
  }, { add: 0, remove: 0, same: 0 });

  document.querySelector("#addedStat").textContent = totals.add;
  document.querySelector("#removedStat").textContent = totals.remove;
  document.querySelector("#unchangedStat").textContent = totals.same;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 1900);
}

document.querySelector("#compareButton").addEventListener("click", compare);

document.querySelector("#sampleButton").addEventListener("click", () => {
  originalInput.value = examples.original;
  modifiedInput.value = examples.modified;
  updateCounts();
  compare();
});

document.querySelector("#swapButton").addEventListener("click", () => {
  [originalInput.value, modifiedInput.value] = [modifiedInput.value, originalInput.value];
  updateCounts();
  if (!results.hidden) compare();
});

document.querySelector("#clearButton").addEventListener("click", () => {
  originalInput.value = "";
  modifiedInput.value = "";
  currentDiff = [];
  results.hidden = true;
  updateCounts();
  originalInput.focus();
});

document.querySelector("#copyButton").addEventListener("click", async () => {
  const text = currentDiff.map((line) => {
    const marker = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
    return `${marker} ${line.text}`;
  }).join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("Diff copiado al portapapeles");
  } catch {
    showToast("No se pudo copiar el diff");
  }
});

[originalInput, modifiedInput].forEach((input) => {
  input.addEventListener("input", updateCounts);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = input.selectionStart;
      input.setRangeText("  ", start, input.selectionEnd, "end");
      updateCounts();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") compare();
  });
});

updateCounts();
