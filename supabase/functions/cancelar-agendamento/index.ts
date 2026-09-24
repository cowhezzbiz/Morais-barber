import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

// Cliente cancela o próprio agendamento com token + telefone (confirma identidade).
// Regras: só cancela se ainda estiver ativo e faltar mais de 2h pro horário.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const { token, telefone } = await req.json()
    const tokenLimpo = (token || "").toString().toUpperCase().trim().slice(0, 20)
    const telefoneLimpo = (telefone || "").toString().replace(/\D/g, "").slice(0, 11)

    if (!/^[A-HJ-KM-NP-Z2-9]{8}$/.test(tokenLimpo)) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    }
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
      return new Response(JSON.stringify({ error: "Telefone inválido" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Busca o agendamento pelo token
    const { data: ag } = await supabase
      .from("agendamentos")
      .select("id, telefone, status, horario_agendado")
      .eq("token", tokenLimpo)
      .limit(1)

    if (!ag || ag.length === 0) {
      return new Response(JSON.stringify({ error: "Agendamento não encontrado" }), { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    }

    const agendamento = ag[0]

    // Confere o telefone (só o dono cancela)
    if (agendamento.telefone !== telefoneLimpo) {
      return new Response(JSON.stringify({ error: "Telefone não confere com este agendamento" }), { status: 403, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    }

    // Só cancela o que ainda tá ativo
    if (agendamento.status === "cancelado") {
      return new Response(JSON.stringify({ error: "Este agendamento já está cancelado" }), { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    }

    // Regra: faltar mais de 2h pro horário (senão liga pro barbeiro)
    if (agendamento.horario_agendado) {
      const faltamMs = new Date(agendamento.horario_agendado).getTime() - Date.now()
      if (faltamMs < 2 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ error: "Faltam menos de 2h pro horário. Chama no WhatsApp (51) 98130-1035 pra cancelar." }), { status: 409, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
      }
    }

    // Cancela (o trigger manda push pro barbeiro)
    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "cancelado", cancelado_por_cliente: true })
      .eq("id", agendamento.id)
      .in("status", ["pendente", "confirmado", "aguardando_pagamento", "aguardando_verificacao"])

    if (error) {
      return new Response(JSON.stringify({ error: "Erro ao cancelar" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  } catch {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
