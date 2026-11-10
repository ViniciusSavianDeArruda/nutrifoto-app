# Deploy: Supabase + Cloudflare (grátis)

Ordem: Supabase (banco e fotos) → Worker (API) → Pages (front) → voltar no Worker para liberar o CORS.

## 1. Supabase

1. Crie um projeto. Guarde a senha do banco.
2. **Storage → New bucket** com o nome `meal-photos`, **privado**.
3. **Connect → Session pooler** (porta **5432**). Não use o modo *Transaction* (6543).
4. **Project Settings → API:** copie a `Project URL` e a chave `service_role` (secreta, só no servidor).
5. Crie as tabelas, do seu computador:
   ```bash
   cd apps/worker
   DATABASE_URL="<session pooler>" npm run migrate
   ```

Limites do plano gratuito: 500 MB de banco, 1 GB de arquivos. O projeto **pausa depois de 7 dias sem uso** (reative no painel) e **não há backup automático** (veja "Backup").

## 2. Cloudflare Worker (API)

```bash
cd apps/worker
npm install
npx wrangler login
npx wrangler hyperdrive create nutrifoto-db --connection-string="<session pooler>"
# copie o "id" que ele imprimir e cole em wrangler.toml, em [[hyperdrive]] id = "..."
npx wrangler secret put JWT_SECRET                 # um texto longo e aleatório
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put RESEND_API_KEY             # e-mails de senha/confirmação
```

Em `wrangler.toml`, ajuste em `[vars]`: `SUPABASE_URL`, `GEMINI_MODEL`, `CORS_ORIGINS` e `APP_URL` (URL do front, passo 3), `PUBLIC_API_URL` (a URL que o Worker receber, `https://nutrifoto-api.<seu-usuario>.workers.dev`), `MAIL_FROM` e `REGISTRATION_MODE`. Depois:

```bash
npx wrangler deploy
```

Teste: `https://nutrifoto-api.<seu-usuario>.workers.dev/health`

O Worker **não dorme**: não há "acordando o servidor".

## 3. Cloudflare Pages (front)

1. **Workers & Pages → Create → Pages → Connect to Git** (repositório com esta pasta).
2. Root directory `apps/web`, build command `npm run build`, output `dist`.
3. Variáveis de ambiente: `VITE_API_URL` = URL do Worker e `VITE_CONTACT_EMAIL` = seu e-mail de contato (aparece nos Termos e na Privacidade). As rotas do app funcionam sozinhas (fallback de SPA).
4. Volte ao `wrangler.toml`, ponha a URL do Pages em `CORS_ORIGINS` e `APP_URL` e rode `npx wrangler deploy` de novo.

## 4. Abrir para outras pessoas

O padrão do `wrangler.toml` é `REGISTRATION_MODE = "invite"`: só cria conta quem tem um código.

**Criar um convite** (do seu computador, com o Session pooler em `DATABASE_URL`):
```bash
cd apps/worker
DATABASE_URL="<session pooler>" npm run invite -- --note "Maria" --uses 1 --days 30
DATABASE_URL="<session pooler>" npm run invite -- --list      # ver usos
```

Ele imprime algo como `NUTRI-7KQ2-MXD4`. Manda esse código para a pessoa; ela digita no cadastro.

- **Seu cadastro:** crie a sua conta primeiro com um convite seu.
- **Modos:** `invite` (só com código), `open` (qualquer pessoa cria conta), `closed` (ninguém). Para mudar, edite `REGISTRATION_MODE` e rode `npx wrangler deploy`. `ALLOW_REGISTRATION = "false"` fecha tudo, acima do modo.
- No celular: abra o endereço e use **Adicionar à tela inicial**.

## E-mails (recuperar senha e confirmar e-mail)

Os e-mails saem pelo **Resend** (plano gratuito: 3.000 e-mails por mês, 100 por dia).

1. Crie conta em resend.com e uma API key; guarde com `npx wrangler secret put RESEND_API_KEY`.
2. **Atenção:** sem domínio verificado, o Resend só entrega ao e-mail do dono da conta Resend (o remetente `onboarding@resend.dev` é só para teste). Para enviar a outras pessoas você precisa de **um domínio seu** (cerca de R$ 40 por ano) verificado no Resend; depois ajuste `MAIL_FROM = "NutriFoto <oi@seudominio.com>"`.
3. Sem `RESEND_API_KEY`, o app **esconde** "Esqueci minha senha" e o aviso de confirmar e-mail (o servidor responde `email_enabled: false`). Quem perder a senha nesse caso só recupera se você trocar o hash direto no banco, então configure o e-mail antes de convidar gente.

