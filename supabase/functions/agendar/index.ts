import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

// Preços padrão - aceita qualquer serviço que o frontend envie
const PRECOS: Record<string, number> = {
  "Corte": 35,
  "Barba": 30,
  "Combo Completo": 60,
  "Tatuagem": 0,
  "Corte + Barba": 60,
  "Corte + Sobrancelha": 35,
  "Sobrancelha": 15,
  "Pigmentação": 80,
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

// Resposta de erro padronizada - SEMPRE retorna JSON válido com CORS
function erro(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  })
}

// Resposta de sucesso padronizada
function sucesso(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  })
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    })
  }

  // Só aceita POST
  if (req.method !== "POST") {
    return erro("Método não permitido", 405)
  }

  try {
    // Parse do JSON com fallback seguro
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return erro("Dados inválidos")
    }

    // Extrai e sanitiza campos com fallback seguro
    const nome = sanitizeString(String(body.nome || ""), 100)
    const telefone = sanitizeString(String(body.telefone || ""), 15).replace(/\D/g, "")
    const servico = sanitizeString(String(body.servico || ""), 100)
    const mensagem = sanitizeString(String(body.mensagem || ""), 500)
    const horario_agendado = body.horario_agendado ? String(body.horario_agendado) : null
    const forma_pagamento = body.forma_pagamento === "pix" ? "pix" : "pix_na_hora"

    // Validações básicas
    if (!nome || nome.length < 2) return erro("Nome inválido")
    if (!isValidPhone(telefone)) return erro("Telefone inválido")
    if (!servico) return erro("Serviço inválido")

    // Verifica variáveis de ambiente
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("SUPABASE_URL ou SERVICE_ROLE_KEY não configuradas")
      return erro("Erro de configuração do servidor", 500)
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Verificar limite por telefone (não bloqueia se der erro)
    try {
      const { data: existentes, error: countErr } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("telefone", telefone)
        .in("status", ["pendente", "confirmado"])
        .limit(MAX_AGENDAMENTOS_POR_TELEFONE + 1)

      if (countErr) {
        console.error("Erro ao verificar agendamentos:", countErr.message)
      } else if (existentes && existentes.length >= MAX_AGENDAMENTOS_POR_TELEFONE) {
        return erro("Você já tem 2 agendamentos ativos", 403)
      }
    } catch (e) {
      console.error("Erro ao verificar limite:", e)
    }

    // Processa horário se fornecido
    let horarioISO: string | null = null
    if (horario_agendado) {
      try {
        const dataHorario = new Date(horario_agendado)
        if (isNaN(dataHorario.getTime())) return erro("Data/horário inválido")
        horarioISO = dataHorario.toISOString()

        const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(horario_agendado)
        if (!m) return erro("Data/horário inválido")

        const anoH = +m[1], mesH = +m[2], diaH = +m[3], horaH = +m[4], minH = +m[5]
        const diaSemana = new Date(Date.UTC(anoH, mesH - 1, diaH)).getUTCDay()
        const minutos = horaH * 60 + minH
        const FECHAMENTO_SEX = 19 * 60 + 30, FECHAMENTO_SAB = 17 * 60

        const agoraSP = new Date(Date.now() - 3 * 60 * 60 * 1000)
        const dataPedido = new Date(Date.UTC(anoH, mesH - 1, diaH, horaH, minH))
        if (dataPedido.getTime() <= agoraSP.getTime()) {
          return erro("Não é possível agendar em datas que já passaram.")
        }

        if (diaSemana === 0 || diaSemana === 1) {
          return erro("Fechado domingo e segunda. Agende de terça a sábado.")
        }

        if (diaSemana >= 2 && diaSemana <= 5) {
          const manha = minutos >= 9 * 60 && minutos < 12 * 60
          const tarde = minutos >= 14 * 60 && minutos < FECHAMENTO_SEX
          if (!manha && !tarde) {
            return erro("Horário fora do expediente (ter-sex: 9h-12h e 14h-19h30).")
          }
        }

        if (diaSemana === 6 && (minutos < 9 * 60 || minutos >= FECHAMENTO_SAB)) {
          return erro("Sábado: agende entre 9h e 17h.")
        }

        if (diaSemana === 6 && minutos >= 12 * 60 && minutos < 13 * 60 + 30) {
          return erro("Sábado: sem agendamentos entre 12h e 13h30 (pausa de almoço).")
        }

        try {
          const { data: ocupado } = await supabase
            .from("agendamentos")
            .select("id")
            .eq("horario_agendado", horarioISO)
            .in("status", ["pendente", "confirmado", "aguardando_pagamento"])
            .limit(1)

          if (ocupado && ocupado.length > 0) {
            return erro("Este horário já está ocupado", 409)
          }
        } catch (e) {
          console.error("Erro ao verificar horário ocupado:", e)
        }
      } catch (e) {
        console.error("Erro ao processar horário:", e)
        return erro("Data/horário inválido")
      }
    }

    const statusInicial = forma_pagamento === "pix" ? "aguardando_pagamento" : "confirmado"

    let token = ""
    let data: { id: number }[] | null = null
    let lastError: { code?: string; message: string } | null = null

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        token = gerarToken()
        const resultado = await supabase.from("agendamentos").insert({
          nome,
          telefone,
          servico,
          mensagem,
          status: statusInicial,
          status_em: new Date().toISOString(),
          horario_agendado: horarioISO,
          forma_pagamento: forma_pagamento,
          valor: PRECOS[servico] || 0,
          token
        }).select("id")

        data = resultado.data
        lastError = resultado.error
        if (!resultado.error) break
        if (resultado.error.code !== "23505") break
      } catch (e) {
        console.error(`Tentativa ${tentativa + 1} falhou:`, e)
        lastError = { message: e instanceof Error ? e.message : "Erro desconhecido" }
      }
    }

    if (lastError) {
      if (lastError.code === "23505") {
        return erro("Este horário acabou de ser reservado", 409)
      }
      console.error("Erro ao salvar:", lastError.message)
      return erro("Erro ao salvar. Tente novamente.", 500)
    }

    return sucesso({ success: true, id: data?.[0]?.id, token })
  } catch (err) {
    console.error("Erro não capturado:", err)
    return erro("Erro inesperado. Tente novamente.", 500)
  }
})
