-- Esquema inicial do NutriFoto.
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  daily_kcal_goal INTEGER NOT NULL DEFAULT 2000,
  protein_goal_g INTEGER NOT NULL DEFAULT 100,
  carbs_goal_g INTEGER NOT NULL DEFAULT 250,
  fat_goal_g INTEGER NOT NULL DEFAULT 70,
  water_goal_ml INTEGER NOT NULL DEFAULT 2000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE ai_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_ai_usage_user_day UNIQUE (user_id, day)
);
CREATE INDEX ix_ai_usage_user_id ON ai_usage (user_id);

CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  meal_type VARCHAR(20),
  items_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_favorites_user_id ON favorites (user_id);

CREATE TABLE meals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  eaten_at TIMESTAMPTZ NOT NULL,
  meal_type VARCHAR(20) NOT NULL,
  notes VARCHAR(500),
  photo_path VARCHAR(255),
  thumb_path VARCHAR(255),
  photo_bytes INTEGER NOT NULL DEFAULT 0,
  ai_status VARCHAR(20) NOT NULL DEFAULT 'manual',
  ai_provider VARCHAR(30),
  total_kcal DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_protein_g DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_carbs_g DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_fat_g DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_fiber_g DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_meals_eaten_at ON meals (eaten_at);
CREATE INDEX ix_meals_user_id ON meals (user_id);

CREATE TABLE meal_items (
  id SERIAL PRIMARY KEY,
  meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  name VARCHAR(120) NOT NULL,
  grams DOUBLE PRECISION NOT NULL,
  kcal DOUBLE PRECISION NOT NULL,
  protein_g DOUBLE PRECISION NOT NULL DEFAULT 0,
  carbs_g DOUBLE PRECISION NOT NULL DEFAULT 0,
  fat_g DOUBLE PRECISION NOT NULL DEFAULT 0,
  fiber_g DOUBLE PRECISION NOT NULL DEFAULT 0,
  confidence VARCHAR(10) NOT NULL DEFAULT 'media',
  edited_by_user BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX ix_meal_items_meal_id ON meal_items (meal_id);

CREATE TABLE water_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL,
  ml INTEGER NOT NULL
);
CREATE INDEX ix_water_logs_logged_at ON water_logs (logged_at);
CREATE INDEX ix_water_logs_user_id ON water_logs (user_id);

CREATE TABLE weight_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  kg DOUBLE PRECISION NOT NULL,
  CONSTRAINT uq_weight_user_day UNIQUE (user_id, day)
);
CREATE INDEX ix_weight_logs_user_id ON weight_logs (user_id);
