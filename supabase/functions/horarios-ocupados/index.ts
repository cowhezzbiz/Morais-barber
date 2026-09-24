import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

// Retorna APENAS os horários ocupados de um período.
// Parâmetros: ?data=AAAA-MM-DD (um dia) OU ?inicio=AAAA-MM-DD&fim=AAAA-MM-DD (range).
// Nenhum dado pessoal (nome, telefone, serviço) é exposto — só timestamps.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const url = new URL(req.url)
    const data = url.searchParams.get("data") || ""
    const inicio = url.searchParams.get("inicio") || ""
    const fim = url.searchParams.get("fim") || ""

    const validaData = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d + "T12:00:00").getTime())

    let inicioISO: string
    let fimISO: string

    if (inicio && fim && validaData(inicio) && validaData(fim)) {
      // Range de dias (agenda da semana)
      inicioISO = new Date(inicio + "T00:00:00-03:00").toISOString()
      fimISO = new Date(fim + "T23:59:59-03:00").toISOString()
    } else if (validaData(data)) {
      // Dia único
      inicioISO = new Date(data + "T00:00:00-03:00").toISOString()
      fimISO = new Date(data + "T23:59:59-03:00").toISOString()
    } else {
      return new Response(JSON.stringify({ error: "Data inválida" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: ocupados, error } = await supabase
      .from("agendamentos")
      .select("horario_agendado")
      .gte("horario_agendado", inicioISO)
      .lte("horario_agendado", fimISO)
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
