import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

const SERVICOS_VALIDOS = [
  "Corte + Sobrancelha",
  "Barba",
  "Combo Completo",
  "Tatuagem"
]

const PRECOS: Record<string, number> = {
  "Corte + Sobrancelha": 35,
  "Barba": 30,
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
    const { nome, telefone, servico, mensagem, horario_agendado, forma_pagamento } = await req.json()

    // Sanitização
    const nomeSanitizado = sanitizeString(nome || "", 100)
    const telefoneSanitizado = sanitizeString(telefone || "", 15).replace(/\D/g, "")
    const servicoSanitizado = sanitizeString(servico || "", 100)
    const mensagemSanitizada = sanitizeString(mensagem || "", 500)
    const formaPagamento = forma_pagamento === "pix" ? "pix" : "pix_na_hora"

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

    // Verificar horário duplicado (se fornecido) — inclui aguardando_pagamento
    let horarioISO: string | null = null
    if (horario_agendado) {
      const dataHorario = new Date(horario_agendado)
      if (isNaN(dataHorario.getTime())) {
        return new Response(JSON.stringify({ error: "Data/horário inválido" }), { status: 400, headers: { "Content-Type": "application/json" } })
      }
      horarioISO = dataHorario.toISOString()

      // Validação de horário comercial — interpreta a string como horário de Brasília (-03:00)
      // Parse manual: a Edge Function roda em UTC, então não dá pra confiar no fuso do servidor
      const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(horario_agendado)
      if (!m) {
        return new Response(JSON.stringify({ error: "Data/horário inválido" }), { status: 400, headers: { "Content-Type": "application/json" } })
      }
      const anoH = +m[1], mesH = +m[2], diaH = +m[3], horaH = +m[4], minH = +m[5]
      const diaSemana = new Date(Date.UTC(anoH, mesH - 1, diaH)).getUTCDay() // 0=Dom ... 6=Sáb
      const minutos = horaH * 60 + minH
      const FECHAMENTO_SEX = 19 * 60 + 30, FECHAMENTO_SAB = 17 * 60

      if (diaSemana === 0 || diaSemana === 1) {
        return new Response(JSON.stringify({ error: "Fechado domingo e segunda. Agende de terça a sábado." }), { status: 400, headers: { "Content-Type": "application/json" } })
      }
      if (diaSemana >= 2 && diaSemana <= 5) {
        // Terça a sexta: 9h-12h e 14h-19:30h (pausa de almoço 12h-14h)
        const manha = minutos >= 9 * 60 && minutos < 12 * 60
        const tarde = minutos >= 14 * 60 && minutos < FECHAMENTO_SEX
        if (!manha && !tarde) {
          return new Response(JSON.stringify({ error: "Horário fora do expediente (ter-sex: 9h-12h e 14h-19h30, sem horários ao meio-dia)." }), { status: 400, headers: { "Content-Type": "application/json" } })
        }
      }
      if (diaSemana === 6 && (minutos < 9 * 60 || minutos >= FECHAMENTO_SAB)) {
        return new Response(JSON.stringify({ error: "Sábado: agende entre 9h e 17h." }), { status: 400, headers: { "Content-Type": "application/json" } })
      }

      const { data: horarioOcupado } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("horario_agendado", horarioISO)
        .in("status", ["pendente", "confirmado", "aguardando_pagamento"])
        .limit(1)

      if (horarioOcupado && horarioOcupado.length > 0) {
        return new Response(JSON.stringify({ error: "Este horário já está ocupado" }), { status: 409, headers: { "Content-Type": "application/json" } })
      }
    }

    // Auto-aceite: PIX na hora → já entra CONFIRMADO na agenda.
    // PIX agora → fica aguardando pagamento (vira confirmado ao verificar comprovante).
    const statusInicial = formaPagamento === "pix" ? "aguardando_pagamento" : "confirmado"

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
        status: statusInicial,
        status_em: new Date().toISOString(),
        horario_agendado: horarioISO,
        forma_pagamento: formaPagamento,
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
