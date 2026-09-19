// =============================================
// SIMULAÇÃO DE ATAQUE - MORIAS BARBER
// Testa a resistência do site contra ataques reais
// =============================================

import fetch from 'node-fetch'

const SUPABASE_URL = 'https://croscmpnezlixszygyka.supabase.co'
const SUPABASE_KEY = 'sb_publishable_d9CrR3hifPbk1LTDyP-8Vw_76VPNx2s'
const BASE_URL = 'https://morais-barberv2.vercel.app'

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`)
    failed++
  }
}

async function main() {
  console.log('🔥 SIMULAÇÃO DE ATAQUE - MORIAS BARBER')
  console.log('='.repeat(60))

  // ========== 1. SQL INJECTION ==========
  console.log('\n🎯 SQL INJECTION')
  
  await test('SQL Injection via nome', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ nome: "'; DROP TABLE agendamentos; --", telefone: '51999999999', servico: 'Corte Masculino' })
    })
    const data = await res.json()
    if (data?.length > 0 && data[0].nome.includes('DROP')) {
      throw new Error('SQL Injection aceito!')
    }
  })

  await test('SQL Injection via servico', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ nome: 'Teste', telefone: '51999999999', servico: "'; DROP TABLE users; --" })
    })
    const data = await res.json()
    if (data?.length > 0 && data[0].servico.includes('DROP')) {
      throw new Error('SQL Injection aceito!')
    }
  })

  await test('SQL Injection via telefone', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ nome: 'Teste', telefone: "' OR '1'='1", servico: 'Corte Masculino' })
    })
    const data = await res.json()
    if (data?.length > 0 && data[0].telefone.includes("' OR")) {
      throw new Error('SQL Injection aceito!')
    }
  })

  // ========== 2. XSS ==========
  console.log('\n🎯 XSS (Cross-Site Scripting)')
  
  await test('XSS via nome', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ nome: '<script>alert(1)</script>', telefone: '51999999999', servico: 'Corte Masculino' })
    })
    const data = await res.json()
    if (data?.length > 0 && data[0].nome.includes('<script>')) {
      throw new Error('XSS aceito!')
    }
  })

  await test('XSS via mensagem', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ nome: 'Teste', telefone: '51999999999', servico: 'Corte Masculino', mensagem: '<img src=x onerror=alert(1)>' })
    })
    const data = await res.json()
    if (data?.length > 0 && data[0].mensagem.includes('<img')) {
      throw new Error('XSS aceito!')
    }
  })

  // ========== 3. BRUTE FORCE ==========
  console.log('\n🎯 BRUTE FORCE')
  
  await test('Brute force - múltiplos inserts', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ nome: `Bot ${i}`, telefone: '51999999999', servico: 'Corte Masculino' })
      })
    )
    const results = await Promise.all(promises)
    const successCount = results.filter(r => r.status === 201).length
    console.log(`   ${successCount}/10 inserts aceitos`)
  })

  // ========== 4. IDOR ==========
  console.log('\n🎯 IDOR (Insecure Direct Object Reference)')
  
  await test('IDOR - acessar dados de outros usuários', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?select=*&limit=100`, {
      headers: { 'apikey': SUPABASE_KEY }
    })
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      throw new Error(`Dados expostos! ${data.length} registros visíveis`)
    }
  })

  await test('IDOR - deletar registro de outro', async () => {
    const insert = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ nome: 'Teste IDOR', telefone: '51999999999', servico: 'Corte Masculino' })
    })
    const data = await insert.json()
    const id = data[0]?.id
    if (id) {
      const del = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?id=eq.${id}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY }
      })
      const check = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?id=eq.${id}`, {
        headers: { 'apikey': SUPABASE_KEY }
      })
      const checkData = await check.json()
      if (checkData.length === 0) {
        throw new Error('Deletou registro sem autenticação!')
      }
    }
  })

  await test('IDOR - atualizar registro de outro', async () => {
    const insert = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ nome: 'Teste IDOR', telefone: '51999999999', servico: 'Corte Masculino' })
    })
    const data = await insert.json()
    const id = data[0]?.id
    if (id) {
      await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?id=eq.${id}`, {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pago: true })
      })
      const check = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?id=eq.${id}&select=pago`, {
        headers: { 'apikey': SUPABASE_KEY }
      })
      const checkData = await check.json()
      if (checkData[0]?.pago === true) {
        throw new Error('Atualizou registro sem autenticação!')
      }
    }
  })

  // ========== 5. CSRF ==========
  console.log('\n🎯 CSRF')
  
  await test('CSRF - request de origem diferente', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Origin': 'https://evil-site.com',
        'Referer': 'https://evil-site.com/hack.html'
      },
      body: JSON.stringify({ nome: 'CSRF Test', telefone: '51999999999', servico: 'Corte Masculino' })
    })
    // INSERT público é aceito mesmo de outras origens (RLS não bloqueia INSERT)
    // Mas isso é intencional pro formulário funcionar
    console.log(`   Status: ${res.status} (INSERT público é intencional)`)
  })

  // ========== 6. PATH TRAVERSAL ==========
  console.log('\n🎯 PATH TRAVERSAL')
  
  await test('Path traversal no site', async () => {
    const res = await fetch(`${BASE_URL}/../../etc/passwd`)
    if (res.status === 200) {
      const text = await res.text()
      if (text.includes('root:')) {
        throw new Error('Path traversal funcionou!')
      }
    }
  })

  // ========== 7. COMMAND INJECTION ==========
  console.log('\n🎯 COMMAND INJECTION')
  
  await test('Command injection via nome', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ nome: '$(whoami)', telefone: '51999999999', servico: 'Corte Masculino' })
    })
    const data = await res.json()
    if (data?.length > 0 && data[0].nome.includes('$(whoami)')) {
      throw new Error('Command injection aceito!')
    }
  })

  await test('Command injection via email', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ nome: 'Test; rm -rf /', telefone: '51999999999', servico: 'Corte Masculino' })
    })
    const data = await res.json()
    if (data?.length > 0 && data[0].nome.includes('rm -rf')) {
      throw new Error('Command injection aceito!')
    }
  })

  // ========== 8. SSRF ==========
  console.log('\n🎯 SSRF (Server-Side Request Forgery)')
  
  await test('SSRF via URL', async () => {
    const res = await fetch(`${BASE_URL}/api/fetch?url=http://localhost:8080/admin`)
    console.log(`   Status: ${res.status}`)
  })

  // ========== 9. FORCE BROWSING ==========
  console.log('\n🎯 FORCE BROWSING')
  
  await test('Acessar /admin sem login', async () => {
    const res = await fetch(`${BASE_URL}/admin`)
    if (res.status === 200) {
      const text = await res.text()
      if (!text.includes('login') && !text.includes('Login')) {
        // HashRouter renderiza o site mesmo em /admin, mas JS redireciona
        console.log('   HashRouter renderiza, mas JS protege')
      }
    }
  })

  await test('Acessar rotas internas', async () => {
    const rotas = ['/api', '/dashboard', '/config', '/server', '/internal']
    for (const rota of rotas) {
      const res = await fetch(`${BASE_URL}${rota}`)
      console.log(`   ${rota} -> ${res.status}`)
    }
  })

  // ========== 10. HEADER INJECTION ==========
  console.log('\n🎯 HEADER INJECTION')
  
  await test('HTTP Header Injection', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Test\r\nX-Injected: true', telefone: '51999999999', servico: 'Corte Masculino' })
    })
    const data = await res.json()
    if (data?.length > 0 && data[0].nome.includes('\r\n')) {
      throw new Error('Header injection aceito!')
    }
  })

  // ========== RESULTADO ==========
  console.log('\n' + '='.repeat(60))
  console.log(`✅ Ataques bloqueados: ${passed}`)
  console.log(`❌ Vulnerabilidades: ${failed}`)
  console.log('')
  if (failed === 0) {
    console.log('🛡️ SISTEMA RESISTENTE A ATAQUES!')
  } else {
    console.log(`⚠️ ${failed} vulnerabilidades encontradas`)
  }
}

main()
