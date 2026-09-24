import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

// Notifica o barbeiro 1h antes de cada atendimento + expira PIX abandonado.
// Chamada por cron (a cada 5 min).
const TELEFONE_BARBEIRO = "5551981301035"

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const agora = new Date()
    let notificados = 0

    // ===== 1. Notificação 1h antes =====
    const janelaInicio = new Date(agora.getTime() + 55 * 60 * 1000).toISOString()
    const janelaFim = new Date(agora.getTime() + 65 * 60 * 1000).toISOString()

    const { data: proximos } = await supabase
      .from("agendamentos")
      .select("id, nome, servico, horario_agendado, forma_pagamento")
      .gte("horario_agendado", janelaInicio)
      .lte("horario_agendado", janelaFim)
      .in("status", ["pendente", "confirmado"])
      .eq("notificado_1h", false)

    if (proximos && proximos.length > 0) {
      const token = Deno.env.get("WHATSAPP_TOKEN")
      const telefoneId = Deno.env.get("WHATSAPP_PHONE_ID")

      for (const ag of proximos) {
        const hora = new Date(ag.horario_agendado).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
        const texto = `⏰ Cliente em 1h: ${ag.nome} — ${ag.servico} às ${hora}${ag.forma_pagamento === "pix" ? " (PIX)" : ""}`

        if (token && telefoneId) {
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
          if (resp.ok) notificados++
        } else {
          console.log(`[NOTIFICACAO] ${texto}`)
          notificados++
        }

        await supabase.from("agendamentos").update({ notificado_1h: true }).eq("id", ag.id)
      }
    }

    // ===== 2. Expira PIX abandonado =====
    // Aguardando pagamento por mais de 2h sem comprovante = cancela e libera o horário.
    // Evita que fake/abandono fique segurando vaga na agenda.
    const limite = new Date(agora.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const { data: expirados } = await supabase
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("status", "aguardando_pagamento")
      .lt("status_em", limite)
      .select("id")

    const expirou = expirados ? expirados.length : 0

    return new Response(JSON.stringify({ success: true, notificados, expirados: expirou }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
