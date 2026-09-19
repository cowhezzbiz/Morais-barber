-- ============================================
-- CORREÇÃO DE EMERGÊNCIA - MORIAS BARBER
-- ============================================

-- 1. DESABILITA E REABILITA RLS (limpa cache)
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- 2. REMOVE TODAS AS POLÍTICAS
DROP POLICY IF EXISTS "delete_auth" ON agendamentos;
DROP POLICY IF EXISTS "delete_never" ON agendamentos;
DROP POLICY IF EXISTS "delete_block_all" ON agendamentos;
DROP POLICY IF EXISTS "update_auth" ON agendamentos;
DROP POLICY IF EXISTS "update_block_all" ON agendamentos;
DROP POLICY IF EXISTS "insert_public" ON agendamentos;
DROP POLICY IF EXISTS "select_auth" ON agendamentos;

-- 3. CRIA POLÍTICAS COM AUTENTICAÇÃO OBRIGATÓRIA
CREATE POLICY "insert_public" ON agendamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "select_auth_only" ON agendamentos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "update_auth_only" ON agendamentos FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_auth_only" ON agendamentos FOR DELETE USING (auth.role() = 'authenticated');

-- 4. VERIFICAÇÃO
SELECT 'RLS ativo!' as status;
SELECT count(*) as total_politicas FROM pg_policies WHERE tablename = 'agendamentos';
