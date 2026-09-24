import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

// Retorna APENAS os horários ocupados de uma data (AAAA-MM-DD).
// Nenhum dado pessoal (nome, telefone, serviço) é exposto — só timestamps.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const url = new URL(req.url)
    const data = url.searchParams.get("data") || ""

    // Valida formato AAAA-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(new Date(data + "T12:00:00").getTime())) {
      return new Response(JSON.stringify({ error: "Data inválida" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Janela do dia informado (00:00 às 23:59, horário local do Brasil -03:00)
    const inicio = new Date(data + "T00:00:00-03:00").toISOString()
    const fim = new Date(data + "T23:59:59-03:00").toISOString()

    const { data: ocupados, error } = await supabase
      .from("agendamentos")
      .select("horario_agendado")
      .gte("horario_agendado", inicio)
      .lte("horario_agendado", fim)
      .in("status", ["pendente", "confirmado", "aguardando_pagamento", "aguardando_verificacao"])
      .not("horario_agendado", "is", null)

    if (error) {
      return new Response(JSON.stringify({ error: "Erro ao buscar" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    const horarios = (ocupados || []).map((r: { horario_agendado: string }) => r.horario_agendado)

    return new Response(JSON.stringify({ ocupados: horarios }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  } catch {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
