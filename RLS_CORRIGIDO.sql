-- CORREÇÃO RLS - MORIAS BARBER (CORRIGIDO)

-- 1. Verifica RLS atual
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'agendamentos';

-- 2. Desabilita RLS temporariamente
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;

-- 3. Deleta registros de teste
DELETE FROM agendamentos WHERE nome LIKE 'Teste%';

-- 4. Reabilita RLS
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- 5. Remove políticas antigas
DROP POLICY IF EXISTS "insert_public" ON agendamentos;
DROP POLICY IF EXISTS "select_auth" ON agendamentos;
DROP POLICY IF EXISTS "update_auth" ON agendamentos;
DROP POLICY IF EXISTS "delete_auth" ON agendamentos;

-- 6. Cria políticas corretas
CREATE POLICY "insert_public" ON agendamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "select_auth" ON agendamentos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "update_auth" ON agendamentos FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_auth" ON agendamentos FOR DELETE USING (auth.role() = 'authenticated');

-- 7. Verifica resultado
SELECT 'RLS corrigido!' as status;
