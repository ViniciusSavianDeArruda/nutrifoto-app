# Contrato da API NutriFoto

Base URL: `https://nutrifoto-api.<seu-usuario>.workers.dev` (produção) · `http://localhost:8787` (dev)

## Convenções globais

**Autenticação:** `Authorization: Bearer <access_token>` em todas as rotas marcadas com 🔒.

**Fuso horário:** o parâmetro `tz` é um inteiro de minutos a leste do UTC. Exemplos: UTC-3 → `-180`; UTC+0 → `0`; UTC+5:30 → `330`. Padrão: `0`.

**Datas:** strings `YYYY-MM-DD`. Datetimes: ISO 8601 (`2026-11-10T14:30:00.000Z`).

**Erros:** todos os erros seguem o formato:
```json
{ "detail": { "code": "string", "message": "string" } }
```
Erros de validação adicionam:
```json
{ "detail": { "code": "validation", "message": "...", "errors": [{ "loc": [...], "msg": "string" }] } }
```

**Códigos de erro comuns:**
| Código | Status | Significado |
|---|---|---|
| `not_found` | 404 | Recurso não existe ou não pertence ao usuário |
| `validation` | 422 | Dados inválidos (ver `errors`) |
| `rate_limited` | 429 | Muitas tentativas |
| `server_error` | 500 | Erro interno |
| `server_config` | 500 | Variável de ambiente ausente ou inválida |

---

## Saúde

### `GET /health` · `GET /api/health`

Sem autenticação. Retorna `{ "status": "ok" }` (200).

---

## Autenticação · `/api/auth`

### `GET /api/auth/config`

Dados públicos que a tela de cadastro precisa antes do login.

**Resposta 200:**
```json
{
  "registration": "open | invite | closed",
  "email_enabled": true
}
```

---

### `POST /api/auth/register`

Cria conta. Rate limit: 10 req/60 s por IP.

**Body JSON:**
```json
{
  "email": "string (email, máx 255)",
  "password": "string (mín 8, máx 128)",
  "name": "string (máx 100) | null",
  "accept_terms": true,
  "invite_code": "string (máx 40) | null"
}
```

`invite_code` é obrigatório quando `registration = "invite"`.

**Resposta 201:**
```json
{ "access_token": "string", "token_type": "bearer" }
```

**Erros específicos:**
| Código | Status |
|---|---|
| `registration_closed` | 403 |
| `invite_required` | 403 |
| `invite_invalid` | 403 |
| `email_taken` | 409 |

---

### `POST /api/auth/login`

Rate limit: 10 req/60 s por IP.

**Body JSON:**
```json
{ "email": "string", "password": "string (máx 128)" }
```

**Resposta 200:**
```json
{ "access_token": "string", "token_type": "bearer" }
```

**Erros:** `bad_credentials` 401.

---

### `POST /api/auth/forgot-password`

Envia e-mail de recuperação. A resposta é sempre a mesma, exista a conta ou não. Rate limit: 5 req/600 s por IP; 3 req/3600 s por e-mail.

**Body JSON:** `{ "email": "string" }`

**Resposta 200:** `{ "ok": true }`

**Erros:** `mail_disabled` 503 (e-mail não configurado no servidor).

---

### `POST /api/auth/reset-password`

Redefine a senha usando o token do e-mail. Rate limit: 10 req/600 s por IP.

**Body JSON:**
```json
{ "token": "string (mín 10, máx 200)", "password": "string (mín 8, máx 128)" }
```

**Resposta 200:** `{ "ok": true }`

**Erros:** `invalid_token` 400 (expirado, já usado ou inválido).

---

### `POST /api/auth/verify-email`

Confirma e-mail usando o token do link. Rate limit: 10 req/600 s por IP.

**Body JSON:** `{ "token": "string (mín 10, máx 200)" }`

**Resposta 200:** `{ "ok": true }`

**Erros:** `invalid_token` 400.

---

### `POST /api/auth/verify-email/send` 🔒

Reenvia o e-mail de confirmação. Rate limit: 3 req/600 s por usuário.

**Body:** vazio.

**Resposta 200:** `{ "ok": true }`

**Erros:** `mail_disabled` 503; `mail_error` 502.

---

### `GET /api/auth/me` 🔒

Perfil do usuário autenticado.

**Resposta 200:**
```json
{
  "id": 1,
  "email": "string",
  "name": "string | null",
  "daily_kcal_goal": 2000,
  "protein_goal_g": 150,
  "carbs_goal_g": 200,
  "fat_goal_g": 60,
  "water_goal_ml": 2000,
  "email_verified": true,
  "avatar_url": "string | null",
  "mail_enabled": true
}
```