## Termos e privacidade

As páginas `/termos` e `/privacidade` vêm com um texto-base em português (LGPD) para um app pessoal. **Revise antes de abrir ao público** (idealmente com um advogado) e defina `VITE_CONTACT_EMAIL`. O cadastro exige marcar que leu e tem 18 anos ou mais.

## Backup

O plano gratuito do Supabase não faz backup. Duas formas de se proteger:

- Pelo app: **Ajustes → Seus dados → CSV/JSON** (não inclui as fotos).
- Banco completo, de tempos em tempos, no seu computador:
  ```bash
  pg_dump "postgresql://postgres.<ref>:<senha>@<host-do-pooler>:5432/postgres" -Fc -f nutrifoto.dump
  ```

## Variáveis de ambiente

Arquivos de exemplo: `.env.example` (docker compose), `apps/worker/.dev.vars.example` (API local), `apps/web/.env.example` (front). Em produção, a API usa `apps/worker/wrangler.toml` (`[vars]`) e `wrangler secret put` (segredos). Se faltar algo obrigatório, a API responde `server_config` com a lista em português.

| Variável | Onde é usada | Obrigatória? | Local (Docker) | Produção |
|---|---|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | docker compose | só no Docker | `.env` da raiz | não existe (Supabase) |
| `DB_PORT`, `WORKER_PORT`, `WEB_PORT`, `WEB_PROD_PORT` | docker compose (portas no host) | não (padrão 5432, 8787, 5173, 8080) | `.env` da raiz | não existe |
| `DATABASE_URL` | scripts `migrate` e `invite` | sim, nos scripts | o compose monta sozinho | Session pooler do Supabase (porta 5432), no shell ao rodar os scripts |
| `HYPERDRIVE` (binding) | conexão do Worker | sim | `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` (o compose define) | `[[hyperdrive]]` em `wrangler.toml` |
| `ENVIRONMENT` | `src/env.ts` | não (padrão `development`) | `development` | `production` |
| `JWT_SECRET` | sessões | **sim em produção** (mín. 16 caracteres) | `.dev.vars` | `wrangler secret put` |
| `CORS_ORIGINS` | CORS | sim em produção | `http://localhost:5173` | URL do Pages |
| `PUBLIC_API_URL` | URLs das fotos | sim em produção | `http://localhost:8787` | URL do Worker |
| `APP_URL` | links dos e-mails | sim em produção | `http://localhost:5173` | URL do Pages |
| `REGISTRATION_MODE` | cadastro: `open`, `invite`, `closed` | não (padrão `open`) | `open` | `invite` |
| `ALLOW_REGISTRATION` | `false` fecha o cadastro | não | `true` | `true` |
| `STORAGE_BACKEND` | `supabase` ou `memory` | não (padrão `memory`) | `memory` | `supabase` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Storage | **sim com `supabase`** | vazias | `[vars]` e `wrangler secret put` |
| `SUPABASE_BUCKET` | Storage | não (padrão `meal-photos`) | `meal-photos` | `meal-photos` |
| `AI_PROVIDER` | `gemini` ou `mock` | não (padrão `gemini`) | `gemini` ou `mock` | `gemini` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | IA | só para usar a análise por foto | `.dev.vars` | `wrangler secret put` / `[vars]` |
| `RESEND_API_KEY` | e-mails reais | não (sem ela, e-mails simulados; em produção o app esconde "esqueci a senha") | vazia | `wrangler secret put` |
| `MAIL_FROM` | remetente | não | padrão | domínio verificado no Resend |
| `APP_TIMEZONE`, `DAILY_AI_LIMIT`, `MAX_UPLOAD_MB`, `STORAGE_QUOTA_MB` | limites | não | padrões | `[vars]` |
| `VITE_API_URL` | front (build) | não em dev | vazia (proxy do Vite) | URL do Worker, no Pages |
| `VITE_CONTACT_EMAIL` | Termos e Privacidade (build) | recomendado | `.env` da raiz (build prod) | Pages |
| `API_PROXY_TARGET` | proxy do dev (`vite.config.js`) | não (padrão `http://127.0.0.1:8787`) | `http://worker:8787` (o compose define) | não existe |
| `CHOKIDAR_USEPOLLING` | hot reload em volume Docker | não | `true` (o compose define) | não existe |
