import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

function isValidToken(token: string): boolean {
  return /^[A-HJ-KM-NP-Z2-9]{8}$/.test(token || "")
}

function sanitize(value: string, max: number): string {
  return value.replace(/<[^>]*>/g, "").trim().slice(0, max)
}

// ===== Validação de comprovante PIX real =====
// Comprovante de verdade (texto copiado do app do banco) SEMPRE contém:
// 1. Data de HOJE (ou ontem, se pagou perto da meia-noite)
// 2. Valor pago igual ao do serviço
// 3. Identificador único (E2EID/UUID/NSU) com entropia
// Texto inventado não contém os 3 ao mesmo tempo — e o barbeiro ainda confere no extrato.
function extrairE2EID(texto: string): string | null {
  const uuid = texto.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  if (uuid) return uuid[0].toLowerCase()
  const e2eid = texto.match(/\bE[0-9A-Z]{28,40}\b/i)
  if (e2eid) return e2eid[0].toUpperCase()
  const nsu = texto.match(/\b[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}\b/)
  if (nsu) return nsu[0]
  return null
}

function temEntropia(s: string): boolean {
  const limpo = s.replace(/[^a-zA-Z0-9]/g, "")
  if (limpo.length < 20) return false
  if (new Set(limpo.toLowerCase()).size < 8) return false
  if (/^(.)\1+$/.test(limpo.toLowerCase())) return false
  return true
}

function validarComprovante(texto: string, valorEsperado: number, agora: Date): { ok: boolean; motivo?: string; e2eid?: string } {
  const t = texto.replace(/\s+/g, " ").trim()
  if (t.length < 30 || t.length > 2000) {
    return { ok: false, motivo: "Comprovante muito curto — cole o texto completo do comprovante PIX que o banco mostra." }
  }

  // 1. Data de hoje (ou ontem)
  const fmt = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    return {
      br: `${dd}/${mm}/${d.getFullYear()}`,
      brCurto: `${dd}/${mm}/${String(d.getFullYear()).slice(2)}`,
      iso: `${d.getFullYear()}-${mm}-${dd}`,
    }
  }
  const hoje = fmt(agora)
  const ontem = fmt(new Date(agora.getTime() - 24 * 60 * 60 * 1000))
  const temData =
    t.includes(hoje.br) || t.includes(hoje.brCurto) || t.includes(hoje.iso) ||
    t.includes(ontem.br) || t.includes(ontem.brCurto) || t.includes(ontem.iso)
  if (!temData) {
    return { ok: false, motivo: "O comprovante não mostra a data de hoje. Só vale comprovante pago hoje (ou ontem, se pagou antes da meia-noite)." }
  }

  // 2. Valor do serviço
  const valorBR = valorEsperado.toFixed(2).replace(".", ",")
  const valorPT = valorEsperado.toFixed(2)
  const temValor = valorEsperado === 0 || t.includes(valorBR) || t.includes(valorPT)
  if (!temValor) {
    return { ok: false, motivo: `O comprovante não mostra o valor do serviço (R$ ${valorBR}). Confira se pagou o valor certo.` }
  }

  // 3. Identificador único com entropia
  const e2eid = extrairE2EID(t)
  if (!e2eid) {
    return { ok: false, motivo: "Não encontrei o código único do comprovante (E2EID). Cole o texto completo que o banco mostra, incluindo o código." }
  }
  if (!temEntropia(e2eid)) {
    return { ok: false, motivo: "Código do comprovante inválido." }
  }

  return { ok: true, e2eid }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const { token, comprovante } = await req.json()
    const tokenLimpo = sanitize((token || "").toUpperCase(), 20)
    const comprovanteBruto = sanitize(comprovante || "", 2000)

    if (!isValidToken(tokenLimpo)) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: agAtual } = await supabase
      .from("agendamentos")
      .select("id, telefone, valor")
      .eq("token", tokenLimpo)
      .eq("status", "aguardando_pagamento")
      .limit(1)

    if (!agAtual || agAtual.length === 0) {
      return new Response(JSON.stringify({ error: "Agendamento não encontrado ou já confirmado" }), { status: 404, headers: { "Content-Type": "application/json" } })
    }

    const ag = agAtual[0]
    const valorEsperado = ag.valor || 0

    const validacao = validarComprovante(comprovanteBruto, valorEsperado, new Date())
    if (!validacao.ok) {
      return new Response(JSON.stringify({ error: validacao.motivo }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    }

    const e2eid = validacao.e2eid!

    // E2EID já usado? (reuso de comprovante)
    const { data: comprovanteUsado } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("comprovante", e2eid)
      .limit(1)

    if (comprovanteUsado && comprovanteUsado.length > 0) {
      return new Response(JSON.stringify({ error: "Este comprovante já foi utilizado" }), { status: 409, headers: { "Content-Type": "application/json" } })
    }

    // Telefone bloqueado por comprovante falso?
    const { data: falsoAnterior } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("telefone", ag.telefone)
      .eq("status", "cancelado")
      .eq("forma_pagamento", "pix")
      .eq("comprovante_rejeitado", true)
      .limit(1)

    if (falsoAnterior && falsoAnterior.length > 0) {
      return new Response(JSON.stringify({ error: "Não é possível usar PIX agora. Agende escolhendo pagar na hora ou fale com a gente no WhatsApp." }), { status: 403, headers: { "Content-Type": "application/json" } })
    }

    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "aguardando_verificacao", comprovante: e2eid, status_em: new Date().toISOString() })
      .eq("token", tokenLimpo)
      .eq("status", "aguardando_pagamento")

    if (error) {
      return new Response(JSON.stringify({ error: "Erro ao confirmar" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  } catch {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