---

### `PATCH /api/auth/me` 🔒

Atualiza perfil. Todos os campos são opcionais (null = não muda).

**Body JSON:**
```json
{
  "name": "string (máx 100) | null",
  "daily_kcal_goal": "int (800–10000) | null",
  "protein_goal_g": "int (0–1000) | null",
  "carbs_goal_g": "int (0–2000) | null",
  "fat_goal_g": "int (0–1000) | null",
  "water_goal_ml": "int (0–20000) | null"
}
```

**Resposta 200:** mesmo formato de `GET /api/auth/me`.

---

### `POST /api/auth/me/avatar` 🔒

Envia foto de perfil. `multipart/form-data`, campo `file` (JPEG, PNG ou WebP, máx 1 MB).

**Resposta 200:** mesmo formato de `GET /api/auth/me`.

**Erros:** `empty_file` 400; `bad_image` 400; `file_too_large` 413; `storage_error` 502.

---

### `DELETE /api/auth/me/avatar` 🔒

Remove foto de perfil.

**Resposta 200:** mesmo formato de `GET /api/auth/me`.

---

### `DELETE /api/auth/me` 🔒

Apaga a conta permanentemente. Remove todas as fotos do armazenamento.

**Body JSON:** `{ "password": "string" }`

**Resposta 204:** sem corpo.

**Erros:** `bad_credentials` 403.

---

## Refeições · `/api/meals` 🔒

Todas as rotas exigem autenticação.

### Tipos válidos de refeição (`meal_type`)
`cafe_da_manha` · `almoco` · `lanche` · `jantar` · `outro`

### Status de IA (`ai_status`)
`analyzed` · `skipped` · `failed` · `manual` · `text` · `favorite`

### Objeto Item
```json
{
  "id": 1,
  "name": "string",
  "grams": 150.0,
  "kcal": 250.0,
  "protein_g": 20.0,
  "carbs_g": 30.0,
  "fat_g": 8.0,
  "fiber_g": 2.0,
  "confidence": "alta | media | baixa",
  "edited_by_user": false
}
```

### Objeto Refeição (completo)
```json
{
  "id": 1,
  "eaten_at": "2026-11-10T14:30:00.000Z",
  "meal_type": "almoco",
  "notes": "string | null",
  "ai_status": "analyzed",
  "ai_provider": "gemini | null",
  "photo_url": "string | null",
  "thumb_url": "string | null",
  "totals": { "kcal": 500.0, "protein_g": 40.0, "carbs_g": 60.0, "fat_g": 15.0, "fiber_g": 5.0 },
  "items": [/* Item[] */]
}
```

### Objeto Resumo (lista)
```json
{
  "id": 1,
  "eaten_at": "2026-11-10T14:30:00.000Z",
  "meal_type": "almoco",
  "thumb_url": "string | null",
  "ai_status": "analyzed",
  "totals": { "kcal": 500.0, "protein_g": 40.0, "carbs_g": 60.0, "fat_g": 15.0, "fiber_g": 5.0 },
  "item_names": ["Arroz", "Feijão"]
}
```

---

### `POST /api/meals/analyze`

Analisa foto **sem salvar**. Rate limit: 8 req/60 s por usuário.

`multipart/form-data`, campo `file` (JPEG, PNG ou WebP).

**Resposta 200:**
```json
{
  "items": [/* Item[] sem id */],
  "notes": "string | null",
  "totals": { "kcal": ..., "protein_g": ..., "carbs_g": ..., "fat_g": ..., "fiber_g": ... },
  "provider": "gemini",
  "ai_used_today": 3,
  "ai_limit": 20
}
```

**Erros:** `daily_limit` 429; `empty_file` 400; `bad_image` 400; `file_too_large` 413.

---

### `POST /api/meals/analyze-text`

Estima refeição descrita em texto, ou corrige lista existente. Rate limit: 8 req/60 s por usuário.

**Body JSON:**
```json
{
  "text": "string (mín 2, máx 500)",
  "current_items": [/* Item[] */] | null
}
```

**Resposta 200:** mesmo formato de `/analyze`.

**Erros:** `daily_limit` 429.

---

### `POST /api/meals`

Cria refeição. `multipart/form-data`.

