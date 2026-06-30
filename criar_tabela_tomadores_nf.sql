-- Cadastro de tomadores recorrentes pra emissão de NFS-e
-- Salva automaticamente a cada nota emitida (upsert pelo documento)
-- Modal de emissão usa essa tabela pra autocompletar

CREATE TABLE IF NOT EXISTS tomadores_nf (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_doc      TEXT NOT NULL CHECK (tipo_doc IN ('CPF', 'CNPJ')),
  documento     TEXT NOT NULL,
  nome          TEXT NOT NULL,
  email         TEXT,
  logradouro    TEXT,
  numero        TEXT,
  complemento   TEXT,
  bairro        TEXT,
  cidade        TEXT,
  uf            TEXT,
  cep           TEXT,
  cod_municipio TEXT,
  iss_retido    BOOLEAN NOT NULL DEFAULT FALSE,
  ultima_emissao_em TIMESTAMPTZ DEFAULT NOW(),
  emissoes      INTEGER NOT NULL DEFAULT 1,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (documento)
);

CREATE INDEX IF NOT EXISTS idx_tomadores_nf_ultima ON tomadores_nf(ultima_emissao_em DESC);
CREATE INDEX IF NOT EXISTS idx_tomadores_nf_nome ON tomadores_nf(nome);

ALTER TABLE tomadores_nf DISABLE ROW LEVEL SECURITY;
