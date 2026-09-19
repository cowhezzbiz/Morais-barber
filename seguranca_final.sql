-- =====================================================
-- SCRIPT ÚNICO DE SEGURANÇA - MORIAS BARBER
-- Copia e cola tudo no SQL Editor do Supabase
-- =====================================================

-- PASSO 1: Desabilita RLS pra limpar tudo
ALTER TABLE IF EXISTS agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fechamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS logs_auditoria DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Remove TODAS as políticas antigas
DO $$
BEGIN
  -- Agendamentos
  DROP POLICY IF EXISTS "insert_public" ON agendamentos;
  DROP POLICY IF EXISTS "select_auth" ON agendamentos;
  DROP POLICY IF EXISTS "update_auth" ON agendamentos;
  DROP POLICY IF EXISTS "delete_auth" ON agendamentos;
  DROP POLICY IF EXISTS "delete_never" ON agendamentos;
  DROP POLICY IF EXISTS "delete_block_all" ON agendamentos;
  DROP POLICY IF EXISTS "update_block_all" ON agendamentos;
  DROP POLICY IF EXISTS "select_auth_only" ON agendamentos;
  DROP POLICY IF EXISTS "update_auth_only" ON agendamentos;
  DROP POLICY IF EXISTS "delete_auth_only" ON agendamentos;

  -- Fechamentos
  DROP POLICY IF EXISTS "fechamentos_auth" ON fechamentos;
  DROP POLICY IF EXISTS "fechamentos_all" ON fechamentos;
  DROP POLICY IF EXISTS "fechamentos_select" ON fechamentos;
  DROP POLICY IF EXISTS "fechamentos_insert" ON fechamentos;

  -- Logs
  DROP POLICY IF EXISTS "logs_select" ON logs_auditoria;
  DROP POLICY IF EXISTS "logs_insert" ON logs_auditoria;
  DROP POLICY IF EXISTS "logs_select_auth" ON logs_auditoria;
  DROP POLICY IF EXISTS "logs_insert_system" ON logs_auditoria;
END $$;

-- PASSO 3: Reabilita RLS
ALTER TABLE IF EXISTS agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fechamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS logs_auditoria ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Cria políticas corretas para agendamentos
CREATE POLICY "insert_public" ON agendamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "select_auth" ON agendamentos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "update_auth" ON agendamentos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "delete_auth" ON agendamentos FOR DELETE USING (auth.role() = 'authenticated');

-- PASSO 5: Cria políticas para fechamentos
CREATE POLICY "fechamentos_auth" ON fechamentos FOR ALL USING (auth.role() = 'authenticated');

-- PASSO 6: Cria políticas para logs
CREATE POLICY "logs_select_auth" ON logs_auditoria FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "logs_insert_system" ON logs_auditoria FOR INSERT WITH CHECK (true);

-- PASSO 7: Verificação
SELECT 'Segurança aplicada com sucesso!' as status;
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('agendamentos', 'fechamentos', 'logs_auditoria')
ORDER BY tablename, policyname;
