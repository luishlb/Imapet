-- Tabela de arquivos oficiais da empresa
-- Cartão CNPJ, contrato social, alvarás, certidões, etc.
-- Os arquivos ficam no Cloudflare R2 — aqui guarda só metadados + URL

CREATE TABLE IF NOT EXISTS arquivos_oficiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,                          -- nome amigável ("Cartão CNPJ", "Contrato Social 2024")
  categoria TEXT,                              -- 'Documentação' | 'Tributário' | 'Contratos' | 'Certidões' | 'Comprovantes' | 'Outros'
  descricao TEXT,                              -- observações (validade, observações, etc)
  arquivo_url TEXT NOT NULL,                   -- URL pública do R2
  arquivo_nome_original TEXT,                  -- nome do arquivo original (ex: cnpj_imapet.pdf)
  tamanho_bytes BIGINT,
  tipo_mime TEXT,
  validade DATE,                               -- opcional, pra documentos com validade (certidões, alvarás)
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS arquivos_oficiais_categoria_idx ON arquivos_oficiais (categoria);
CREATE INDEX IF NOT EXISTS arquivos_oficiais_criado_em_idx ON arquivos_oficiais (criado_em DESC);
CREATE INDEX IF NOT EXISTS arquivos_oficiais_validade_idx ON arquivos_oficiais (validade) WHERE validade IS NOT NULL;

ALTER TABLE arquivos_oficiais DISABLE ROW LEVEL SECURITY;
