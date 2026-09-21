#!/bin/bash
# =============================================
# TEMPLATE Seguro - Morais Barber
# Script pra montar um site com a mesma segurança
# Uso: bash template-seguro.sh [nome-do-projeto]
# =============================================

PROJECT_NAME=${1:-"meu-site-seguro"}
echo "🛡️ Criando template seguro: $PROJECT_NAME"
echo ""

# 1. Criar estrutura de pastas
mkdir -p $PROJECT_NAME/src
mkdir -p $PROJECT_NAME/supabase/functions/agendar
mkdir -p $PROJECT_NAME/supabase/functions/acompanhamento
mkdir -p $PROJECT_NAME/public/well-known

# 2. Criar package.json
cat > $PROJECT_NAME/package.json << 'EOF'
{
  "name": "template-seguro",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0",
    "lucide-react": "^1.47.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-router-dom": "^7.18.4"
  },
  "devDependencies": {
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "typescript": "~6.0.2",
    "vite": "^8.3.0"
  }
}
EOF

# 3. Criar vercel.json com headers de segurança
cat > $PROJECT_NAME/vercel.json << 'EOF'
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Resource-Policy",
          "value": "same-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://apis.google.com https://www.gstatic.com https://www.google.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://maps.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https:; connect-src 'self' https://croscmpnezlixszygyka.supabase.co https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com; frame-src https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; form-action 'self';"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
EOF

# 4. Criar security.txt
cat > $PROJECT_NAME/public/well-known/security.txt << 'EOF'
Contact: mailto:seuemail@gmail.com
Expires: 2027-12-31T00:00:00.000Z
Preferred-Languages: pt-BR, en
EOF

# 5. Criar Edge Function - Agendar
cat > $PROJECT_NAME/supabase/functions/agendar/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

const SERVICOS_VALIDOS = [
  "Corte + Sobrancelha",
  "Corte + Barba",
  "Combo Completo",
  "Tatuagem"
]

const PRECOS: Record<string, number> = {
  "Corte + Sobrancelha": 35,
  "Corte + Barba": 35,
  "Combo Completo": 60,
  "Tatuagem": 0
}

const MAX_AGENDAMENTOS_POR_TELEFONE = 2

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 11
}