Campos:
- `payload` (obrigatório): JSON string com:
  ```json
  {
    "meal_type": "almoco",
    "eaten_at": "ISO 8601 | null",
    "notes": "string (máx 500) | null",
    "items": [/* Item[] sem id, máx 40 */],
    "ai_status": "manual",
    "ai_provider": "string (máx 30) | null"
  }
  ```
- `photo` (opcional): arquivo de imagem (JPEG/PNG/WebP, máx `MAX_UPLOAD_MB` MB)
- `thumb` (opcional): miniatura gerada pelo cliente

**Resposta 201:** Objeto Refeição completo.

**Erros:** `invalid_payload` 422; `storage_error` 502.

---

### `GET /api/meals`

Lista refeições com filtros.

**Query params:**
| Param | Tipo | Padrão | Descrição |
|---|---|---|---|
| `tz` | int | 0 | Fuso em minutos |
| `date_from` | YYYY-MM-DD | — | Data inicial (inclusive) |
| `date_to` | YYYY-MM-DD | — | Data final (inclusive) |
| `type` | meal_type | — | Filtrar por tipo |
| `q` | string | — | Busca em notas e nomes de itens |
| `limit` | int | 50 | Máx 200 |
| `offset` | int | 0 | Para paginação |

**Resposta 200:** array de Resumo, ordenado por `eaten_at` decrescente.

---

### `GET /api/meals/:id`

**Resposta 200:** Objeto Refeição completo.

---

### `PUT /api/meals/:id`

Atualiza refeição. Todos os campos são opcionais.

**Body JSON:**
```json
{
  "eaten_at": "ISO 8601 | null",
  "meal_type": "meal_type | null",
  "notes": "string (máx 500) | null",
  "items": [/* Item[] sem id, máx 40 */] | null
}
```

**Resposta 200:** Objeto Refeição completo atualizado.

---

### `DELETE /api/meals/:id`

Remove refeição e suas fotos.

**Resposta 204:** sem corpo.

---

### `POST /api/meals/:id/duplicate`

Copia refeição (sem foto), com porção opcionalmente escalada.

**Body JSON (opcional):**
```json
{
  "eaten_at": "ISO 8601 | null",
  "scale": "float (0 < scale ≤ 10, padrão 1)"
}
```

**Resposta 201:** Objeto Refeição completo.

---

## Favoritos · `/api/favorites` 🔒

### Objeto Favorito
```json
{
  "id": 1,
  "name": "Marmita usual",
  "meal_type": "almoco | null",
  "items": [/* Item[] sem id */],
  "totals": { "kcal": ..., "protein_g": ..., "carbs_g": ..., "fat_g": ..., "fiber_g": ... }
}
```

---

### `GET /api/favorites`

**Resposta 200:** array de Favorito, ordenado por `created_at` decrescente.

---

### `POST /api/favorites`

Cria favorito a partir de itens explícitos ou de uma refeição existente.

**Body JSON:**
```json
{
  "name": "string (mín 1, máx 100)",
  "meal_type": "meal_type | null",
  "items": [/* Item[] sem id, mín 1, máx 40 */] | null,
  "from_meal_id": "int | null"
}
```

Forneça `items` **ou** `from_meal_id`. Se `from_meal_id` for fornecido, `items` da refeição são copiados.

**Resposta 201:** Objeto Favorito.

**Erros:** `no_items` 422 (nenhum item no favorito); `not_found` 404 (refeição não encontrada).

---

### `DELETE /api/favorites/:id`

**Resposta 204:** sem corpo.

---

### `POST /api/favorites/:id/log`

Registra o favorito como refeição em um toque.

**Body JSON (opcional):**
```json
{
  "eaten_at": "ISO 8601 | null",
  "meal_type": "meal_type | null",
  "scale": "float (0 < scale ≤ 10, padrão 1)"
}
```

**Resposta 201:** Objeto Refeição completo.

---

## Estatísticas · `/api/stats` 🔒

### `GET /api/stats/day`

Resumo de um dia: totais, metas e água.

**Query params:**
| Param | Tipo | Padrão | Descrição |
|---|---|---|---|
| `tz` | int | 0 | Fuso em minutos |
| `day` | YYYY-MM-DD | hoje no fuso | Dia desejado |

**Resposta 200:**
```json
{
  "day": "2026-11-10",
  "totals": { "kcal": 1500.0, "protein_g": 100.0, "carbs_g": 180.0, "fat_g": 50.0, "fiber_g": 20.0 },
  "goals": { "kcal": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 60, "water_ml": 2000 },
  "meals_count": 3,
  "water_ml": 1500
}
```

