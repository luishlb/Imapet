-- Tabela de despesas da empresa
-- Rodar no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS despesas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT now(),
  data          date NOT NULL,
  descricao     text NOT NULL,
  categoria     text NOT NULL,
  valor         numeric(10,2) NOT NULL,
  comprovante_url text
);

ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON despesas FOR ALL USING (true) WITH CHECK (true);
