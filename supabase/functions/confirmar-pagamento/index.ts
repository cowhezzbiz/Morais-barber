import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

function isValidToken(token: string): boolean {
  return /^[A-HJ-KM-NP-Z2-9]{8}$/.test(token || "")
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const { token } = await req.json()
    const tokenLimpo = (token || "").replace(/<[^>]*>/g, "").trim().toUpperCase().slice(0, 20)

    if (!isValidToken(tokenLimpo)) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Só muda de aguardando_pagamento → pendente (entra na agenda do admin)
    const { data, error } = await supabase
      .from("agendamentos")
      .update({ status: "pendente" })
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
