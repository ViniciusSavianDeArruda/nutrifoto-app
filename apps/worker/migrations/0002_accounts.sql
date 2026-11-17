-- Contas para mais pessoas: e-mail confirmado, foto de perfil, aceite dos termos, convites e tokens de e-mail.
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN avatar_path VARCHAR(255);
ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ;

CREATE TABLE auth_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL,            -- 'reset' (recuperar senha) ou 'verify' (confirmar e-mail)
  token_hash VARCHAR(64) NOT NULL,      -- SHA-256 do token; o token em si só existe no e-mail
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ix_auth_tokens_hash ON auth_tokens (token_hash);
CREATE INDEX ix_auth_tokens_user ON auth_tokens (user_id, kind);

CREATE TABLE invites (
  id SERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  note VARCHAR(100),
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ix_invites_code ON invites (code);