---

### `GET /api/stats/range`

Série diária, médias, divisão de macros, horários, sequência e resumo em texto.

**Query params:**
| Param | Tipo | Padrão | Descrição |
|---|---|---|---|
| `tz` | int | 0 | Fuso em minutos |
| `days` | int (1–90) | 7 | Número de dias |
| `end` | YYYY-MM-DD | hoje no fuso | Último dia (inclusive) |

**Resposta 200:**
```json
{
  "days": 7,
  "daily": [
    { "date": "2026-11-04", "kcal": 1800.0, "protein_g": 120.0, "carbs_g": 200.0, "fat_g": 55.0, "fiber_g": 18.0, "meals": 3 }
  ],
  "goals": { "kcal": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 60, "water_ml": 2000 },
  "averages": { "kcal": 1750.0, "protein_g": 115.0, "carbs_g": 195.0, "fat_g": 52.0, "fiber_g": 17.0 },
  "logged_days": 5,
  "macro_split": { "protein_pct": 26.0, "carbs_pct": 44.0, "fat_pct": 30.0 },
  "hours": [
    { "hour": 8, "meals": 5, "kcal": 450.0 }
  ],
  "streak_days": 3,
  "summary": "Nos últimos 7 dias você registrou refeições em 5 dias. ..."
}
```

**Erros:** `invalid_days` 422 (fora de 1–90).

---

## Água · `/api/water` 🔒

### `GET /api/water`

Registros de água do dia.

**Query params:** `tz` (int, padrão 0); `day` (YYYY-MM-DD, padrão hoje).

**Resposta 200:**
```json
{
  "total_ml": 1500,
  "goal_ml": 2000,
  "entries": [
    { "id": 1, "logged_at": "2026-11-10T08:00:00.000Z", "ml": 300 }
  ]
}
```

---

### `POST /api/water`

Registra água.

**Body JSON:**
```json
{ "ml": "int (1–5000)", "logged_at": "ISO 8601 | null" }
```

**Resposta 201:** `{ "id": 1, "logged_at": "...", "ml": 300 }`

---

### `DELETE /api/water/:id`

**Resposta 204:** sem corpo.

---

## Peso · `/api/weight` 🔒

### `GET /api/weight`

Histórico de peso.

**Query params:** `tz` (int, padrão 0); `days` (int 1–730, padrão 90).

**Resposta 200:** array de `{ "day": "YYYY-MM-DD", "kg": 75.5 }`, ordenado por data.

---

### `PUT /api/weight`

Registra ou atualiza peso de um dia (upsert por `userId + day`).

**Body JSON:**
```json
{ "day": "YYYY-MM-DD", "kg": "float (20 < kg < 500)" }
```

**Resposta 200:** `{ "day": "YYYY-MM-DD", "kg": 75.5 }`

---

### `DELETE /api/weight/:day`

Remove peso do dia.

**Resposta 204:** sem corpo.

**Erros:** `not_found` 404.

---

## Dados do usuário · `/api` 🔒

### `GET /api/usage`

Uso atual de IA e armazenamento.

**Resposta 200:**
```json
{
  "ai_used_today": 3,
  "ai_limit": 20,
  "photo_bytes_used": 10485760,
  "photo_bytes_limit": 1073741824,
  "meals_count": 42,
  "ai_provider": "gemini"
}
```

---

### `GET /api/export`

Exporta todos os dados da conta.

**Query params:** `format` → `json` (padrão) ou `csv`.

**Resposta 200 (JSON):** `Content-Type: application/json`, `Content-Disposition: attachment; filename="nutrifoto.json"`. Inclui perfil, refeições, itens, favoritos, água e peso. As fotos **não** são incluídas.

**Resposta 200 (CSV):** `Content-Type: text/csv; charset=utf-8` com BOM. Uma linha por item de refeição. Colunas: `data_hora_utc, tipo, alimento, gramas, kcal, proteina_g, carboidrato_g, gordura_g, fibra_g, confianca, notas`.

**Erros:** `bad_format` 400.

---

### `GET /api/files/:token`

Serve arquivos do armazenamento em memória (desenvolvimento). Token assinado de curta duração gerado pelo Worker ao criar URLs de fotos. Não disponível quando `STORAGE_BACKEND=supabase` (as URLs são geradas diretamente no Supabase).

**Resposta 200:** arquivo com `Content-Type` correto e `Cache-Control: private, max-age=3000`.
