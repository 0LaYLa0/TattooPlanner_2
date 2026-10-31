import { addTattoo } from "../state.js";

const MAX_SIZE = 800;
const SOFT_EDGE = 40;
const MAX_UNDO = 30;

const ERASED = 1;
const RESTORED = 2;

export function initUpload() {
  const $ = (id) => document.getElementById(id);

  const dropzone = $("dropzone");
  const input = $("upload-input");
  const editor = $("upload-editor");
  const canvas = $("upload-canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const slider = $("upload-threshold");
  const sliderVal = $("threshold-val");
  const tolRow = $("tolerance-row");
  const tolSlider = $("upload-tolerance");
  const tolVal = $("tolerance-val");
  const brushRow = $("brush-row");
  const brushSlider = $("upload-brush");
  const brushVal = $("brush-val");
  const toolButtons = document.querySelectorAll("#upload-tools [data-tool]");
  const undoBtn = $("upload-undo");
  const clearBtn = $("upload-clear-edits");
  const addBtn = $("upload-add");
  const resetBtn = $("upload-reset");

  let original = null;
  let edits = null;
  let undoStack = [];
  let tool = "wand";
  let fileName = "Własny tatuaż";
  let drawing = false;
  let lastPoint = null;
  let renderQueued = false;

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    fileName = file.name.replace(/\.[^.]+$/, "");

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const ratio = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      original = ctx.getImageData(0, 0, canvas.width, canvas.height);
      edits = new Uint8Array(canvas.width * canvas.height);
      undoStack = [];
      URL.revokeObjectURL(url);

      dropzone.hidden = true;
      editor.hidden = false;
      updateLabels();
      updateUndoButton();
      render();
    };

    img.src = url;
  }

  function render() {
    renderQueued = false;
    if (!original) return;

    const t = +slider.value;
    const src = original.data;
    const out = new ImageData(
      new Uint8ClampedArray(src),
      original.width,
      original.height,
    );
    const d = out.data;

    for (let p = 0, i = 0; p < edits.length; p++, i += 4) {
      const e = edits[p];

      if (e === ERASED) {
        d[i + 3] = 0;
        continue;
      }

      if (e === RESTORED) continue;

      const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
      let keep = 1;

      if (lum >= t) keep = 0;
      else if (lum > t - SOFT_EDGE) keep = (t - lum) / SOFT_EDGE;

      d[i + 3] = src[i + 3] * keep;
    }

    ctx.putImageData(out, 0, 0);
  }

  function scheduleRender() {
    if (!renderQueued) {
      renderQueued = true;
      requestAnimationFrame(render);
    }
  }

  function updateLabels() {
    sliderVal.textContent = +slider.value === 256 ? "wył." : slider.value;
    tolVal.textContent = tolSlider.value;
    brushVal.textContent = brushSlider.value;
  }

  function pushUndo() {
    undoStack.push(edits.slice());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    updateUndoButton();
  }

  function undo() {
    if (!undoStack.length) return;
    edits = undoStack.pop();
    updateUndoButton();
    render();
  }

  function updateUndoButton() {
    undoBtn.disabled = undoStack.length === 0;
  }

  function floodFill(sx, sy) {
    const w = original.width;
    const h = original.height;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;

    const src = original.data;
    const si = (sy * w + sx) * 4;
    const tr = src[si],
      tg = src[si + 1],
      tb = src[si + 2];

    const maxDist = +tolSlider.value * 3;
    const maxDist2 = maxDist * maxDist;

    const visited = new Uint8Array(w * h);
    const start = sy * w + sx;
    const stack = [start];
    visited[start] = 1;

    while (stack.length) {
      const p = stack.pop();
      const i = p * 4;
      const dr = src[i] - tr,
        dg = src[i + 1] - tg,
        db = src[i + 2] - tb;

      if (dr * dr + dg * dg + db * db > maxDist2) continue;

      edits[p] = ERASED;

      const x = p % w;
      const y = (p - x) / w;

      if (x > 0 && !visited[p - 1]) {
        visited[p - 1] = 1;
        stack.push(p - 1);
      }

      if (x < w - 1 && !visited[p + 1]) {
        visited[p + 1] = 1;
        stack.push(p + 1);
      }

      if (y > 0 && !visited[p - w]) {
        visited[p - w] = 1;
        stack.push(p - w);
      }

      if (y < h - 1 && !visited[p + w]) {
        visited[p + w] = 1;
        stack.push(p + w);
      }
    }
  }

  function brushRadius() {
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    return Math.max(1, Math.round(+brushSlider.value * scale));
  }

  function stamp(cx, cy, r, value) {
    const w = original.width;
    const h = original.height;
    const r2 = r * r;

    for (let y = Math.max(0, cy - r); y <= Math.min(h - 1, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(w - 1, cx + r); x++) {
        const dx = x - cx,
          dy = y - cy;

        if (dx * dx + dy * dy <= r2) edits[y * w + x] = value;
      }
    }
  }

  function strokeTo(pt, value) {
    const r = brushRadius();

    if (!lastPoint) {
      stamp(pt.x, pt.y, r, value);
    } else {
      const dx = pt.x - lastPoint.x;
      const dy = pt.y - lastPoint.y;

      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(dx, dy) / Math.max(1, r / 3)),
      );

      for (let s = 1; s <= steps; s++) {
        stamp(
          Math.round(lastPoint.x + (dx * s) / steps),
          Math.round(lastPoint.y + (dy * s) / steps),
          r,
          value,
        );
      }
    }

    lastPoint = pt;
    scheduleRender();
  }

  function toCanvasPoint(e) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: Math.floor(((e.clientX - rect.left) * canvas.width) / rect.width),
      y: Math.floor(((e.clientY - rect.top) * canvas.height) / rect.height),
    };
  }

  const brushValue = () => (tool === "erase" ? ERASED : RESTORED);

  canvas.addEventListener("pointerdown", (e) => {
    if (!original) return;

    const pt = toCanvasPoint(e);
    pushUndo();

    if (tool === "wand") {
      floodFill(pt.x, pt.y);
      scheduleRender();
      return;
    }

    drawing = true;
    lastPoint = null;
    canvas.setPointerCapture(e.pointerId);
    strokeTo(pt, brushValue());
  });

  canvas.addEventListener("pointermove", (e) => {
    if (drawing) strokeTo(toCanvasPoint(e), brushValue());
  });

  const endStroke = () => {
    drawing = false;
    lastPoint = null;
  };

  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);

  toolButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tool = btn.dataset.tool;
      toolButtons.forEach((b) => b.classList.toggle("active", b === btn));
      tolRow.hidden = tool !== "wand";
      brushRow.hidden = tool === "wand";
    });
  });

  slider.addEventListener("input", () => {
    updateLabels();
    scheduleRender();
  });

  tolSlider.addEventListener("input", updateLabels);
  brushSlider.addEventListener("input", updateLabels);

  undoBtn.addEventListener("click", undo);

  clearBtn.addEventListener("click", () => {
    if (!original) return;
    pushUndo();
    edits.fill(0);
    render();
  });

  input.addEventListener("change", () => loadFile(input.files[0]));

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("over");
  });

  dropzone.addEventListener("dragleave", () =>
    dropzone.classList.remove("over"),
  );

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("over");
    loadFile(e.dataTransfer.files[0]);
  });

  resetBtn.addEventListener("click", () => {
    original = null;
    edits = null;
    undoStack = [];
    input.value = "";
    editor.hidden = true;
    dropzone.hidden = false;
  });

  addBtn.addEventListener("click", () => {
    if (!original) return;

    addTattoo({ name: fileName, src: canvas.toDataURL("image/png") });

    addBtn.textContent = "Dodano ✓";
    setTimeout(() => (addBtn.textContent = "Dodaj do planera"), 1500);
  });
}
