# NutriFoto

Diário alimentar para o celular: você fotografa a refeição, a IA **sugere** alimentos, gramas, calorias e macros, e **você confere e ajusta** antes de salvar. Não é app de academia: é para guardar o que você come, ver o histórico e entender seus dias. Pensado para uso pessoal e para **convidar outras pessoas**.

- **Front:** React + Vite + Tailwind, PWA instalável (`apps/web`)
- **API:** TypeScript + Hono + Drizzle, roda no **Cloudflare Workers** (`apps/worker`)
- **Banco/fotos em produção:** Supabase (Postgres + Storage)
- **IA:** Gemini (padrão) ou Anthropic, escolhida por variável de ambiente

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

Detalhes que valem saber:

- A foto é reduzida no aparelho antes de enviar e o celular gera também uma miniatura (o Worker gratuito não tem biblioteca de imagem) e o servidor guarda as duas.
- Se a IA falhar ou atingir o limite, dá para **salvar a foto sem análise**, preencher à mão ou descrever em texto. Nada se perde.
- Passar da meta nunca vira alarme vermelho: a bandeja só fica cheia e ganha um “+”.
- Limite de análises por dia (padrão 20) protege a cota gratuita da IA.

## Rodar com Docker (um comando)

Precisa do Docker com Compose v2. Sobe Postgres, migrações, API e front, tudo local, sem Supabase.

```bash
cp .env.example .env                              # senha do Postgres local e portas
cp apps/worker/.dev.vars.example apps/worker/.dev.vars   # variáveis da API (já vem pronto para dev)
# gere os segredos: troque JWT_SECRET (openssl rand -hex 32) e POSTGRES_PASSWORD (openssl rand -hex 16)
npm run docker:up                                 # = docker compose up --build -V
```

Depois: front em http://localhost:5173, API em http://localhost:8787/health. Com `ENVIRONMENT=development` os e-mails (recuperar senha, confirmar e-mail) **não são enviados**: aparecem no log do worker (`npm run docker:logs`). As fotos ficam na memória do worker (`STORAGE_BACKEND=memory`) e somem ao reiniciá-lo.

| Comando | O que faz |
|---|---|
| `npm run docker:up` | constrói e sobe tudo (`-V` renova o `node_modules` dos containers a cada subida) |
| `npm run docker:down` | para e remove os containers, **mantém** o banco |
| `npm run docker:reset` | para tudo e **apaga o volume do banco** |
| `npm run docker:logs` | acompanha os logs |
| `npm run docker:invite -- --note "Maria" --uses 1 --days 30` | cria convite (`--list` lista); equivale a `docker compose exec worker npm run invite -- ...` |

O código de `apps/worker` e `apps/web` é montado nos containers, então editar os arquivos recarrega sozinho (com polling ligado, por causa do Docker no Windows/macOS). Mudou `package.json`? Rode `npm run docker:up` de novo. Mudou `.dev.vars`? `docker compose restart worker`.

Front de produção (nginx servindo o `dist`, com fallback de SPA e proxy de `/api`): `docker compose --profile prod up --build web-prod`, em http://localhost:8080.

Para usar a IA de verdade, preencha `GEMINI_API_KEY` **e** `GEMINI_MODEL` em `apps/worker/.dev.vars` e reinicie o worker. Sem isso o app funciona, mas só salva refeição sem análise ou por texto.

Os containers usam Alpine; o workerd (runtime do `wrangler dev`) é feito para glibc e roda ali pela camada `gcompat`. Se o worker não subir no seu Docker, troque a imagem base de `apps/worker/Dockerfile` por `node:22-slim` e remova a linha do `apk`.

## Rodar no seu computador (sem Docker)

Precisa de Node 20+ e de um Postgres (pode ser o do Supabase, mesmo para testar).

```bash
# 1) API (Worker)
cd apps/worker
npm install
cp .dev.vars.example .dev.vars              # AI_PROVIDER=mock e STORAGE_BACKEND=memory funcionam sem chaves
# em .dev.vars: ENVIRONMENT=development, STORAGE_BACKEND=memory, CORS_ORIGINS=http://localhost:5173,
#               PUBLIC_API_URL=http://localhost:8787, APP_URL=http://localhost:5173, REGISTRATION_MODE=open
export DATABASE_URL="postgresql://usuario:senha@localhost:5432/nutrifoto"   # banco local ou Session pooler
npm run migrate                              # cria as tabelas (e-mails simulados aparecem no terminal)
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="$DATABASE_URL"
npm run dev                                  # http://localhost:8787

# 2) Front (outro terminal)
cd apps/web
npm install
VITE_API_URL=http://localhost:8787 npm run dev   # http://localhost:5173
```

