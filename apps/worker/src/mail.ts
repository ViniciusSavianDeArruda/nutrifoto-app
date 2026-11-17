import type { Config } from "./env";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}
export interface Mailer {
  /** false = sem serviço de e-mail configurado (o app esconde recuperar senha e confirmar e-mail). */
  enabled: boolean;
  send(mail: Mail): Promise<void>;
}

/** Envia pelo Resend (API REST, funciona no Workers). */
export class ResendMailer implements Mailer {
  enabled = true;
  constructor(private cfg: Config, private doFetch: typeof fetch = fetch) {}
  async send(mail: Mail) {
    const r = await this.doFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.cfg.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.cfg.mailFrom, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
    });
    if (!r.ok) throw new Error(`Resend respondeu ${r.status}`);
  }
}

/** Desenvolvimento e testes: guarda as mensagens em memória e escreve no log. */
export class ConsoleMailer implements Mailer {
  enabled: boolean;
  sent: Mail[] = [];
  constructor(enabled = true) {
    this.enabled = enabled;
  }
  async send(mail: Mail) {
    this.sent.push(mail);
    console.log(`[e-mail simulado] para ${mail.to}: ${mail.subject}\n${mail.text}`);
  }
}

export function buildMailer(cfg: Config): Mailer {
  // Em desenvolvimento, sem chave, o e-mail é simulado (aparece no log do `wrangler dev`).
  if (cfg.resendApiKey) return new ResendMailer(cfg);
  return new ConsoleMailer(cfg.environment !== "production");
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function layout(title: string, intro: string, button: string, link: string, outro: string): Pick<Mail, "html" | "text"> {
  return {
    text: `${title}\n\n${intro}\n\n${link}\n\n${outro}\n\nNutriFoto`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#14261c">
<h1 style="font-size:20px">${esc(title)}</h1><p>${esc(intro)}</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#16533c;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${esc(button)}</a></p>
<p style="font-size:13px;color:#4a6052">Se o botão não abrir, copie este endereço no navegador:<br>${esc(link)}</p>
<p style="font-size:13px;color:#4a6052">${esc(outro)}</p></div>`,
  };
}

export const resetMail = (to: string, link: string): Mail => ({
  to,
  subject: "Redefinir sua senha no NutriFoto",
  ...layout("Redefinir senha", "Recebemos um pedido para criar uma nova senha. O link vale por 1 hora e só pode ser usado uma vez.", "Criar nova senha", link, "Se não foi você, ignore este e-mail: sua senha continua a mesma."),
});

export const verifyMail = (to: string, link: string): Mail => ({
  to,
  subject: "Confirme seu e-mail no NutriFoto",
  ...layout("Confirme seu e-mail", "Falta só confirmar que este e-mail é seu. O link vale por 48 horas.", "Confirmar e-mail", link, "Se você não criou uma conta no NutriFoto, ignore esta mensagem."),
});
