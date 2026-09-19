-- SCRIPT DEFINITIVO - SEGURANÇA TOTAL
-- ============================================

-- Verifica políticas atuais
SELECT 'POLÍTICAS ATUAIS:' as info;
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'agendamentos';

-- Força RLS
ALTER TABLE agendamentos FORCE ROW LEVEL SECURITY;

-- Remove TODAS as políticas
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

-- Cria políticas 100% restritivas
CREATE POLICY "insert_public" ON agendamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "select_auth_only" ON agendamentos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "update_block" ON agendamentos FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "delete_block" ON agendamentos FOR DELETE USING (false);

-- Verifica resultado
SELECT 'NOVAS POLÍTICAS:' as info;
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'agendamentos';