Testes: `cd apps/worker && npm test` (33, com Postgres em memória) e `cd apps/web && npm test` (49).

Para usar a IA de verdade, nos segredos do Worker (`.dev.vars` ao rodar local):

```
AI_PROVIDER=gemini
GEMINI_API_KEY=sua-chave
GEMINI_MODEL=nome-do-modelo
```

O nome do modelo **nunca está no código**: você define em `GEMINI_MODEL`. Se usar a mesma chave/projeto e o mesmo modelo de outro projeto seu, as duas aplicações **dividem a mesma cota** (o limite é por projeto do Google Cloud e por modelo). Para separar, crie outro projeto no Google AI Studio ou use outro modelo.

## Colocar no ar (grátis): Supabase + Cloudflare

Ordem: Supabase (banco e fotos) → Worker (API) → Pages (front) → voltar no Worker para liberar o CORS.

### 1. Supabase

1. Crie um projeto. Guarde a senha do banco.
2. **Storage → New bucket** com o nome `meal-photos`, **privado**.
3. **Connect → Session pooler** (porta **5432**). Não use o modo *Transaction* (6543).
4. **Project Settings → API:** copie a `Project URL` e a chave `service_role` (secreta, só no servidor).
5. Crie as tabelas, do seu computador: `cd apps/worker && DATABASE_URL="<session pooler>" npm run migrate`

Limites do plano gratuito: 500 MB de banco, 1 GB de arquivos. O projeto **pausa depois de 7 dias sem uso** (reative no painel) e **não há backup automático** (veja “Backup”).

### 2. Cloudflare Worker (API)

```bash
cd apps/worker
npm install
npx wrangler login
npx wrangler hyperdrive create nutrifoto-db --connection-string="<session pooler>"
#   copie o "id" que ele imprimir e cole em wrangler.toml, em [[hyperdrive]] id = "..."
npx wrangler secret put JWT_SECRET                 # um texto longo e aleatório
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put RESEND_API_KEY             # e-mails de senha/confirmação (veja "E-mails" abaixo)
```

Em `wrangler.toml`, ajuste em `[vars]`: `SUPABASE_URL`, `GEMINI_MODEL`, `CORS_ORIGINS` e `APP_URL` (URL do front, passo 3), `PUBLIC_API_URL` (a URL que o Worker receber, `https://nutrifoto-api.<seu-usuario>.workers.dev`), `MAIL_FROM` e `REGISTRATION_MODE`. Depois: `npx wrangler deploy`. Teste `https://nutrifoto-api.<seu-usuario>.workers.dev/health`.

O Worker **não dorme**: não há “acordando o servidor”.

### 3. Cloudflare Pages (front)

1. **Workers & Pages → Create → Pages → Connect to Git** (repositório com esta pasta).
2. Root directory `apps/web`, build command `npm run build`, output `dist`.
3. Variáveis de ambiente: `VITE_API_URL` = URL do Worker e `VITE_CONTACT_EMAIL` = seu e-mail de contato (aparece nos Termos e na Privacidade). As rotas do app funcionam sozinhas (fallback de SPA).
4. Volte ao `wrangler.toml`, ponha a URL do Pages em `CORS_ORIGINS` e `APP_URL` e rode `npx wrangler deploy` de novo.

### 4. Abrir para outras pessoas

O padrão do `wrangler.toml` é `REGISTRATION_MODE = "invite"`: só cria conta quem tem um código.

- **Criar um convite** (do seu computador, com o Session pooler em `DATABASE_URL`):
  ```bash
  cd apps/worker
  DATABASE_URL="<session pooler>" npm run invite -- --note "Maria" --uses 1 --days 30
  DATABASE_URL="<session pooler>" npm run invite -- --list      # ver usos
  ```
  Ele imprime algo como `NUTRI-7KQ2-MXD4`. Manda esse código para a pessoa; ela digita no cadastro.
- **Seu cadastro:** crie a sua conta primeiro com um convite seu.
- **Modos:** `invite` (só com código), `open` (qualquer pessoa cria conta), `closed` (ninguém). Para mudar, edite `REGISTRATION_MODE` e rode `npx wrangler deploy`. `ALLOW_REGISTRATION = "false"` fecha tudo, acima do modo.
- No celular: abra o endereço e use **Adicionar à tela inicial**.

### E-mails (recuperar senha e confirmar e-mail)

