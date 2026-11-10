# Decisões de Arquitetura

Registro das decisões tomadas no projeto, com o raciocínio por trás delas.

## Cloudflare Workers (plano gratuito)

A API roda no Cloudflare Workers Free Tier. Consequências diretas:

- **CPU por requisição:** o plano free tem um limite curto de CPU (10 ms de CPU time). O hash de senha usa PBKDF2 com 100 mil iterações (o máximo permitido). Se login/cadastro derem erro 1102 no deploy real, a saída é o plano pago (US$ 5/mês).
- **Sem estado em memória entre requisições:** o limitador de requisições (`src/limiter.ts`) é em memória por instância do Worker — suficiente para uso pessoal, não é defesa forte contra ataques coordenados.
- **Sem biblioteca de imagem:** o Worker não processa imagens. O celular já reduz a foto (máximo 1024 px) antes de enviar; o servidor só valida tipo e tamanho.

## Supabase (plano gratuito)

- **Postgres via Hyperdrive:** a conexão usa o Session pooler do Supabase na porta 5432 (não Transaction, porta 6543, que não suporta transações).
- **Pausa após 7 dias sem uso:** o banco do plano gratuito pausa automaticamente. O app não tem backup automático — exportação de dados é recurso de primeira classe por isso.
- **Cotas:** 500 MB de banco, 1 GB de arquivos, 5 GB de tráfego/mês. As cotas são compartilhadas por todos os usuários convidados.

## Apenas Gemini como provedor de IA

O suporte ao provedor Anthropic foi removido (ver CHANGELOG 2026-11-09). Razão: reduzir superfície de código sem perda funcional, já que o único provedor em uso era Gemini. O nome do modelo nunca fica no código — vem sempre de `GEMINI_MODEL`.

## PGlite nos testes

Os testes do Worker usam PGlite (Postgres em memória via WASM). PGlite não pega tudo:

- Já ocorreu um bug com parâmetro `Date` dentro de `sql\`coalesce(...)\`` que só quebrava no driver real (postgres.js). Para mudanças em consultas, testar também com `wrangler dev` contra um Postgres real.
- Tests em paralelo podem travar por contention no PGlite. Use `beforeAll` com setup compartilhado por describe block; não chame `setup()` dentro de `it()`.

## Convite e cadastro

Três modos: `open` (qualquer um), `invite` (só com código), `closed` (ninguém). `ALLOW_REGISTRATION=false` sobrepõe tudo. O padrão de produção é `invite` para controlar quem divide as cotas gratuitas.

## Sessões JWT

HS256, 30 dias de expiração. O claim `pwv` armazena o timestamp da última troca de senha em ms; ao validar o token, o Worker rejeita tokens com `pwv` anterior à senha atual. Trocar a senha derruba todas as sessões antigas.

## Fotos

O celular gera a miniatura antes de enviar (o Worker gratuito não tem biblioteca de imagem). Se não enviar miniatura, o Worker usa a foto principal como miniatura (`thumbPath = photoPath`). Dois arquivos por refeição no Supabase Storage: foto original e miniatura.

## Só tema claro

Decisão do dono do projeto. Não há seletor de tema. Não reintroduzir modo escuro sem autorização explícita.

## Resumo do dia: barras de macro, não bandeja

A "bandeja" de três compartimentos foi substituída por barras de progresso individuais por macro (carboidrato, proteína, gordura) mais uma faixa de composição calórica. Decisão do dono; não reverter sem autorização.
