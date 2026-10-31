import {
  project,
  subscribe,
  undo,
  redo,
  canUndo,
  canRedo,
  getProjectData,
  loadProject,
  setProjectName,
  removeTattoo,
} from "../state.js";

export function initTopbar() {
  const $ = (id) => document.getElementById(id);
  const undoBtn = $("btn-undo");
  const redoBtn = $("btn-redo");
  const saveBtn = $("btn-save");
  const loadBtn = $("btn-load");
  const loadInput = $("load-input");
  const nameInput = $("project-name");

  function render() {
    undoBtn.disabled = !canUndo();
    redoBtn.disabled = !canRedo();
    if (document.activeElement !== nameInput) nameInput.value = project.name;
  }

  nameInput.addEventListener("input", () => setProjectName(nameInput.value));
  nameInput.addEventListener("blur", () => {
    if (!nameInput.value.trim()) setProjectName("Bez tytułu");
    render();
  });

  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") nameInput.blur();
  });

  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);

  saveBtn.addEventListener("click", () => {
    const safeName = (project.name.trim() || "projekt").replace(
      /[\\/:\*?"<>|]+/g,
      "-",
    );

    const blob = new Blob([JSON.stringify(getProjectData())], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = safeName + ".tattooplan.json";
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  loadBtn.addEventListener("click", () => loadInput.click());

  loadInput.addEventListener("change", async () => {
    const file = loadInput.files[0];
    loadInput.value = "";
    if (!file) return;

    try {
      loadProject(JSON.parse(await file.text()));
    } catch (err) {
      alert(
        "Nie udało się wczytać pliku. " +
          (err instanceof SyntaxError ? "Plik jest uszkodzony." : err.message),
      );
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("textarea, input:not([type=range])")) return;

    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (ctrl && key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (ctrl && (key === "y" || (key === "z" && e.shiftKey))) {
      e.preventDefault();
      redo();
    } else if (e.key === "Delete" && project.selectedId) {
      removeTattoo(project.selectedId);
    }
  });

  subscribe(render);
  render();
}
