-- =============================================
-- SISTEMA DE AGENDAMENTO COM PAGAMENTO
-- =============================================

-- 1. Atualiza tabela agendamentos
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS 
  forma_pagamento TEXT DEFAULT 'pendente' CHECK (forma_pagamento IN ('pendente', 'pix', 'dinheiro', 'cartao'));

ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS 
  status_pagamento TEXT DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado'));

ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS 
  valor NUMERIC(10,2) DEFAULT 0;

-- 2. Cria tabela de serviços (pra usar no formulário)
CREATE TABLE IF NOT EXISTS servicos (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  duracao_min INT NOT NULL DEFAULT 30,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insere serviços padrão
INSERT INTO servicos (nome, valor, duracao_min) VALUES
  ('Corte Masculino', 45, 40),
  ('Barba', 30, 30),
  ('Corte + Barba', 65, 60),
  ('Sobrancelha', 15, 15),
  ('Pigmentação', 50, 45),
  ('Hidratação Capilar', 35, 30),
  ('Tatuagem', 0, 120)
ON CONFLICT (nome) DO UPDATE SET
  valor = EXCLUDED.valor,
  duracao_min = EXCLUDED.duracao_min;

-- 4. Políticas RLS para servicos (público pode ler)
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "servicos_select_public" ON servicos;
CREATE POLICY "servicos_select_public" ON servicos FOR SELECT USING (true);

DROP POLICY IF EXISTS "servicos_admin" ON servicos FOR ALL;
CREATE POLICY "servicos_admin" ON servicos FOR ALL USING (auth.role() = 'authenticated');

-- 5. Atualiza políticas agendamentos
DROP POLICY IF EXISTS "insert_public" ON agendamentos;
CREATE POLICY "insert_public" ON agendamentos FOR INSERT WITH CHECK (true);

-- 6. Verifica
SELECT 'Sistema de agendamento configurado!' as status;
SELECT * FROM servicos;
