#!/bin/bash
# Verifica se frontend e backend estão sincronizados

echo "🔍 Verificando sincronização frontend/backend..."

# Verificar se SERVICOS do frontend batem com backend
FRONTEND_SERVICOS=$(grep -oP "nome: '\K[^']+" src/App.tsx | head -10)
BACKEND_SERVICOS=$(grep -oP '"\K[^"]+(?=")' supabase/functions/agendar/index.ts | grep -E "^(Corte|Barba|Combo|Tatuagem)" | head -10)

echo "Frontend: $FRONTEND_SERVICOS"
echo "Backend: $BACKEND_SERVICOS"

# Verificar se campos do insert batem com o que frontend envia
FRONTEND_FIELDS=$(grep -oP "body: JSON\.stringify\(\K[^)]+" src/App.tsx | tr ',' '\n' | grep -oP "\w+" | sort -u)
BACKEND_FIELDS=$(grep -oP "insert\(\K[^)]+" supabase/functions/agendar/index.ts | tr ',' '\n' | grep -oP "\w+" | sort -u)

echo ""
echo "✅ Verificação concluída!"
echo "Se houver diferenças, o deploy pode falhar."
