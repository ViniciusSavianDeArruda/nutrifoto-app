import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const login = vi.fn();
const register = vi.fn();
const authConfig = vi.fn();
vi.mock("../hooks/useAuth.jsx", () => ({ useAuth: () => ({ login, register }) }));
vi.mock("../lib/api.js", () => ({ api: { authConfig: () => authConfig() } }));
import Login from "./Login.jsx";

const renderLogin = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><Login /></MemoryRouter>
    </QueryClientProvider>,
  );
const fill = (email = "x@y.com", senha = "senha-forte-1") => {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: senha } });
};

beforeEach(() => {
  login.mockReset(); register.mockReset(); authConfig.mockReset();
  authConfig.mockResolvedValue({ registration: "open", email_enabled: true });
});

describe("Login", () => {
  it("valida e-mail e senha antes de chamar a API", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Digite seu e-mail.")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    fill("x@y.com", "123");
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText(/pelo menos 8 caracteres/)).toBeInTheDocument();
  });

  it("entra com dados válidos", async () => {
    login.mockResolvedValue({});
    renderLogin();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: "x@y.com", password: "senha-forte-1" }));
  });

  it("oferece 'Esqueci minha senha' quando o e-mail está ativo", async () => {
    renderLogin();
    expect(await screen.findByText("Esqueci minha senha")).toHaveAttribute("href", "/esqueci-senha");
  });

  it("não oferece recuperar senha quando o servidor não envia e-mail", async () => {
    authConfig.mockResolvedValue({ registration: "open", email_enabled: false });
    renderLogin();
    await waitFor(() => expect(authConfig).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("Esqueci minha senha")).toBeNull();
  });

  it("cadastro exige aceitar os termos", async () => {
    renderLogin();
    fireEvent.click(screen.getByText("Ainda não tenho conta"));
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("Aceite os termos para criar a conta.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("cadastro com termos aceitos envia accept_terms", async () => {
    register.mockResolvedValue({});
    renderLogin();
    fireEvent.click(screen.getByText("Ainda não tenho conta"));
    fill();
    fireEvent.click(screen.getByLabelText(/Li e aceito/));
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(register).toHaveBeenCalledWith(expect.objectContaining({ email: "x@y.com", accept_terms: true, invite_code: null })));
  });

  it("no modo convite pede o código", async () => {
    authConfig.mockResolvedValue({ registration: "invite", email_enabled: true });
    renderLogin();
    fireEvent.click(screen.getByText("Ainda não tenho conta"));
    await screen.findByLabelText("Código de convite");
    fill();
    fireEvent.click(screen.getByLabelText(/Li e aceito/));
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("Digite o código de convite.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Código de convite"), { target: { value: "NUTRI-ABCD-EFGH" } });
    register.mockResolvedValue({});
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() => expect(register).toHaveBeenCalledWith(expect.objectContaining({ invite_code: "NUTRI-ABCD-EFGH" })));
  });

  it("com cadastro fechado esconde 'Ainda não tenho conta'", async () => {
    authConfig.mockResolvedValue({ registration: "closed", email_enabled: true });
    renderLogin();
    expect(await screen.findByText(/cadastros estão fechados/)).toBeInTheDocument();
    expect(screen.queryByText("Ainda não tenho conta")).toBeNull();
  });

  it("mostra a mensagem do servidor quando o cadastro falha", async () => {
    register.mockRejectedValue({ code: "invite_invalid", status: 403, message: "Convite inválido." });
    renderLogin();
    fireEvent.click(screen.getByText("Ainda não tenho conta"));
    fill();
    fireEvent.click(screen.getByLabelText(/Li e aceito/));
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("Convite inválido.")).toBeInTheDocument();
  });
});
