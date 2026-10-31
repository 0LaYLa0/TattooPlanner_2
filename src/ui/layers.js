import {
  project,
  subscribe,
  selectTattoo,
  toggleVisible,
  removeTattoo,
  moveTattoo,
} from "../state.js";

export function initLayers() {
  const list = document.getElementById("layers-list");
  let dragId = null;

  function clearIndicators() {
    list
      .querySelectorAll(".layer")
      .forEach((r) =>
        r.classList.remove("drop-above", "drop-below", "dragging"),
      );
  }

  function render() {
    list.innerHTML = "";

    if (project.tattoos.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Nic tu jeszcze nie ma. Wybierz wzór z biblioteki.";
      list.appendChild(empty);
      return;
    }

    const hint = document.createElement("p");
    hint.className = "muted hint";
    hint.textContent =
      "Przeciągnij, by zmienić kolejność. Góra listy = na wierzchu.";
    list.appendChild(hint);

    [...project.tattoos].reverse().forEach((t) => {
      const row = document.createElement("div");
      row.className =
        "layer" + (t.id === project.selectedId ? " selected" : "");
      row.draggable = true;
      row.addEventListener("click", () => selectTattoo(t.id));

      row.addEventListener("dragstart", (e) => {
        dragId = t.id;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", t.id);
        row.classList.add("dragging");
      });

      row.addEventListener("dragover", (e) => {
        if (!dragId || dragId === t.id) return;
        e.preventDefault();
        const rect = row.getBoundingClientRect();
        const above = e.clientY < rect.top + rect.height / 2;
        row.classList.toggle("drop-above", above);
        row.classList.toggle("drop-below", !above);
      });

      row.addEventListener("dragleave", () => {
        row.classList.remove("drop-above", "drop-below");
      });

      row.addEventListener("drop", (e) => {
        e.preventDefault();
        const rect = row.getBoundingClientRect();
        const above = e.clientY < rect.top + rect.height / 2;
        const movedId = dragId;
        dragId = null;
        clearIndicators();
        if (movedId) moveTattoo(movedId, t.id, above);
      });

      row.addEventListener("dragend", () => {
        dragId = null;
        clearIndicators();
      });

      const grip = document.createElement("span");
      grip.className = "grip";
      grip.textContent = "⠿";

      const thumb = document.createElement("div");
      thumb.className = "thumb";
      const img = document.createElement("img");
      img.src = t.image;
      img.draggable = false;
      thumb.appendChild(img);

      const name = document.createElement("span");
      name.className = "layer-name";
      name.textContent = t.name;

      const eye = document.createElement("button");
      eye.className = "icon-btn";
      eye.textContent = t.visible ? "👁" : "—";
      eye.title = "Pokaż / ukryj";
      eye.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleVisible(t.id);
      });

      const del = document.createElement("button");
      del.className = "icon-btn";
      del.textContent = "✕";
      del.title = "Usuń";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        removeTattoo(t.id);
      });

      row.append(grip, thumb, name, eye, del);
      list.appendChild(row);
    });
  }

  subscribe(render);
  render();
}
