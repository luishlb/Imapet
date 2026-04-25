-- Normalização de exames.clinica e tabela clinicas para a lista padrão
-- Rodar no SQL Editor do Supabase

-- ═══ PARTE 1: normalizar exames.clinica ══════════════════════════════════════

UPDATE exames SET clinica = 'Animania'           WHERE LOWER(TRIM(clinica)) = 'animania';
UPDATE exames SET clinica = 'Arionaldo de Sá'    WHERE LOWER(TRIM(clinica)) = 'arionaldo de sá';
UPDATE exames SET clinica = 'Baobá'              WHERE LOWER(TRIM(clinica)) IN ('baobá','baoba');
UPDATE exames SET clinica = 'Beleza Cão e Gato'  WHERE LOWER(TRIM(clinica)) IN ('beleza cao e gato','beleza cão e gato');
UPDATE exames SET clinica = 'Bicho Feliz'        WHERE LOWER(TRIM(clinica)) IN ('bicho feliz','bicho feliz');
UPDATE exames SET clinica = 'Brasilia Petshop'   WHERE LOWER(TRIM(clinica)) IN ('brasilia petshop','brasília petshop','brasília pteshop');
UPDATE exames SET clinica = 'Caninos e Felinos'  WHERE LOWER(TRIM(clinica)) IN ('caninos e felinos','caninos e felinos');
UPDATE exames SET clinica = 'CGT Paula'          WHERE LOWER(TRIM(clinica)) IN ('cgt paula','cgt paula');
UPDATE exames SET clinica = 'Cia do Animal'      WHERE LOWER(TRIM(clinica)) IN ('cia do animal','cia do animal');
UPDATE exames SET clinica = 'Clindermavet'       WHERE LOWER(TRIM(clinica)) = 'clindermavet';
UPDATE exames SET clinica = 'CV Jefferson Sousa' WHERE LOWER(TRIM(clinica)) = 'cv jefferson sousa';
UPDATE exames SET clinica = 'Domicílio'          WHERE LOWER(TRIM(clinica)) IN ('domicilio','domicílio');
UPDATE exames SET clinica = 'Esquina Pet'        WHERE LOWER(TRIM(clinica)) = 'esquina pet';
UPDATE exames SET clinica = 'HomeVet'            WHERE LOWER(TRIM(clinica)) = 'homevet';
UPDATE exames SET clinica = 'Kardyovet'          WHERE LOWER(TRIM(clinica)) = 'kardyovet';
UPDATE exames SET clinica = 'Meu Xodó'           WHERE LOWER(TRIM(clinica)) IN ('meu xodó','meu xodo');
UPDATE exames SET clinica = 'Nortvet'            WHERE LOWER(TRIM(clinica)) = 'nortvet';
UPDATE exames SET clinica = 'Particular'         WHERE LOWER(TRIM(clinica)) = 'particular';
UPDATE exames SET clinica = 'Pet das Graças'     WHERE LOWER(TRIM(clinica)) IN ('pet das graças','pet das gracas');
UPDATE exames SET clinica = 'Pets House'         WHERE LOWER(TRIM(clinica)) = 'pets house';
UPDATE exames SET clinica = 'Petvilla'           WHERE LOWER(TRIM(clinica)) = 'petvilla';
UPDATE exames SET clinica = 'Petvilla Casa Forte' WHERE LOWER(TRIM(clinica)) = 'petvilla casa forte';
UPDATE exames SET clinica = 'Petvilla Torre'     WHERE LOWER(TRIM(clinica)) = 'petvilla torre';
UPDATE exames SET clinica = 'Planet Pet'         WHERE LOWER(TRIM(clinica)) = 'planet pet';
UPDATE exames SET clinica = 'Uninassau'          WHERE LOWER(TRIM(clinica)) = 'uninassau';
UPDATE exames SET clinica = 'VetPet'             WHERE LOWER(TRIM(clinica)) = 'vetpet';

-- ═══ PARTE 2: normalizar tabela clinicas (nomes para autocomplete) ════════════

