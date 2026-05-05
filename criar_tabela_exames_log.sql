-- Tabela de auditoria de mudanças em exames
-- Não tem FK pra exames porque o exame pode ser deletado e queremos manter o histórico

CREATE TABLE IF NOT EXISTS exames_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exame_id UUID,
  acao TEXT NOT NULL,                -- 'edit' | 'delete' | 'pagamento_recebido'
  alteracoes JSONB,                  -- edit: { campo: { de, para } }; delete: snapshot completo
  resumo TEXT,                       -- string curta legível pro humano (ex: "Suzi - 16/04/2026 - Animania")
  origem TEXT,                       -- 'admin' (vet) | 'owner'
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exames_log_criado_em_idx ON exames_log (criado_em DESC);
CREATE INDEX IF NOT EXISTS exames_log_exame_id_idx ON exames_log (exame_id);
CREATE INDEX IF NOT EXISTS exames_log_acao_idx ON exames_log (acao);

-- Permissões abertas (mesmo padrão das outras tabelas)
ALTER TABLE exames_log DISABLE ROW LEVEL SECURITY;
