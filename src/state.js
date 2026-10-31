const listeners = [];
let counter = 0;

export const project = {
  name: "Bez tytułu",
  tattoos: [],
  selectedId: null,
};

const DEFAULTS = {
  name: "Tatuaż",
  image: "",
  position: [0, 1.2, 0],
  normal: [0, 0, 1],
  rotation: 0,
  sizeCm: 10,
  scale: 0.1,
  opacity: 0.9,
  mirrored: false,
  visible: true,
  locked: false,
  placed: false, //
  meshIndex: null,
};

export function subscribe(fn) {
  listeners.push(fn);
}

function notify() {
  listeners.forEach((fn) => fn(project));
}

//cofnij i ponow
const MAX_HISTORY = 50;
const COALESCE_MS = 800;
const undoStack = [];
const redoStack = [];
let lastEditKey = null;
let lastEditTime = 0;

// kopia plytka
function takeSnapshot() {
  return {
    tattoos: project.tattoos.map((t) => ({
      ...t,
      position: [...t.position],
      normal: [...t.normal],
    })),
    selectedId: project.selectedId,
  };
}

function record(coalesceKey = null) {
  const now = Date.now();
  if (
    coalesceKey &&
    coalesceKey === lastEditKey &&
    now - lastEditTime < COALESCE_MS
  ) {
    lastEditTime = now;
    return;
  }
  undoStack.push(takeSnapshot());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  lastEditKey = coalesceKey;
  lastEditTime = now;
}

function restore(snap) {
  project.tattoos = snap.tattoos;
  project.selectedId = snap.tattoos.some((t) => t.id === snap.selectedId)
    ? snap.selectedId
    : null;
  lastEditKey = null;
  notify();
}

export function undo() {
  if (!undoStack.length) return;
  redoStack.push(takeSnapshot());
  restore(undoStack.pop());
}

export function redo() {
  if (!redoStack.length) return;
  undoStack.push(takeSnapshot());
  restore(redoStack.pop());
}

export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;

/*zmiany stanu  */

export function addTattoo(design) {
  record();
  const tattoo = {
    ...DEFAULTS,
    id: "t" + ++counter,
    name: design.name,
    image: design.src,
    position: [...DEFAULTS.position],
    normal: [...DEFAULTS.normal],
  };
  project.tattoos.push(tattoo);
  project.selectedId = tattoo.id;
  notify();
}

export function selectTattoo(id) {
  project.selectedId = id;
  notify();
}

export function toggleVisible(id) {
  const t = project.tattoos.find((t) => t.id === id);
  if (!t) return;
  record();
  t.visible = !t.visible;
  notify();
}

export function removeTattoo(id) {
  if (!project.tattoos.some((t) => t.id === id)) return;
  record();
  project.tattoos = project.tattoos.filter((t) => t.id !== id);
  if (project.selectedId === id) project.selectedId = null;
  notify();
}

export function moveTattoo(dragId, targetId, above) {
  if (dragId === targetId) return;

  const arr = project.tattoos;
  const from = arr.findIndex((t) => t.id === dragId);
  if (from === -1 || !arr.some((t) => t.id === targetId)) return;

  record();
  const [item] = arr.splice(from, 1);
  const to = arr.findIndex((t) => t.id === targetId);

  arr.splice(above ? to + 1 : to, 0, item);
  notify();
}

export function updateTattoo(id, changes) {
  const t = project.tattoos.find((t) => t.id === id);
  if (!t) return;
  record(id + ":" + Object.keys(changes).sort().join(","));
  Object.assign(t, changes);
  notify();
}

export function duplicateTattoo(id) {
  const t = project.tattoos.find((t) => t.id === id);
  if (!t) return;
  record();
  const copy = {
    ...t,
    id: "t" + ++counter,
    name: t.name + " (kopia)",
    position: [...t.position],
    normal: [...t.normal],
    locked: false,
  };
  project.tattoos.splice(project.tattoos.indexOf(t) + 1, 0, copy);
  project.selectedId = copy.id;
  notify();
}

export function setProjectName(name) {
  project.name = name;
  notify();
}

export function getProjectData() {
  return {
    app: "tattoo-planner",
    version: 1,
    name: project.name,
    tattoos: project.tattoos,
  };
}

export function loadProject(data) {
  if (!data || !Array.isArray(data.tattoos)) {
    throw new Error("To nie jest plik projektu Tattoo Planner.");
  }
  record();
  project.name =
    typeof data.name === "string" && data.name.trim()
      ? data.name
      : "Bez tytułu";
  project.tattoos = data.tattoos
    .filter((t) => t && typeof t.image === "string")
    .map((t) => ({
      ...DEFAULTS,
      ...t,
      id: "t" + ++counter,
      position: [...(t.position || DEFAULTS.position)],
      normal: [...(t.normal || DEFAULTS.normal)],
    }));
  project.selectedId = null;
  notify();
}
