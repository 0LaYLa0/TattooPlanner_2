import {
  project,
  subscribe,
  updateTattoo,
  duplicateTattoo,
  removeTattoo,
} from "../state.js";

export function initEditPanel() {
  const $ = (id) => document.getElementById(id);

  const empty = $("edit-empty");
  const controls = $("edit-controls");
  const nameInput = $("edit-name");
  const scale = $("edit-scale");
  const rotation = $("edit-rotation");
  const opacity = $("edit-opacity");
  const btnMirror = $("btn-mirror");
  const btnLock = $("btn-lock");

  const current = () =>
    project.tattoos.find((t) => t.id === project.selectedId);

  function render() {
    const t = current();
    empty.hidden = !!t;
    controls.hidden = !t;
    if (!t) return;

    if (nameInput.value !== t.name) nameInput.value = t.name;

    scale.value = t.sizeCm;
    $("scale-val").textContent = t.sizeCm + " cm";

    rotation.value = t.rotation;
    $("rotation-val").textContent = t.rotation + "°";

    const op = Math.round(t.opacity * 100);
    opacity.value = op;
    $("opacity-val").textContent = op + "%";

    btnMirror.classList.toggle("active", t.mirrored);
    btnLock.textContent = t.locked ? "Odblokuj" : "Zablokuj";

    [nameInput, scale, rotation, opacity, btnMirror].forEach((el) => {
      el.disabled = t.locked;
    });
  }

  nameInput.addEventListener("input", () => {
    const t = current();
    if (t) updateTattoo(t.id, { name: nameInput.value });
  });

  scale.addEventListener("input", () => {
    const t = current();
    if (t)
      updateTattoo(t.id, { sizeCm: +scale.value, scale: scale.value / 100 });
  });

  rotation.addEventListener("input", () => {
    const t = current();
    if (t) updateTattoo(t.id, { rotation: +rotation.value });
  });

  opacity.addEventListener("input", () => {
    const t = current();
    if (t) updateTattoo(t.id, { opacity: opacity.value / 100 });
  });

  btnMirror.addEventListener("click", () => {
    const t = current();
    if (t) updateTattoo(t.id, { mirrored: !t.mirrored });
  });

  btnLock.addEventListener("click", () => {
    const t = current();
    if (t) updateTattoo(t.id, { locked: !t.locked });
  });

  $("btn-duplicate").addEventListener("click", () => {
    const t = current();
    if (t) duplicateTattoo(t.id);
  });

  $("btn-delete").addEventListener("click", () => {
    const t = current();
    if (t) removeTattoo(t.id);
  });

  subscribe(render);
  render();
}
