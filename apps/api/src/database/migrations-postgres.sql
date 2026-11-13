-- Adaptador PostgreSQL opcional. Aplicar antes de usar a versão 1.6.0 nesse banco.
ALTER TABLE analise ADD COLUMN IF NOT EXISTS contexto TEXT;
ALTER TABLE analise ADD COLUMN IF NOT EXISTS excluida_em TEXT;
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,analise_id INTEGER NOT NULL UNIQUE REFERENCES analise(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  util BOOLEAN NOT NULL,comentario TEXT NOT NULL DEFAULT '',data_criacao TIMESTAMPTZ NOT NULL,data_atualizacao TIMESTAMPTZ NOT NULL);
