import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 11
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } })
  }

  try {
    const { telefone } = await req.json()
    const telefoneFormatado = (telefone || "").replace(/\D/g, "")

    if (!isValidPhone(telefoneFormatado)) {
      return new Response(JSON.stringify({ error: "Telefone inválido" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data, error } = await supabase
      .from("agendamentos")
      .select("id, nome, telefone, servico, status, horario_agendado, pago, forma_pagamento, valor")
      .eq("telefone", telefoneFormatado)
      .order("horario_agendado", { ascending: true })
      .limit(10)

    if (error) {
      return new Response(JSON.stringify({ error: "Erro ao buscar" }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ agendamentos: data || [] }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
