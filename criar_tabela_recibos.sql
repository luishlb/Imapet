-- Tabela de recibos avulsos emitidos
-- O número é auto-incremento, garantindo sequência única e sem furos

CREATE TABLE IF NOT EXISTS recibos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT GENERATED ALWAYS AS IDENTITY,
  nome_pagador TEXT NOT NULL,
  documento TEXT,
  tipo_documento TEXT,                       -- 'CPF' | 'CNPJ'
  valor NUMERIC(12,2) NOT NULL,
  referente TEXT NOT NULL,
  data_recibo DATE NOT NULL,
  origem TEXT,                                -- 'admin' | 'owner'
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS recibos_numero_idx ON recibos (numero);
CREATE INDEX IF NOT EXISTS recibos_data_idx ON recibos (data_recibo DESC);
CREATE INDEX IF NOT EXISTS recibos_nome_idx ON recibos (nome_pagador);

ALTER TABLE recibos DISABLE ROW LEVEL SECURITY;
