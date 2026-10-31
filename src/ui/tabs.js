export function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      panels.forEach((p) =>
        p.classList.toggle("active", p.id === "panel-" + tab.dataset.panel),
      );
    });
  });
}
