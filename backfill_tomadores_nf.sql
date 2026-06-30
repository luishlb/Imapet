-- Backfill: popula o cadastro de tomadores (tomadores_nf) a partir das notas
-- fiscais já emitidas (notas_fiscais). Isso faz o dropdown "Tomadores cadastrados"
-- no modal de emissão listar todo mundo que já teve nota, mesmo antes de o
-- cadastro automático existir.
--
-- Seguro de rodar mais de uma vez: ON CONFLICT (documento) DO NOTHING não
-- sobrescreve tomadores já cadastrados (que podem ter dados mais completos,
-- como endereço e preferência de ISS retido).

INSERT INTO tomadores_nf (tipo_doc, documento, nome, email, iss_retido, ultima_emissao_em)
SELECT
  tipo_doc,
  documento,
  nome,
  email,
  FALSE AS iss_retido,
  ultima_emissao_em
FROM (
  SELECT DISTINCT ON (regexp_replace(tomador_documento, '\D', '', 'g'))
    regexp_replace(tomador_documento, '\D', '', 'g') AS documento,
    COALESCE(
      NULLIF(tomador_tipo_doc, ''),
      CASE WHEN length(regexp_replace(tomador_documento, '\D', '', 'g')) = 14 THEN 'CNPJ' ELSE 'CPF' END
    ) AS tipo_doc,
    tomador_nome AS nome,
    NULLIF(tomador_email, '') AS email,
    COALESCE(emitida_em, criado_em) AS ultima_emissao_em
  FROM notas_fiscais
  WHERE status = 'autorizada'
    AND tomador_nome IS NOT NULL
    AND tomador_documento IS NOT NULL
    AND regexp_replace(tomador_documento, '\D', '', 'g') <> ''
  ORDER BY
    regexp_replace(tomador_documento, '\D', '', 'g'),
    COALESCE(emitida_em, criado_em) DESC
) AS recentes
ON CONFLICT (documento) DO NOTHING;
