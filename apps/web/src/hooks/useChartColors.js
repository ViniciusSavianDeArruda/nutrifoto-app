const NAMES = ["night", "line", "soft", "ink", "protein", "carb", "fat", "fiber", "surface", "yolk"];

function read() {
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(NAMES.map((n) => [n, `rgb(${cs.getPropertyValue(`--c-${n}`).trim().split(" ").join(",")})`]));
}

/** Cores do tema atual para o Recharts (que desenha em SVG e precisa de valores concretos). */
export function useChartColors() {
  return read();
}
