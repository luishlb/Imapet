-- Tabela de notas fiscais emitidas via Portal Nacional NFS-e
-- Cada linha representa uma DPS enviada (pode ter sucesso, falha ou estar pendente)

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vínculos opcionais
  exame_id UUID REFERENCES exames(id) ON DELETE SET NULL,

  -- Identificação fiscal
  numero_dps TEXT,            -- Número do DPS (interno, sequencial)
  numero_nfse TEXT,            -- Número oficial da NFS-e (vem do portal nacional)
  codigo_verificacao TEXT,     -- Código de verificação da NFS-e
  ambiente TEXT NOT NULL,      -- 'homologacao' | 'producao'

  -- Status
  status TEXT NOT NULL DEFAULT 'rascunho',  -- 'rascunho' | 'enviada' | 'autorizada' | 'rejeitada' | 'cancelada'
  erro TEXT,                                 -- mensagem de erro se rejeitada

  -- Tomador (cliente do serviço)
  tomador_nome TEXT NOT NULL,
  tomador_documento TEXT,                    -- CPF ou CNPJ
  tomador_tipo_doc TEXT,                     -- 'CPF' | 'CNPJ'
  tomador_email TEXT,
  tomador_endereco JSONB,                    -- { logradouro, numero, bairro, cidade, uf, cep }

  -- Serviço
  descricao TEXT NOT NULL,
  valor_servico NUMERIC(12,2) NOT NULL,
  valor_iss NUMERIC(12,2),
  aliquota_iss NUMERIC(5,4),

  -- Arquivos
  dps_xml TEXT,                              -- XML da DPS enviada
  nfse_xml TEXT,                             -- XML da NFS-e retornada
  nfse_pdf_url TEXT,                         -- URL do DANFSe (PDF) no R2

  -- Timestamps
  emitida_em TIMESTAMPTZ,
  cancelada_em TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notas_fiscais_exame_id_idx ON notas_fiscais (exame_id);
CREATE INDEX IF NOT EXISTS notas_fiscais_status_idx ON notas_fiscais (status);
CREATE INDEX IF NOT EXISTS notas_fiscais_criado_em_idx ON notas_fiscais (criado_em DESC);
CREATE INDEX IF NOT EXISTS notas_fiscais_numero_nfse_idx ON notas_fiscais (numero_nfse);

ALTER TABLE notas_fiscais DISABLE ROW LEVEL SECURITY;
