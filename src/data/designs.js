const svg = (inner) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="black" stroke-width="3" stroke-linecap="round">${inner}</svg>`,
  );

const petal = (angle) =>
  `<ellipse cx="50" cy="28" rx="9" ry="17" transform="rotate(${angle} 50 50)"/>`;

export const designs = [
  {
    id: "flower1",
    name: "Kwiat",
    category: "kwiaty",
    src: svg(
      [0, 72, 144, 216, 288].map(petal).join("") +
        '<circle cx="50" cy="50" r="6"/>',
    ),
  },
  {
    id: "flower2",
    name: "Mały kwiat",
    category: "kwiaty",
    src: svg(
      [0, 90, 180, 270].map(petal).join("") + '<circle cx="50" cy="50" r="5"/>',
    ),
  },
  {
    id: "circles",
    name: "Podwójny okrąg",
    category: "geometryczne",
    src: svg(
      '<circle cx="50" cy="50" r="38"/><circle cx="50" cy="50" r="22"/>',
    ),
  },
  {
    id: "triangle",
    name: "Trójkąt",
    category: "geometryczne",
    src: svg('<polygon points="50,14 86,80 14,80"/>'),
  },
  {
    id: "line",
    name: "Linia",
    category: "minimalistyczne",
    src: svg('<path d="M15 50 H85"/>'),
  },
  {
    id: "dots",
    name: "Kropki",
    category: "minimalistyczne",
    src: svg(
      '<circle cx="30" cy="50" r="4"/><circle cx="50" cy="50" r="4"/><circle cx="70" cy="50" r="4"/>',
    ),
  },
];
