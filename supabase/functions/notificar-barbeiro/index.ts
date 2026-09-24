import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

// Notifica o barbeiro 1h antes de cada atendimento confirmado/pendente.
// Chamada por cron (a cada 5 min). Usa WhatsApp Cloud API se WHATSAPP_TOKEN
// configurado; senão registra no log (fallback silencioso).
const TELEFONE_BARBEIRO = "5551981301035"

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const agora = new Date()
    // Janela: agendamentos entre 55 e 65 minutos a partir de agora
    const janelaInicio = new Date(agora.getTime() + 55 * 60 * 1000).toISOString()
    const janelaFim = new Date(agora.getTime() + 65 * 60 * 1000).toISOString()

    const { data: proximos } = await supabase
      .from("agendamentos")
      .select("id, nome, servico, horario_agendado, forma_pagamento")
      .gte("horario_agendado", janelaInicio)
      .lte("horario_agendado", janelaFim)
      .in("status", ["pendente", "confirmado"])
      .eq("notificado_1h", false)

    if (!proximos || proximos.length === 0) {
      return new Response(JSON.stringify({ success: true, notificados: 0 }), { status: 200, headers: { "Content-Type": "application/json" } })
    }

    const token = Deno.env.get("WHATSAPP_TOKEN")
    const telefoneId = Deno.env.get("WHATSAPP_PHONE_ID")
    let enviados = 0
    let erros = 0

    for (const ag of proximos) {
      const hora = new Date(ag.horario_agendado).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
      const texto = `⏰ Cliente em 1h: ${ag.nome} — ${ag.servico} às ${hora}${ag.forma_pagamento === "pix" ? " (PIX)" : ""}`

      if (token && telefoneId) {
        // WhatsApp Cloud API (Meta)
        const resp = await fetch(`https://graph.facebook.com/v20.0/${telefoneId}/messages`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: TELEFONE_BARBEIRO,
            type: "text",
            text: { body: texto },
          }),
        })
        if (resp.ok) enviados++
        else erros++
      } else {
        // Sem token configurado: registra no log da função (visível no dashboard)
        console.log(`[NOTIFICACAO] ${texto}`)
        enviados++
      }

      // Marca como notificado (idempotente — não reenvia)
      await supabase.from("agendamentos").update({ notificado_1h: true }).eq("id", ag.id)
    }

    return new Response(JSON.stringify({ success: true, notificados: enviados, erros }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
