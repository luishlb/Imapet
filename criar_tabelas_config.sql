-- Tabelas de configuração: serviços e formas de pagamento
-- Rodar no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS servicos (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE
);

INSERT INTO servicos (nome) VALUES
  ('USG abdominal'),
  ('USG geral / Ultrassonografia'),
  ('USG encefálica'),
  ('USG de face'),
  ('USG de cabeça'),
  ('Cistocentese'),
  ('Abdominocentese'),
  ('Eletrocardiograma'),
  ('Drenagem'),
  ('Outro')
ON CONFLICT (nome) DO NOTHING;

CREATE TABLE IF NOT EXISTS formas_pagamento (
  id serial PRIMARY KEY,
  nome text NOT NULL UNIQUE
);

INSERT INTO formas_pagamento (nome) VALUES
  ('PIX'),
  ('Pettop'),
  ('Espécie'),
  ('Crédito'),
  ('Petcare'),
  ('Eupet'),
  ('Petlove'),
  ('Débito'),
  ('Outro')
ON CONFLICT (nome) DO NOTHING;

-- Liberar acesso público de leitura (mesma política das outras tabelas)
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública servicos" ON servicos FOR SELECT USING (true);
CREATE POLICY "Inserção pública servicos" ON servicos FOR INSERT WITH CHECK (true);

CREATE POLICY "Leitura pública formas_pagamento" ON formas_pagamento FOR SELECT USING (true);
CREATE POLICY "Inserção pública formas_pagamento" ON formas_pagamento FOR INSERT WITH CHECK (true);
