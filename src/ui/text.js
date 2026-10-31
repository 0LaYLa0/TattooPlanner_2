import { fonts } from "../data/fonts.js";
import { addTattoo } from "../state.js";

const STORAGE_KEY = "tattooplanner-fav-fonts";
const SAMPLE = "Twój napis";
const RENDER_SIZE = 120;

export function initText() {
  const $ = (id) => document.getElementById(id);
  const textInput = $("text-input");
  const search = $("font-search");
  const list = $("font-list");
  const savedBtn = $("fonts-saved-toggle");
  const addBtn = $("text-add");

  let selected = fonts[0].name;
  let query = "";
  let onlySaved = false;
  const favorites = loadFavorites();

  function loadFavorites() {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) || []);
    } catch {
      return new Set();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
    } catch {}
  }

  function sampleText() {
    const line = textInput.value.split("\n").find((l) => l.trim());
    return line ? line.trim().slice(0, 40) : SAMPLE;
  }

  function render() {
    list.innerHTML = "";
    const sample = sampleText();

    const visible = fonts.filter(
      (f) =>
        f.name.toLowerCase().includes(query) &&
        (!onlySaved || favorites.has(f.name)),
    );

    if (visible.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = onlySaved
        ? "Nie masz jeszcze zapisanych czcionek. Kliknij ♡ przy czcionce."
        : "Nie ma takiej czcionki.";
      list.appendChild(empty);
      return;
    }

    visible.forEach((font) => {
      const row = document.createElement("div");
      row.className = "font-row" + (font.name === selected ? " selected" : "");
      row.addEventListener("click", () => {
        selected = font.name;
        render();
      });

      const main = document.createElement("div");
      main.className = "font-main";

      const sampleEl = document.createElement("span");
      sampleEl.className = "font-sample";
      sampleEl.style.fontFamily = `"${font.name}", ${font.fallback}`;
      sampleEl.style.fontWeight = font.weight;
      sampleEl.textContent = sample;

      const nameEl = document.createElement("span");
      nameEl.className = "font-name";
      nameEl.textContent = font.name;

      main.append(sampleEl, nameEl);

      const heart = document.createElement("button");
      heart.className = "icon-btn" + (favorites.has(font.name) ? " on" : "");
      heart.textContent = favorites.has(font.name) ? "♥" : "♡";
      heart.title = "Zapisz czcionkę";
      heart.addEventListener("click", (e) => {
        e.stopPropagation();
        if (favorites.has(font.name)) favorites.delete(font.name);
        else favorites.add(font.name);
        saveFavorites();
        render();
      });

      row.append(main, heart);
      list.appendChild(row);
    });
  }

  async function renderTextToImage(text, font) {
    const lines = text
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l) => l.trim());
    const fontStr = `${font.weight} ${RENDER_SIZE}px "${font.name}"`;

    const faces = await document.fonts.load(fontStr, text);
    if (faces.length === 0) throw new Error("font not loaded");

    const measure = document.createElement("canvas").getContext("2d");
    measure.font = fontStr;
    const widest = Math.max(...lines.map((l) => measure.measureText(l).width));

    const pad = Math.round(RENDER_SIZE * 0.3);
    const lineH = Math.round(RENDER_SIZE * 1.3);

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(widest) + pad * 2;
    canvas.height = lineH * lines.length + pad * 2;

    const ctx = canvas.getContext("2d");
    ctx.font = fontStr;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    lines.forEach((line, i) => {
      ctx.fillText(line, canvas.width / 2, pad + lineH * (i + 0.5));
    });

    return canvas.toDataURL("image/png");
  }

  function flash(message) {
    addBtn.textContent = message;
    setTimeout(() => (addBtn.textContent = "Dodaj do planera"), 1500);
  }

  textInput.addEventListener("input", render);

  search.addEventListener("input", () => {
    query = search.value.trim().toLowerCase();
    render();
  });

  savedBtn.addEventListener("click", () => {
    onlySaved = !onlySaved;
    savedBtn.classList.toggle("active", onlySaved);
    savedBtn.textContent = onlySaved
      ? "Pokaż wszystkie czcionki"
      : "Pokaż zapisane czcionki ♡";
    render();
  });

  addBtn.addEventListener("click", async () => {
    const text = textInput.value;
    if (!text.trim()) {
      flash("Wpisz najpierw napis");
      textInput.focus();
      return;
    }

    const font = fonts.find((f) => f.name === selected);

    try {
      const src = await renderTextToImage(text, font);
      const firstLine = text.trim().split("\n")[0].slice(0, 24);
      addTattoo({ name: `Napis: ${firstLine}`, src });
      flash("Dodano ✓");
    } catch {
      flash("Czcionka się nie wczytała");
    }
  });

  render();
}
