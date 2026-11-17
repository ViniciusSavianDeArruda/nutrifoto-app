import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ItemCard from "./ItemCard.jsx";

const arroz = { name: "Arroz", grams: 150, kcal: 195, protein_g: 3.8, carbs_g: 42, fat_g: 0.4, fiber_g: 0.5, confidence: "alta", edited_by_user: false };

function Harness({ onRemove = () => {}, onItem }) {
  const [item, setItem] = useState(arroz);
  return <ul><ItemCard item={item} index={0} onChange={(n) => { onItem?.(n); setItem(n); }} onRemove={onRemove} /></ul>;
}

describe("ItemCard", () => {
  it("mostra nome, confiança com texto e calorias", () => {
    render(<Harness />);
    expect(screen.getByDisplayValue("Arroz")).toBeInTheDocument();
    expect(screen.getByText("Confiança alta")).toBeInTheDocument();
    expect(screen.getByText("195")).toBeInTheDocument();
  });

  it("digitar a porção recalcula calorias sem acumular erro", () => {
    render(<Harness />);
    const g = screen.getByLabelText("Porção");
    fireEvent.focus(g);
    for (const v of ["2", "20", "200"]) fireEvent.change(g, { target: { value: v } });
    expect(screen.getByText("260")).toBeInTheDocument();
    expect(screen.getByText("editado por você")).toBeInTheDocument();
  });

  it("aceita vírgula decimal", () => {
    render(<Harness />);
    const g = screen.getByLabelText("Porção");
    fireEvent.focus(g);
    fireEvent.change(g, { target: { value: "75,5" } });
    expect(screen.getByText("98")).toBeInTheDocument();
  });

  it("não aceita porção acima do limite da API e avisa", () => {
    const onItem = vi.fn();
    render(<Harness onItem={onItem} />);
    const g = screen.getByLabelText("Porção");
    fireEvent.focus(g);
    fireEvent.change(g, { target: { value: "150000" } });
    expect(onItem).not.toHaveBeenCalled();
    expect(screen.getByText(/Use um valor de 1 a 5000/)).toBeInTheDocument();
  });

  it("botões de +/− mexem 10 g", () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Aumentar 10 gramas"));
    expect(screen.getByLabelText("Porção")).toHaveValue("160");
    fireEvent.click(screen.getByLabelText("Diminuir 10 gramas"));
    fireEvent.click(screen.getByLabelText("Diminuir 10 gramas"));
    expect(screen.getByLabelText("Porção")).toHaveValue("140");
  });

  it("'Ajustar valores' abre campos e edita as calorias à mão", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Ajustar valores"));
    fireEvent.change(screen.getByLabelText("Calorias"), { target: { value: "210" } });
    expect(screen.getByText("210")).toBeInTheDocument();
  });

  it("remover chama o callback", () => {
    const onRemove = vi.fn();
    render(<Harness onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText("Remover Arroz"));
    expect(onRemove).toHaveBeenCalled();
  });
});
