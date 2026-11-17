import { Notice } from "./ui.jsx";

/** Traduz erros da API em mensagens claras, com o caminho alternativo quando existe. */
export default function ErrorNotice({ error, children }) {
  if (!error) return null;
  const tone = ["ai_quota", "daily_limit", "network", "ai_unavailable"].includes(error.code) ? "warn" : "error";
  const title =
    {
      ai_quota: "A IA atingiu o limite por agora",
      daily_limit: "Limite diário de análises atingido",
      network: "Sem conexão",
      ai_unavailable: "A IA está indisponível",
      ai_invalid: "Não consegui ler a resposta da IA",
      ai_config: "A IA não está configurada",
      bad_image: "Essa imagem não serve",
    }[error.code] || "Algo deu errado";
  return (
    <Notice tone={tone} title={title} action={children}>
      {error.message}
    </Notice>
  );
}