Os e-mails saem pelo **Resend** (plano gratuito: 3.000 e-mails por mês, 100 por dia).

1. Crie conta em resend.com e uma API key; guarde com `npx wrangler secret put RESEND_API_KEY`.
2. **Atenção:** sem domínio verificado, o Resend só entrega ao e-mail do dono da conta Resend (o remetente `onboarding@resend.dev` é só para teste). Para enviar a outras pessoas você precisa de **um domínio seu** (cerca de R$ 40 por ano) verificado no Resend; depois ajuste `MAIL_FROM = "NutriFoto <oi@seudominio.com>"`.
3. Sem `RESEND_API_KEY`, o app **esconde** "Esqueci minha senha" e o aviso de confirmar e-mail (o servidor responde `email_enabled: false`). Quem perder a senha nesse caso só recupera se você trocar o hash direto no banco, então configure o e-mail antes de convidar gente.

### Termos e privacidade

As páginas `/termos` e `/privacidade` vêm com um texto-base em português (LGPD) para um app pessoal. **Revise antes de abrir ao público** (idealmente com um advogado) e defina `VITE_CONTACT_EMAIL`. O cadastro exige marcar que leu e tem 18 anos ou mais.

## Backup

O plano gratuito do Supabase não faz backup. Duas formas de se proteger:

- Pelo app: **Ajustes → Seus dados → CSV/JSON** (não inclui as fotos).
- Banco completo, de tempos em tempos, no seu computador:
  ```bash
  pg_dump "postgresql://postgres.<ref>:<senha>@<host-do-pooler>:5432/postgres" -Fc -f nutrifoto.dump
  ```

## Variáveis de ambiente

Arquivos de exemplo (copie, sem segredos reais): `.env.example` (docker compose), `apps/worker/.dev.vars.example` (API local), `apps/web/.env.example` (front). Em produção, a API usa `apps/worker/wrangler.toml` (`[vars]`) e `wrangler secret put` (segredos). Se faltar algo obrigatório, a API responde `server_config` com a lista em português e os scripts `migrate`/`invite` avisam qual variável falta.

| Variável | Onde é usada | Obrigatória? | Local (Docker) | Produção |
|---|---|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | docker compose (container `db`) | só no Docker | `.env` da raiz | não existe (Supabase) |
| `DB_PORT`, `WORKER_PORT`, `WEB_PORT`, `WEB_PROD_PORT` | docker compose (portas no host) | não (padrão 5432, 8787, 5173, 8080) | `.env` da raiz | não existe |
| `DATABASE_URL` | scripts `migrate` e `invite` | sim, nos scripts | o compose monta sozinho | Session pooler do Supabase (porta 5432), no shell ao rodar os scripts |
| `HYPERDRIVE` (binding) | `src/index.ts` (conexão do Worker) | sim | `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` (o compose define) | `[[hyperdrive]]` em `wrangler.toml` |
| `ENVIRONMENT` | `src/env.ts` | não (padrão `development`) | `development` (e-mails no log) | `production` |
| `JWT_SECRET` | `src/env.ts`, sessões | **sim em produção** (mín. 16 caracteres) | `.dev.vars` (`openssl rand -hex 32`) | `wrangler secret put` |
| `CORS_ORIGINS` | CORS | sim em produção | `http://localhost:5173` | URL do Pages |
| `PUBLIC_API_URL` | URLs das fotos | sim em produção | `http://localhost:8787` | URL do Worker |
| `APP_URL` | links dos e-mails | sim em produção | `http://localhost:5173` | URL do Pages |
| `REGISTRATION_MODE` | cadastro: `open`, `invite`, `closed` | não (padrão `open`; valor inválido dá erro) | `open` | `invite` |
| `ALLOW_REGISTRATION` | `false` fecha o cadastro | não | `true` | `true` |
| `STORAGE_BACKEND` | `supabase` ou `memory` | não (padrão `memory`) | `memory` | `supabase` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Storage | **sim com `supabase`** | vazias | `[vars]` e `wrangler secret put` |
| `SUPABASE_BUCKET` | Storage | não (padrão `meal-photos`) | `meal-photos` | `meal-photos` |
| `AI_PROVIDER` | `gemini` ou `mock` | não (padrão `gemini`) | `gemini` ou `mock` | `gemini` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | IA | só para usar a análise por foto | **você preenche** | `wrangler secret put` / `[vars]` |
| `RESEND_API_KEY` | e-mails reais | não (sem ela, e-mails simulados fora de produção; em produção o app esconde "esqueci a senha") | vazia | `wrangler secret put` |
| `MAIL_FROM` | remetente | não | padrão | domínio verificado no Resend |
| `APP_TIMEZONE`, `DAILY_AI_LIMIT`, `MAX_UPLOAD_MB`, `STORAGE_QUOTA_MB` | limites (número inválido dá erro) | não | padrões | `[vars]` |
| `VITE_API_URL` | front (`src/lib/api.js`, build) | não em dev | vazia (proxy do Vite) | URL do Worker, no Pages |
| `VITE_CONTACT_EMAIL` | front (Termos e Privacidade, build) | recomendado ao abrir para outras pessoas | `.env` da raiz (build prod) | Pages |
| `API_PROXY_TARGET` | `vite.config.js` (proxy do dev) | não (padrão `http://127.0.0.1:8787`) | `http://worker:8787` (o compose define) | não existe |
| `CHOKIDAR_USEPOLLING` | hot reload em volume Docker | não | `true` (o compose define) | não existe |

