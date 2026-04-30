-- Importação manual: ABRIL 2026 (16/04 a 25/04)
-- Dados que ela executou antes do app começar a ser usado regularmente.
-- Nomes de clínicas, formas de pagamento e tipos seguem a padronização canônica
-- (ver normalizar_clinicas.sql, normalizar_pagamentos.sql, normalizar_tipos.sql)
-- valor (empresa) = valor_bruto * 0.58
-- "Pendente" = pagamento ainda não recebido (será atualizado quando entrar)

-- ─── 1. Garante que 'Pendente' está disponível como forma de pagamento ────────
INSERT INTO formas_pagamento (nome)
SELECT 'Pendente'
WHERE NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Pendente');

-- ─── 2. Lançamentos de abril/2026 ─────────────────────────────────────────────
INSERT INTO exames (data_exame, tipo, clinica, forma_pagamento, valor_bruto, valor, pet_id, nome_paciente) VALUES
  -- 16/04
  ('2026-04-16', 'USG abdominal',   'Animania',           'Pendente', 140.00,  81.20, NULL, 'Suzi (Fel SRD)'),
  ('2026-04-16', 'USG abdominal',   'Caninos e Felinos',  'PIX',      180.00, 104.40, NULL, 'Estrela (Fel SRD)'),
  ('2026-04-16', 'USG abdominal',   'Cia do Animal',      'Pettop',   120.00,  69.60, NULL, 'Alceu (Pug)'),
  -- 17/04
  ('2026-04-17', 'USG abdominal',   'Cia do Animal',      'Pettop',   120.00,  69.60, NULL, 'Nick (Pinscher)'),
  -- 18/04
  ('2026-04-18', 'USG abdominal',   'CGT Paula',          'PIX',      140.00,  81.20, NULL, 'Kong (Fel SRD)'),
  ('2026-04-18', 'USG abdominal',   'Bicho Feliz',        'Pendente', 150.00,  87.00, NULL, 'Apollo (Dasch)'),
  ('2026-04-18', 'USG abdominal',   'Brasilia Petshop',   'Pendente', 120.00,  69.60, NULL, 'Juju (Fel SRD)'),
  -- 20/04
  ('2026-04-20', 'USG abdominal',   'Clindermavet',       'PIX',      180.00, 104.40, NULL, 'Mel (Shihtzu)'),
  ('2026-04-20', 'USG abdominal',   'Caninos e Felinos',  'PIX',      180.00, 104.40, NULL, 'Pipo (Shihtzu)'),
  ('2026-04-20', 'USG abdominal',   'Caninos e Felinos',  'PIX',      180.00, 104.40, NULL, 'Dori (Fel SRD)'),
  ('2026-04-20', 'USG abdominal',   'Caninos e Felinos',  'Crédito',  200.00, 116.00, NULL, 'Tanooki (Fel SRD)'),
  ('2026-04-20', 'USG abdominal',   'Caninos e Felinos',  'Pendente', 180.00, 104.40, NULL, 'Bebel (Fel SRD)'),
  -- 22/04
  ('2026-04-22', 'Abdominocentese', 'Brasilia Petshop',   'Pendente',  50.00,  29.00, NULL, 'Isabella (Can SRD)'),
  ('2026-04-22', 'USG abdominal',   'Caninos e Felinos',  'PIX',      200.00, 116.00, NULL, 'Coca (Can SRD)'),
  ('2026-04-22', 'USG abdominal',   'CGT Paula',          'PIX',      140.00,  81.20, NULL, 'Corujinha (Fel SRD)'),
  ('2026-04-22', 'USG abdominal',   'CGT Paula',          'PIX',      140.00,  81.20, NULL, 'Mila (Fel SRD)'),
  ('2026-04-22', 'USG abdominal',   'CGT Paula',          'PIX',      140.00,  81.20, NULL, 'Tina (Fel SRD)'),
  -- 23/04
  ('2026-04-23', 'USG abdominal',   'CGT Paula',          'PIX',      140.00,  81.20, NULL, 'Amora (Fel SRD)'),
  ('2026-04-23', 'USG abdominal',   'CGT Paula',          'PIX',      140.00,  81.20, NULL, 'Galega (Fel SRD)'),
  ('2026-04-23', 'USG abdominal',   'CGT Paula',          'PIX',      140.00,  81.20, NULL, 'Kiko (Fel SRD)'),
  ('2026-04-23', 'USG abdominal',   'Cia do Animal',      'Pendente', 120.00,  69.60, NULL, 'Pingo (Maltês)'),
  -- 24/04
  ('2026-04-24', 'USG abdominal',   'Animania',           'Pendente', 140.00,  81.20, NULL, 'Luna (Fel SRD)'),
  -- 25/04
  ('2026-04-25', 'USG abdominal',   'Caninos e Felinos',  'PIX',      180.00, 104.40, NULL, 'Pipo (Shihtzu)');
