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

// Gera token único de 8 caracteres (sem caracteres ambíguos: sem 0/O, 1/I/L)
function gerarToken(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, b => chars[b % chars.length]).join("")
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const { nome, telefone, servico, mensagem, horario_agendado } = await req.json()

    // Sanitização
    const nomeSanitizado = sanitizeString(nome || "", 100)
    const telefoneSanitizado = sanitizeString(telefone || "", 15).replace(/\D/g, "")
    const servicoSanitizado = sanitizeString(servico || "", 100)
    const mensagemSanitizada = sanitizeString(mensagem || "", 500)

    // Validações
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

    // Verificar limite por telefone
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

    // Verificar horário duplicado (se fornecido)
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

    // Inserir com token único (tenta até 3x em caso de colisão raríssima)
    let token = ""
    let data: { id: number }[] | null = null
    let error: { code?: string; message: string } | null = null

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      token = gerarToken()
      const resultado = await supabase.from("agendamentos").insert({
        nome: nomeSanitizado,
        telefone: telefoneSanitizado,
        servico: servicoSanitizado,
        mensagem: mensagemSanitizada,
        status: "pendente",
        horario_agendado: horarioISO,
        forma_pagamento: "pendente",
        valor: PRECOS[servicoSanitizado] || 0,
        token
      }).select("id")
      data = resultado.data
      error = resultado.error
      if (!error) break
      if (error.code !== "23505") break
    }

    if (error) {
      if (error.code === "23505") {
        return new Response(JSON.stringify({ error: "Este horário acabou de ser reservado" }), { status: 409, headers: { "Content-Type": "application/json" } })
      }
      return new Response(JSON.stringify({ error: "Erro ao salvar", details: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ success: true, id: data?.[0]?.id, token }), { status: 201, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