-- Atualiza variações para o nome canônico
UPDATE clinicas SET nome = 'Animania'            WHERE LOWER(TRIM(nome)) = 'animania'           AND nome != 'Animania';
UPDATE clinicas SET nome = 'Baobá'               WHERE LOWER(TRIM(nome)) IN ('baobá','baoba')   AND nome != 'Baobá';
UPDATE clinicas SET nome = 'Beleza Cão e Gato'   WHERE LOWER(TRIM(nome)) IN ('beleza cao e gato','beleza cão e gato') AND nome != 'Beleza Cão e Gato';
UPDATE clinicas SET nome = 'Bicho Feliz'         WHERE LOWER(TRIM(nome)) = 'bicho feliz'        AND nome != 'Bicho Feliz';
UPDATE clinicas SET nome = 'Brasilia Petshop'    WHERE LOWER(TRIM(nome)) IN ('brasilia petshop','brasília petshop','brasília pteshop') AND nome != 'Brasilia Petshop';
UPDATE clinicas SET nome = 'Caninos e Felinos'   WHERE LOWER(TRIM(nome)) = 'caninos e felinos'  AND nome != 'Caninos e Felinos';
UPDATE clinicas SET nome = 'CGT Paula'           WHERE LOWER(TRIM(nome)) = 'cgt paula'          AND nome != 'CGT Paula';
UPDATE clinicas SET nome = 'Cia do Animal'       WHERE LOWER(TRIM(nome)) = 'cia do animal'      AND nome != 'Cia do Animal';
UPDATE clinicas SET nome = 'Domicílio'           WHERE LOWER(TRIM(nome)) IN ('domicilio','domicílio') AND nome != 'Domicílio';
UPDATE clinicas SET nome = 'Esquina Pet'         WHERE LOWER(TRIM(nome)) = 'esquina pet'        AND nome != 'Esquina Pet';
UPDATE clinicas SET nome = 'HomeVet'             WHERE LOWER(TRIM(nome)) = 'homevet'            AND nome != 'HomeVet';
UPDATE clinicas SET nome = 'Kardyovet'           WHERE LOWER(TRIM(nome)) = 'kardyovet'          AND nome != 'Kardyovet';
UPDATE clinicas SET nome = 'Meu Xodó'            WHERE LOWER(TRIM(nome)) IN ('meu xodó','meu xodo') AND nome != 'Meu Xodó';
UPDATE clinicas SET nome = 'Nortvet'             WHERE LOWER(TRIM(nome)) = 'nortvet'            AND nome != 'Nortvet';
UPDATE clinicas SET nome = 'Particular'          WHERE LOWER(TRIM(nome)) = 'particular'         AND nome != 'Particular';
UPDATE clinicas SET nome = 'Pet das Graças'      WHERE LOWER(TRIM(nome)) IN ('pet das graças','pet das gracas') AND nome != 'Pet das Graças';
UPDATE clinicas SET nome = 'Pets House'          WHERE LOWER(TRIM(nome)) = 'pets house'         AND nome != 'Pets House';
UPDATE clinicas SET nome = 'Petvilla'            WHERE LOWER(TRIM(nome)) = 'petvilla'           AND nome != 'Petvilla';
UPDATE clinicas SET nome = 'Petvilla Casa Forte' WHERE LOWER(TRIM(nome)) = 'petvilla casa forte' AND nome != 'Petvilla Casa Forte';
UPDATE clinicas SET nome = 'Petvilla Torre'      WHERE LOWER(TRIM(nome)) = 'petvilla torre'     AND nome != 'Petvilla Torre';
UPDATE clinicas SET nome = 'Planet Pet'          WHERE LOWER(TRIM(nome)) = 'planet pet'         AND nome != 'Planet Pet';
UPDATE clinicas SET nome = 'Uninassau'           WHERE LOWER(TRIM(nome)) = 'uninassau'          AND nome != 'Uninassau';
UPDATE clinicas SET nome = 'VetPet'              WHERE LOWER(TRIM(nome)) = 'vetpet'             AND nome != 'VetPet';

-- Insere as que ainda não existem
INSERT INTO clinicas (nome, email, whatsapp)
SELECT v.nome, NULL, NULL
FROM (VALUES
  ('Caninos e Felinos'), ('Brasilia Petshop'), ('CGT Paula'), ('Animania'),
  ('Petvilla'), ('Cia do Animal'), ('Nortvet'), ('Petvilla Torre'),
  ('Particular'), ('VetPet'), ('Pets House'), ('Arionaldo de Sá'),
  ('HomeVet'), ('Bicho Feliz'), ('Meu Xodó'), ('Uninassau'),
  ('Planet Pet'), ('Beleza Cão e Gato'), ('Clindermavet'), ('Pet das Graças'),
  ('Esquina Pet'), ('Baobá'), ('Domicílio'), ('CV Jefferson Sousa'),
  ('Mundo dos Bichos'), ('Petvilla Casa Forte'), ('Kardyovet')
) AS v(nome)
WHERE NOT EXISTS (
  SELECT 1 FROM clinicas WHERE LOWER(TRIM(clinicas.nome)) = LOWER(TRIM(v.nome))
);

-- Remove duplicatas (mantém o registro com email preenchido, ou o de menor id)
DELETE FROM clinicas a
USING clinicas b
WHERE LOWER(TRIM(a.nome)) = LOWER(TRIM(b.nome))
  AND a.id > b.id
  AND (a.email IS NULL OR b.email IS NOT NULL);
