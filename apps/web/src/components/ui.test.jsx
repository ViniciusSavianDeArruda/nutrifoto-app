import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog, NumberField, Segmented } from "./ui.jsx";

describe("Dialog", () => {
  it("não rouba o foco do campo a cada tecla (re-render com onClose novo)", async () => {
    function Host() {
      const [name, setName] = useState("");
      return (
        <Dialog title="Favorito" onClose={() => {}}>
          <label htmlFor="n">Nome</label>
          <input id="n" value={name} onChange={(e) => setName(e.target.value)} />
        </Dialog>
      );
    }
    render(<Host />);
    const input = screen.getByLabelText("Nome");
    input.focus();
    await userEvent.type(input, "Prato de sempre");
    expect(input).toHaveValue("Prato de sempre");
    expect(input).toHaveFocus();
  });

  it("fecha com Esc", () => {
    const onClose = vi.fn();
    render(<Dialog title="X" onClose={onClose}><p>oi</p></Dialog>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("NumberField", () => {
  it("só confirma valores dentro do intervalo", () => {
    const onValue = vi.fn();
    render(<NumberField id="x" label="Peso" min={20} max={500} value={70} onValue={onValue} />);
    const f = screen.getByLabelText("Peso");
    fireEvent.change(f, { target: { value: "5" } });
    fireEvent.change(f, { target: { value: "700" } });
    expect(onValue).not.toHaveBeenCalled();
    fireEvent.change(f, { target: { value: "72,4" } });
    expect(onValue).toHaveBeenLastCalledWith(72.4);
  });
  it("campo vazio não vira zero e volta ao último valor ao sair", () => {
    const onValue = vi.fn();
    render(<NumberField id="x" label="Peso" value={70} onValue={onValue} />);
    const f = screen.getByLabelText("Peso");
    fireEvent.change(f, { target: { value: "" } });
    expect(onValue).not.toHaveBeenCalled();
    fireEvent.blur(f);
    expect(f).toHaveValue("70");
  });
});

describe("Segmented", () => {
  it("expõe o estado como radio e usa o nome completo quando há rótulo curto", () => {
    const onChange = vi.fn();
    render(<Segmented label="Tipo" value="a" onChange={onChange} options={[{ id: "a", label: "Café da manhã", short: "Café" }, { id: "b", label: "Jantar" }]} />);
    expect(screen.getByRole("radio", { name: "Café da manhã" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Jantar" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
