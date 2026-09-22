import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

function isValidToken(token: string): boolean {
  return /^[A-HJ-KM-NP-Z2-9]{8}$/.test(token || "")
}

// Comprovante PIX: o E2EID tem formato variável por banco.
// Aceitamos 20-60 caracteres alfanuméricos com hífens/pontos.
function isValidComprovante(comp: string): boolean {
  return /^[A-Za-z0-9\-\.]{20,60}$/.test(comp || "")
}

function sanitize(value: string, max: number): string {
  return value.replace(/<[^>]*>/g, "").trim().slice(0, max)
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const { token, comprovante } = await req.json()
    const tokenLimpo = sanitize((token || "").toUpperCase(), 20)
    const comprovanteLimpo = sanitize(comprovante || "", 60)

    if (!isValidToken(tokenLimpo)) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    if (!isValidComprovante(comprovanteLimpo)) {
      return new Response(JSON.stringify({ error: "Cole o código do comprovante PIX (aparece no app do banco depois de pagar)" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // 1. Verifica se o comprovante já foi usado em outro agendamento (fraude)
    const { data: comprovanteUsado } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("comprovante", comprovanteLimpo)
      .limit(1)

    if (comprovanteUsado && comprovanteUsado.length > 0) {
      return new Response(JSON.stringify({ error: "Este comprovante já foi utilizado" }), { status: 409, headers: { "Content-Type": "application/json" } })
    }

    // 2. Move de aguardando_pagamento → aguardando_verificacao com o comprovante
    const { data, error } = await supabase
      .from("agendamentos")
      .update({ status: "aguardando_verificacao", comprovante: comprovanteLimpo })
      .eq("token", tokenLimpo)
      .eq("status", "aguardando_pagamento")
      .select("id")

    if (error) {
      return new Response(JSON.stringify({ error: "Erro ao confirmar" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ error: "Agendamento não encontrado ou já confirmado" }), { status: 404, headers: { "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
