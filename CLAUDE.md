# CLAUDE.md

## Este projeto (NutriFoto)

Diário alimentar com foto. Leia `PRODUCT.md` (o que e para quem) e `DESIGN.md` (visual) antes de mexer na interface.

```
apps/worker  API: TypeScript + Hono + Drizzle, Cloudflare Workers.  npm test | npm run typecheck | npm run dev | npm run migrate | npm run invite
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

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
