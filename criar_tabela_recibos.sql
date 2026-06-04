-- Tabela de recibos avulsos emitidos
-- numero: sequencial global (auditoria interna, único)
-- numero_no_mes: sequencial dentro do mês de data_recibo (1, 2, 3... reseta a cada mês)
-- O display ao usuário é "MM/NNNN/AAAA" usando numero_no_mes

CREATE TABLE IF NOT EXISTS recibos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT GENERATED ALWAYS AS IDENTITY,
  numero_no_mes INT,                          -- sequencial dentro do mês
  nome_pagador TEXT NOT NULL,
  documento TEXT,
  tipo_documento TEXT,                        -- 'CPF' | 'CNPJ'
  valor NUMERIC(12,2) NOT NULL,
  referente TEXT NOT NULL,
  data_recibo DATE NOT NULL,
  origem TEXT,                                -- 'admin' | 'owner'
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Caso a tabela já exista de uma versão anterior, adiciona a coluna que faltava
ALTER TABLE recibos ADD COLUMN IF NOT EXISTS numero_no_mes INT;

CREATE UNIQUE INDEX IF NOT EXISTS recibos_numero_idx ON recibos (numero);
CREATE INDEX IF NOT EXISTS recibos_data_idx ON recibos (data_recibo DESC);
CREATE INDEX IF NOT EXISTS recibos_nome_idx ON recibos (nome_pagador);

ALTER TABLE recibos DISABLE ROW LEVEL SECURITY;