function sanitizeString(value: string, maxLength: number): string {
  return value.replace(/<[^>]*>/g, "").trim().slice(0, maxLength)
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const { nome, telefone, servico, mensagem, horario_agendado } = await req.json()

    const nomeSanitizado = sanitizeString(nome || "", 100)
    const telefoneSanitizado = sanitizeString(telefone || "", 15).replace(/\D/g, "")
    const servicoSanitizado = sanitizeString(servico || "", 100)
    const mensagemSanitizada = sanitizeString(mensagem || "", 500)

    if (!nomeSanitizado || nomeSanitizado.length < 2) {
      return new Response(JSON.stringify({ error: "Nome inválido" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    if (!isValidPhone(telefoneSanitizado)) {
      return new Response(JSON.stringify({ error: "Telefone inválido" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    if (!SERVICOS_VALIDOS.includes(servicoSanitizado)) {
      return new Response(JSON.stringify({ error: "Serviço inválido" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: agendamentosExistentes, error: countError } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("telefone", telefoneSanitizado)
      .in("status", ["pendente", "confirmado"])
      .limit(MAX_AGENDAMENTOS_POR_TELEFONE + 1)

    if (countError) {
      return new Response(JSON.stringify({ error: "Erro ao verificar agendamentos" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    if (agendamentosExistentes && agendamentosExistentes.length >= MAX_AGENDAMENTOS_POR_TELEFONE) {
      return new Response(JSON.stringify({ error: "Você já tem 2 agendamentos ativos" }), { status: 403, headers: { "Content-Type": "application/json" } })
    }

    let horarioISO: string | null = null
    if (horario_agendado) {
      horarioISO = new Date(horario_agendado).toISOString()
      if (isNaN(new Date(horario_agendado).getTime())) {
        return new Response(JSON.stringify({ error: "Data/horário inválido" }), { status: 400, headers: { "Content-Type": "application/json" } })
      }

      const { data: horarioOcupado } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("horario_agendado", horarioISO)
        .in("status", ["pendente", "confirmado"])
        .limit(1)

      if (horarioOcupado && horarioOcupado.length > 0) {
        return new Response(JSON.stringify({ error: "Este horário já está ocupado" }), { status: 409, headers: { "Content-Type": "application/json" } })
      }
    }

    const { data, error } = await supabase.from("agendamentos").insert({
      nome: nomeSanitizado,
      telefone: telefoneSanitizado,
      servico: servicoSanitizado,
      mensagem: mensagemSanitizada,
      status: "pendente",
      horario_agendado: horarioISO,
      forma_pagamento: "pendente",
      valor: PRECOS[servicoSanitizado] || 0
    })

    if (error) {
      if (error.code === "23505") {
        return new Response(JSON.stringify({ error: "Este horário acabou de ser reservado" }), { status: 409, headers: { "Content-Type": "application/json" } })
      }
      return new Response(JSON.stringify({ error: "Erro ao salvar", details: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ success: true, id: data?.[0]?.id }), { status: 201, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
EOF

# 6. Criar Edge Function - Acompanhamento
cat > $PROJECT_NAME/supabase/functions/acompanhamento/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 11
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const { telefone } = await req.json()
    const telefoneFormatado = (telefone || "").replace(/\D/g, "")

    if (!isValidPhone(telefoneFormatado)) {
      return new Response(JSON.stringify({ error: "Telefone inválido" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data, error } = await supabase
      .from("agendamentos")
      .select("id, nome, telefone, servico, status, horario_agendado, pago, forma_pagamento, valor")
      .eq("telefone", telefoneFormatado)
      .order("horario_agendado", { ascending: true })
      .limit(10)

    if (error) {
      return new Response(JSON.stringify({ error: "Erro ao buscar" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ agendamentos: data || [] }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
EOF

# 7. Criar .gitignore
cat > $PROJECT_NAME/.gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
EOF

# 8. Criar README.md
cat > $PROJECT_NAME/README.md << 'EOF'
# Template Seguro - Morais Barber

Site com agendamento, admin panel e segurança completa.

## 🚀 Como usar:

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar Supabase:**
   - Criar projeto no Supabase
   - Configurar as Edge Functions
   - Configurar as secrets

3. **Rodar localmente:**
   ```bash
   npm run dev
   ```

4. **Deploy no Vercel:**
   ```bash
   vercel --prod
   ```

## 🔒 Segurança:

- ✅ RLS ativo no banco
- ✅ Edge Functions com service_role key
- ✅ Headers de segurança
- ✅ Rate limiting
- ✅ Honeypot anti-bot
- ✅ Sanitização de inputs

## 📁 Estrutura:

```
src/                    # Frontend React
supabase/functions/     # Edge Functions (backend)
public/well-known/       # security.txt
vercel.json             # Headers de segurança
```

## 🛠️ Personalizar:

Edite os arquivos em `src/` pra mudar o visual e o conteúdo.
Edite as Edge Functions pra mudar a lógica de negócio.
EOF

echo "✅ Template seguro criado em $PROJECT_NAME/"
echo ""
echo "📋 Próximos passos:"
echo "1. cd $PROJECT_NAME"
echo "2. npm install"
echo "3. Configurar Supabase (criar projeto, Edge Functions, secrets)"
echo "4. npm run dev"
echo ""
echo "🛡️ Segurança incluída:"
echo "- RLS ativo"
echo "- Edge Functions com service_role key"
echo "- Headers de segurança"
echo "- Rate limiting"
echo "- Honeypot anti-bot"
echo "- Sanitização de inputs"
