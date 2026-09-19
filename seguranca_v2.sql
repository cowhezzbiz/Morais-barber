-- ============================================
-- SCRIPT DE SEGURANÇA - MORIAS BARBER v2
-- ============================================

-- 1. REMOVE POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "delete_auth" ON agendamentos;
DROP POLICY IF EXISTS "delete_never" ON agendamentos;
DROP POLICY IF EXISTS "delete_block_all" ON agendamentos;
DROP POLICY IF EXISTS "update_auth" ON agendamentos;
DROP POLICY IF EXISTS "update_block_all" ON agendamentos;

-- 2. CRIA POLÍTICAS CORRIGIDAS
-- DELETE: bloqueado para todos
CREATE POLICY "delete_block_all" ON agendamentos 
  FOR DELETE USING (false);

-- UPDATE: bloqueado para todos
CREATE POLICY "update_block_all" ON agendamentos 
  FOR UPDATE USING (false);

-- 3. VERIFICAÇÃO
SELECT 'Políticas aplicadas com sucesso!' as status;
