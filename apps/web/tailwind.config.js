/** Tokens espelham DESIGN.md. Cores em variáveis CSS para o modo escuro. */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        night: "rgb(var(--c-night) / <alpha-value>)",
        "night-deep": "rgb(var(--c-night-deep) / <alpha-value>)",
        ground: "rgb(var(--c-ground) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        soft: "rgb(var(--c-soft) / <alpha-value>)",
        yolk: "rgb(var(--c-yolk) / <alpha-value>)",
        "yolk-ink": "rgb(var(--c-yolk-ink) / <alpha-value>)",
        protein: "rgb(var(--c-protein) / <alpha-value>)",
        carb: "rgb(var(--c-carb) / <alpha-value>)",
        fat: "rgb(var(--c-fat) / <alpha-value>)",
        fiber: "rgb(var(--c-fiber) / <alpha-value>)",
        notice: "rgb(var(--c-notice) / <alpha-value>)",
        "notice-bg": "rgb(var(--c-notice-bg) / <alpha-value>)",
        error: "rgb(var(--c-error) / <alpha-value>)",
        "error-bg": "rgb(var(--c-error-bg) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Figtree", "system-ui", "sans-serif"],
        num: ['"Barlow Semi Condensed"', "Figtree", "system-ui", "sans-serif"],
      },
      borderRadius: { sm: "6px", md: "10px", lg: "16px" },
      spacing: { 18: "4.5rem" },
    },
  },
  plugins: [],
};