## Estrutura

```
apps/worker  Hono: routes/ (auth, meals, stats…), ai/, storage.ts, mail.ts, accounts.ts, schema.ts (Drizzle), migrations/ (0001 base, 0002 contas), scripts/ (migrate, invite), test/
apps/web     React: pages/, components/, hooks/, lib/
PRODUCT.md / DESIGN.md   produto e sistema visual (fonte de verdade para mexer na interface)
CLAUDE.md                regras de trabalho para o Claude Code neste repositório
```

## Limites conhecidos

- As calorias são **estimativas**; o app avisa isso na tela de revisão.
- O rascunho de uma refeição vive só na memória: se recarregar a página na revisão, ele se perde.
- O limitador de requisições é em memória por instância do Worker: serve para uso pessoal, não é defesa forte.
- **Plano gratuito do Cloudflare:** o login faz hash de senha com PBKDF2 em 100 mil iterações (o máximo que o Workers permite) e o plano free tem limite curto de CPU por requisição (10 ms). Se o login ou o cadastro derem erro 1102/“exceeded CPU”, a saída é o plano pago do Workers (US$ 5/mês). Isso só dá para confirmar no deploy.
- Hyperdrive no plano free tem limite diário de consultas, suficiente para uso pessoal e para um grupo pequeno.
- **Muitas pessoas dividem as mesmas cotas gratuitas:** Gemini (a sua chave), 500 MB de banco e 1 GB de fotos no Supabase, e-mails do Resend. O limite de análises por dia vale por pessoa (`DAILY_AI_LIMIT`), mas a soma pode esgotar a cota da sua chave. Convide aos poucos.
- O e-mail só chega a outras pessoas com domínio verificado no Resend (veja "E-mails").
- Não há painel de administrador: convites se criam pelo `npm run invite`, e remover um usuário ou ver o uso geral é direto no Supabase.
- Sessões duram 30 dias. Trocar a senha pelo link do e-mail encerra as sessões antigas.
- Os Termos e a Privacidade são um texto-base, não aconselhamento jurídico.
- A calculadora de meta é estimativa e só para maiores de 18 anos; o app não substitui nutricionista.

## O que foi verificado

- **Worker (TypeScript):** typecheck limpo; 33 testes automáticos (contas, login, convites com limite de uso e validade, termos, recuperar senha com uso único e invalidação de sessões, confirmar e-mail, foto de perfil, análise com IA simulada, limite diário, cota do provedor, fotos com miniatura, isolamento entre usuários, estatísticas por fuso, favoritos, água, peso, exportação, CORS). Rodou no **workerd local (`wrangler dev`) com PostgreSQL 16 via Hyperdrive**, o que pegou um bug que o Postgres em memória dos testes não mostrava (parâmetro de data dentro de uma expressão SQL), já corrigido.
- **Front:** 49 testes + fluxos completos num Chrome de verdade em tela de celular contra o Worker local: cadastro com convite errado e certo, aceite dos termos, aviso e link de confirmar e-mail, foto de perfil, esqueci a senha → redefinir → entrar com a senha nova, páginas de termos e privacidade, calculadora de meta, foto → análise → edição → salvar, sem erros no console. Alvos de toque de 44 px e rótulos de campos conferidos.
- **Não testado (precisa das suas contas/chaves):** Supabase real e Storage, Cloudflare real (deploy, Hyperdrive, limite de CPU do plano free), Gemini/Anthropic reais, **envio real de e-mail pelo Resend** (nos testes e no Chrome o e-mail é simulado e lido do log), instalação do PWA no celular, e a revisão jurídica dos termos.
