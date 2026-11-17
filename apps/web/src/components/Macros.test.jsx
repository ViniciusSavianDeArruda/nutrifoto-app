import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Macros from "./Macros.jsx";

const goals = { protein_g: 100, carbs_g: 250, fat_g: 70 };

describe("Macros", () => {
  it("descreve cada macro para leitores de tela", () => {
    render(<Macros totals={{ protein_g: 48, carbs_g: 72, fat_g: 5, fiber_g: 3 }} goals={goals} />);
    expect(screen.getByRole("progressbar", { name: "Proteína" })).toHaveAttribute("aria-valuetext", "48 de 100 gramas");
  });
  it("passar da meta mostra '+', nunca um alarme", () => {
    const { container } = render(<Macros totals={{ protein_g: 130, carbs_g: 10, fat_g: 10, fiber_g: 0 }} goals={goals} />);
    expect(container.textContent).toContain("130 +");
    expect(container.querySelector(".bg-error")).toBeNull();
  });
  it("com meta zerada e dia vazio não quebra", () => {
    expect(() => render(<Macros totals={{ protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }} goals={{ protein_g: 0, carbs_g: 0, fat_g: 0 }} />)).not.toThrow();
  });
  it("mostra a composição das calorias em porcentagem", () => {
    const { container } = render(<Macros totals={{ protein_g: 25, carbs_g: 25, fat_g: 0, fiber_g: 0 }} goals={goals} />);
    expect(container.textContent).toContain("50%");
  });
});
