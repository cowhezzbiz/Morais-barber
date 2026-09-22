import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

function isValidToken(token: string): boolean {
  return /^[A-HJ-KM-NP-Z2-9]{8}$/.test(token || "")
}

// Detecta padrões de comprovante FAKE:
// - tudo igual (aaaa...), sequência (abc.../123...), poucos caracteres únicos
function isFakePattern(comp: string): boolean {
  const c = comp.toLowerCase()
  if (/^(.)\1+$/.test(c)) return true // aaaaaaaaaa
  const s = c.replace(/-/g, "")
  let sequencial = true
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1)
    if (d !== 1 && d !== -1) { sequencial = false; break }
  }
  if (sequencial && s.length > 10) return true // abcdefg / 1234567
  // Poucos caracteres únicos = texto digitado à mão, não ID de banco
  if (new Set(s).size < 8) return true
  // Só dígitos: comprovante real (NSU/E2EID numérico) tem 20+ dígitos bem distribuídos.
  // Sequência de teclado ou dígitos repetidos em ciclo = fake
  if (/^\d+$/.test(s)) {
    if (new Set(s).size < 12) return true
    // Detecta ciclo: "12345678901234567890..." repete o bloco 1234567890
    if (s.length >= 20 && new Set(s.slice(0, 10)).size <= 10 && s.slice(10) === s.slice(0, s.length - 10)) return true
  }
  return false
}

function isValidComprovante(comp: string): boolean {
  if (!/^[A-Za-z0-9\-]{20,60}$/.test(comp || "")) return false
  if (isFakePattern(comp)) return false
  return true
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
      return new Response(JSON.stringify({ error: "Comprovante inválido. Copie o código exato do comprovante PIX no app do seu banco." }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // 1. Comprovante já usado? (fraude)
    const { data: comprovanteUsado } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("comprovante", comprovanteLimpo)
      .limit(1)

    if (comprovanteUsado && comprovanteUsado.length > 0) {
      return new Response(JSON.stringify({ error: "Este comprovante já foi utilizado" }), { status: 409, headers: { "Content-Type": "application/json" } })
    }

    // 2. Pega o agendamento pra checar o telefone
    const { data: agAtual } = await supabase
      .from("agendamentos")
      .select("id, telefone")
      .eq("token", tokenLimpo)
      .eq("status", "aguardando_pagamento")
      .limit(1)

    if (!agAtual || agAtual.length === 0) {
      return new Response(JSON.stringify({ error: "Agendamento não encontrado ou já confirmado" }), { status: 404, headers: { "Content-Type": "application/json" } })
    }

    const telefone = agAtual[0].telefone

    // 3. Telefone já teve comprovante falo rejeitado? Bloqueia PIX
    const { data: falsoAnterior } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("telefone", telefone)
      .eq("status", "cancelado")
      .eq("forma_pagamento", "pix")
      .eq("comprovante_rejeitado", true)
      .limit(1)

    if (falsoAnterior && falsoAnterior.length > 0) {
      return new Response(JSON.stringify({ error: "Não é possível usar PIX agora. Agende escolhendo pagar na hora ou fale com a gente no WhatsApp." }), { status: 403, headers: { "Content-Type": "application/json" } })
    }

    // 4. Move pra verificação com o comprovante
    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "aguardando_verificacao", comprovante: comprovanteLimpo })
      .eq("token", tokenLimpo)
      .eq("status", "aguardando_pagamento")

    if (error) {
      return new Response(JSON.stringify({ error: "Erro ao confirmar" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
