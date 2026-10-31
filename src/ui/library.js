import { designs } from "../data/designs.js";
import { addTattoo } from "../state.js";

export function initLibrary() {
  const grid = document.getElementById("library-grid");
  const search = document.getElementById("library-search");
  const chips = document.querySelectorAll("#panel-library .chip");

  let category = "all";
  let query = "";

  function render() {
    grid.innerHTML = "";
    const visible = designs.filter(
      (d) =>
        (category === "all" || d.category === category) &&
        d.name.toLowerCase().includes(query),
    );

    visible.forEach((design) => {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.title = design.name;

      const img = document.createElement("img");
      img.src = design.src;
      img.alt = design.name;

      tile.appendChild(img);
      tile.addEventListener("click", () => addTattoo(design));
      grid.appendChild(tile);
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      category = chip.dataset.category;
      chips.forEach((c) => c.classList.toggle("active", c === chip));
      render();
    });
  });

  search.addEventListener("input", () => {
    query = search.value.trim().toLowerCase();
    render();
  });

  render();
}
