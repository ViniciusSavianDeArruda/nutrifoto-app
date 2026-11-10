# Changelog

Registro das mudanças relevantes no NutriFoto, em ordem cronológica decrescente.

---

## 2026-11-10

### Infraestrutura
- **Docker:** imagem base do worker trocada de Alpine para `node:22-slim` (glibc). O workerd (runtime do `wrangler dev`) não roda em Alpine/musl sem camada de compatibilidade.
- **Docker:** volume nomeado `worker_wrangler` para o cache do wrangler em `/app/.wrangler`, evitando erros de permissão no Windows/macOS com volumes anônimos.
- **Docker:** variável de ambiente renomeada para `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` (nome exato que o wrangler espera para sobrescrever o binding local).

### Worker
- **Anthropic removido:** suporte ao provedor Anthropic removido. O único provedor real agora é Gemini. Código simplificado em `ai/index.ts`, `env.ts`, `wrangler.toml` e `.dev.vars.example`. Registros históricos com `ai_provider = "anthropic"` continuam legíveis (campo livre no banco).
- **`insertMealRow`:** transação de criação de refeição extraída para `lib.ts` e reutilizada em `meals.ts` (criação e duplicação) e `favorites.ts` (log de favorito).
- **Testes:** testes de integração adicionados para stats (`/day`, `/range`), favorites (CRUD e `/log`), tracking (água e peso) e data (`/usage`, `/export`).

### Front
- **`NavItem`:** componentes `Tab` e `SideLink` em `Layout.jsx` unificados em `NavItem` com prop `variant="tab"|"side"`.
- **Limpeza:** classes `dark:` residuais removidas (tema só claro); importações duplicadas de `nutrition.js` fundidas; `useChartColors` simplificado; `allowRegistration` removido de `Config`.

---

## 2026-11-09

- Projeto Supabase criado.
- Migrações 0001 (esquema base) e 0002 (contas, convites, e-mail) aplicadas.
- Bucket privado `meal-photos` criado no Supabase Storage.
