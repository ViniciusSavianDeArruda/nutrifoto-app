# CLAUDE.md

## Este projeto (NutriFoto)

Diário alimentar com foto. Leia `PRODUCT.md` (o que e para quem) e `DESIGN.md` (visual) antes de mexer na interface.

```
apps/worker  API: TypeScript + Hono + Drizzle, Cloudflare Workers.  npm test | npm run typecheck | npm run dev | npm run migrate | npm run invite | DATABASE_URL=... npm run db:studio
apps/web     React + Vite + Tailwind (PWA, JavaScript).                       npm test | npm run build | npm run dev
```

Docker local (raiz): `npm run docker:up | docker:down | docker:reset | docker:logs | docker:invite`. Variáveis: `.env` (compose), `apps/worker/.dev.vars`, `apps/web/.env` (todos fora do Git; modelos `*.example`).

Regras do projeto:
- Textos da interface em português do Brasil, sem culpa nem julgamento sobre comida. Passar da meta nunca é erro vermelho.
- Só tema claro. Não reintroduzir modo escuro nem a bandeja do resumo do dia sem o dono pedir.
- O contrato da API (`{detail:{code,message}}`, códigos de erro, `tz` em minutos a leste do UTC, datas `YYYY-MM-DD`) é compartilhado pelo front e pelo Worker. Mudou o contrato? Atualize o front e os testes dos dois lados.
- Mudou o esquema do banco? Crie um arquivo novo em `apps/worker/migrations/` (nunca edite os antigos) e atualize `src/schema.ts`.
- O modelo de IA nunca fica no código: vem de `GEMINI_MODEL`.
- Segredos só em `wrangler secret` e `.dev.vars` (fora do Git). Nunca registrar senhas, tokens ou links de e-mail em logs de produção.
- Testes do Worker usam PGlite (Postgres em memória). Ele não pega tudo: já passou um bug de parâmetro `Date` dentro de `sql\`coalesce(...)\`` que só quebrava no driver real (postgres.js). Para mexer em consultas, rode também `wrangler dev` contra um Postgres de verdade.
- Plano gratuito do Workers: nada pesado de CPU por requisição (o hash de senha já é o limite).

---

## Diretrizes de comportamento

Surfaça dúvidas antes de implementar; peça confirmação quando houver mais de uma interpretação. Escreva o mínimo de código que resolve o problema — sem abstrações especulativas, sem features não pedidas. Toque só o que a tarefa exige; não melhore código adjacente. Para tarefas de múltiplos passos, estabeleça critérios verificáveis antes de começar e confirme cada passo.

Diretrizes completas: `.claude/skills/karpathy-guidelines`
