-- ============================================
-- SCRIPT DE SEGURANÇA - MORIAS BARBER
-- Resolve todos os problemas de uma vez
-- ============================================

-- 1. REMOVE POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "delete_auth" ON agendamentos;
DROP POLICY IF EXISTS "delete_never" ON agendamentos;
DROP POLICY IF EXISTS "update_auth" ON agendamentos;

-- 2. CRIA POLÍTICAS RESTRITIVAS
-- DELETE: bloqueado para todos (nunca público)
CREATE POLICY "delete_block_all" ON agendamentos 
  FOR DELETE USING (false) WITH CHECK (false);

-- UPDATE: bloqueado para todos (nunca público)  
CREATE POLICY "update_block_all" ON agendamentos 
  FOR UPDATE USING (false) WITH CHECK (false);

-- 3. ADICIONA CONSTRAINTS DE VALIDAÇÃO
-- Remove constraints antigas se existirem
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS check_nome;
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS check_telefone;
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS check_servico;

-- Nome: apenas letras e espaços, 2-100 caracteres
ALTER TABLE agendamentos ADD CONSTRAINT check_nome 
  CHECK (nome ~ '^[a-zA-ZÀ-ÿ\s]{2,100}$');

-- Telefone: apenas números, 10-11 dígitos
ALTER TABLE agendamentos ADD CONSTRAINT check_telefone 
  CHECK (telefone ~ '^[0-9]{10,11}$');

-- Serviço: apenas valores permitidos
ALTER TABLE agendamentos ADD CONSTRAINT check_servico 
  CHECK (servico IN ('Corte Masculino', 'Barba', 'Corte + Barba', 'Sobrancelha', 'Pigmentação', 'Hidratação Capilar', 'Tatuagem'));

-- 4. VERIFICAÇÃO FINAL
SELECT 
  'Políticas de segurança aplicadas!' as status,
  (SELECT count(*) FROM pg_policies WHERE tablename = 'agendamentos') as total_politicas,
  (SELECT count(*) FROM pg_constraint WHERE conrelid = 'agendamentos'::regclass) as total_constraints;
