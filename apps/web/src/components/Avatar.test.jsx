import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Avatar from "./Avatar.jsx";

describe("Avatar", () => {
  it("mostra a foto quando existe", () => {
    const { container } = render(<Avatar user={{ avatar_url: "http://x/y.jpg", name: "Vinicius" }} />);
    expect(container.querySelector("img")).toHaveAttribute("src", "http://x/y.jpg");
  });
  it("sem foto, mostra a inicial do nome (ou do e-mail)", () => {
    const { container, rerender } = render(<Avatar user={{ name: "vinicius", email: "a@x.com" }} />);
    expect(container.textContent).toBe("V");
    rerender(<Avatar user={{ name: null, email: "maria@x.com" }} />);
    expect(container.textContent).toBe("M");
  });
});
