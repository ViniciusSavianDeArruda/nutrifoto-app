# NutriFoto

Diário alimentar para o celular: você fotografa a refeição, a IA **sugere** alimentos, gramas, calorias e macros, e **você confere e ajusta** antes de salvar. Não é app de academia: é para guardar o que você come, ver o histórico e entender seus dias. Pensado para uso pessoal e para **convidar outras pessoas**.

- **Front:** React + Vite + Tailwind, PWA instalável (`apps/web`)
- **API:** TypeScript + Hono + Drizzle, roda no **Cloudflare Workers** (`apps/worker`)
- **Banco/fotos em produção:** Supabase (Postgres + Storage)
- **IA:** Gemini, escolhida por variável de ambiente

## O que já funciona

| Fase | Recursos |
|---|---|
| 1 | Conta (e-mail e senha), foto → análise → cartões editáveis → salvar, tela **Hoje**, histórico com busca e filtros, meta diária, `/health`, exportar CSV/JSON, Ajustes com uso da IA e espaço das fotos |
| 2 | Gráficos (calorias por dia com a meta, divisão de macros, horários das refeições), favoritos de um toque, registro e correção por texto |
| 3 | Água, peso, metas de macros, sequência de dias, resumo da semana em texto |
| 4 | **Descobrir minha meta** (calculadora de calorias/macros para ganhar, manter ou perder peso) |
| 5 | **Para mais pessoas:** cadastro por convite, termos de uso e privacidade, recuperar senha e confirmar e-mail por link, foto de perfil |

O app tem só o tema claro.

**Fora desta entrega** (decisão registrada em `PRODUCT.md`): leitura de código de barras e lembretes por notificação push.

## Rodar com Docker (um comando)

Precisa do Docker com Compose v2. Sobe Postgres, migrações, API e front, tudo local, sem Supabase.

```bash
cp .env.example .env                              # senha do Postgres local e portas
cp apps/worker/.dev.vars.example apps/worker/.dev.vars   # variáveis da API (já vem pronto para dev)
# gere os segredos: troque JWT_SECRET (openssl rand -hex 32) e POSTGRES_PASSWORD (openssl rand -hex 16)
npm run docker:up                                 # = docker compose up --build -V
```

Depois: front em http://localhost:5173, API em http://localhost:8787/health. Com `ENVIRONMENT=development` os e-mails **não são enviados**: aparecem no log do worker (`npm run docker:logs`). As fotos ficam na memória do worker (`STORAGE_BACKEND=memory`) e somem ao reiniciá-lo.

| Comando | O que faz |
|---|---|
| `npm run docker:up` | constrói e sobe tudo (`-V` renova o `node_modules` dos containers a cada subida) |
| `npm run docker:down` | para e remove os containers, **mantém** o banco |
| `npm run docker:reset` | para tudo e **apaga o volume do banco** |
| `npm run docker:logs` | acompanha os logs |
| `npm run docker:invite -- --note "Maria" --uses 1 --days 30` | cria convite (`--list` lista) |

O código de `apps/worker` e `apps/web` é montado nos containers, então editar os arquivos recarrega sozinho (com polling ligado, por causa do Docker no Windows/macOS). Mudou `package.json`? Rode `npm run docker:up` de novo. Mudou `.dev.vars`? `docker compose restart worker`.

Front de produção (nginx servindo o `dist`, com fallback de SPA e proxy de `/api`): `docker compose --profile prod up --build web-prod`, em http://localhost:8080.

Para usar a IA de verdade, preencha `GEMINI_API_KEY` **e** `GEMINI_MODEL` em `apps/worker/.dev.vars` e reinicie o worker.

## Rodar no seu computador (sem Docker)

Precisa de Node 20+ e de um Postgres (pode ser o do Supabase, mesmo para testar).

```bash
# 1) API (Worker)
cd apps/worker
npm install
cp .dev.vars.example .dev.vars              # AI_PROVIDER=mock e STORAGE_BACKEND=memory funcionam sem chaves
export DATABASE_URL="postgresql://usuario:senha@localhost:5432/nutrifoto"
npm run migrate
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="$DATABASE_URL"
npm run dev                                  # http://localhost:8787

# 2) Front (outro terminal)
cd apps/web
npm install
VITE_API_URL=http://localhost:8787 npm run dev   # http://localhost:5173
```

Testes: `cd apps/worker && npm test` e `cd apps/web && npm test`.

Drizzle Studio (inspecionar o banco no navegador):
```bash
cd apps/worker
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nutrifoto" npm run db:studio
# abre em https://local.drizzle.studio
```

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `PRODUCT.md` | Produto: usuários, objetivos, princípios, escopo (raiz — exigência da Impeccable) |
| `DESIGN.md` | Sistema visual: cores, tipografia, componentes (raiz — exigência da Impeccable) |
| `docs/api-contract.md` | Todos os endpoints da API |
| `docs/deploy.md` | Deploy no Supabase + Cloudflare; variáveis de ambiente; backup |
| `docs/decisions.md` | Decisões de arquitetura com raciocínio |
| `CHANGELOG.md` | Histórico de mudanças |
| `CLAUDE.md` | Regras de trabalho para o Claude Code |

## Estrutura

```
apps/worker  Hono: routes/ (auth, meals, stats…), ai/, storage.ts, mail.ts, accounts.ts, schema.ts (Drizzle), migrations/ (0001 base, 0002 contas), scripts/ (migrate, invite), test/
apps/web     React: pages/, components/, hooks/, lib/
docs/        Documentação do projeto
CLAUDE.md    Regras de trabalho para o Claude Code
```

## Limites conhecidos

- As calorias são **estimativas**; o app avisa isso na tela de revisão.
- O rascunho de uma refeição vive só na memória: se recarregar a página na revisão, ele se perde.
- O limitador de requisições é em memória por instância do Worker: serve para uso pessoal, não é defesa forte.
- **Plano gratuito do Cloudflare:** o login faz hash de senha com PBKDF2 em 100 mil iterações (o máximo que o Workers permite). Se login ou cadastro derem erro 1102/"exceeded CPU", a saída é o plano pago do Workers (US$ 5/mês).
- Hyperdrive no plano free tem limite diário de consultas, suficiente para uso pessoal e para um grupo pequeno.
- **Muitas pessoas dividem as mesmas cotas gratuitas:** Gemini (a sua chave), 500 MB de banco e 1 GB de fotos no Supabase, e-mails do Resend. Convide aos poucos.
- Não há painel de administrador: convites se criam pelo `npm run invite`.
- Sessões duram 30 dias. Trocar a senha pelo link do e-mail encerra as sessões antigas.
- Os Termos e a Privacidade são um texto-base, não aconselhamento jurídico.
- A calculadora de meta é estimativa e só para maiores de 18 anos; o app não substitui nutricionista.
