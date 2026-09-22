import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

// Token válido: 8 caracteres, maiúsculas e números (sem ambíguos: sem O, I, L, 0, 1)
function isValidToken(token: string): boolean {
  return /^[A-HJ-KM-NP-Z2-9]{8}$/.test(token || "")
}

function sanitize(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim().slice(0, 20)
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const { token } = await req.json()
    const tokenLimpo = sanitize((token || "").toUpperCase())

    if (!isValidToken(tokenLimpo)) {
      return new Response(JSON.stringify({ error: "Token inválido. Verifique os 8 caracteres." }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Busca APENAS o agendamento daquele token — ninguém vê o dos outros
    const { data, error } = await supabase
      .from("agendamentos")
      .select("id, nome, servico, status, horario_agendado, pago, forma_pagamento, valor")
      .eq("token", tokenLimpo)
      .limit(1)

    if (error) {
      return new Response(JSON.stringify({ error: "Erro ao buscar" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ error: "Agendamento não encontrado. Confira seu token." }), { status: 404, headers: { "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ agendamento: data[0] }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
