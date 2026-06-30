-- Migração: adiciona preferência de retenção de ISS por tomador.
-- O modal de emissão de NFS-e passa a oferecer um checkbox "ISS retido na fonte"
-- e herda o valor padrão deste campo ao selecionar um tomador cadastrado.
-- Rodar uma vez no banco já existente.

ALTER TABLE tomadores_nf
  ADD COLUMN IF NOT EXISTS iss_retido BOOLEAN NOT NULL DEFAULT FALSE;
