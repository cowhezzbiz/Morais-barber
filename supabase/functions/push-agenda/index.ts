import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

// Envia push notification para todas as inscrições salvas (o barbeiro no admin).
// Chamada pelo trigger do banco quando a agenda muda, ou manualmente.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const { titulo, corpo } = await req.json().catch(() => ({ titulo: "Morais Barber", corpo: "A agenda foi atualizada" }))

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Busca inscrições push ativas
    const { data: inscricoes, error } = await supabase
      .from("push_inscricoes")
      .select("*")
      .eq("ativo", true)

    if (error) {
      return new Response(JSON.stringify({ error: "Erro ao buscar inscrições" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    if (!inscricoes || inscricoes.length === 0) {
      return new Response(JSON.stringify({ success: true, enviados: 0, motivo: "sem inscricoes" }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    }

    // Chaves VAPID (env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:moraisbarbershop@gmail.com"

    // web-push em Deno: usa a lib via esm.sh
    const { default: webpush } = await import("https://esm.sh/web-push@3.6.7")

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    let enviados = 0
    let falhas = 0
    const idsParaRemover: number[] = []

    for (const insc of inscricoes) {
      const payload = JSON.stringify({
        title: titulo || "Morais Barber",
        body: corpo || "A agenda foi atualizada",
        url: "https://morais-barberv2.vercel.app/#/admin.morais",
      })
      try {
        await webpush.sendNotification(
          { endpoint: insc.endpoint, keys: { p256dh: insc.p256dh, auth: insc.auth } },
          payload,
          { TTL: 3600, urgency: "high" }
        )
        enviados++
      } catch (err: unknown) {
        falhas++
        const status = (err as { statusCode?: number })?.statusCode
        // 404/410 = inscrição expirou, remove pra não ficar mandando pro vazio
        if (status === 404 || status === 410) {
          idsParaRemover.push(insc.id)
        }
      }
    }

    // Limpa inscrições mortas
    if (idsParaRemover.length > 0) {
      await supabase.from("push_inscricoes").update({ ativo: false }).in("id", idsParaRemover)
    }

    return new Response(JSON.stringify({ success: true, enviados, falhas }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  } catch {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
