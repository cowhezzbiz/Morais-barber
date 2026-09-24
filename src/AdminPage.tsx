import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'
import './App.css'

interface Agendamento {
  id: number
  nome: string
  telefone: string
  servico: string
  mensagem: string
  status: 'pendente' | 'confirmado' | 'cancelado' | 'aguardando_pagamento' | 'aguardando_verificacao'
  created_at: string
  horario_agendado: string | null
  pago: boolean
  forma_pagamento: string
  valor: number
  pago_em: string | null
  comprovante: string | null
}

const PRECOS: Record<string, number> = {
  'Corte + Sobrancelha': 35,
  'Barba': 30,
  'Combo Completo': 60,
  'Tatuagem': 0,
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'confirmado' | 'cancelado' | 'aguardando_pagamento' | 'aguardando_verificacao'>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [faturamento, setFaturamento] = useState({ diario: 0, mensal: 0, anual: 0 })
  const faturamentoCalculado = useRef(false)
  const [pushAtivo, setPushAtivo] = useState<boolean | null>(null)
  const [pushStatus, setPushStatus] = useState('')
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    telefone: '',
    servico: '',
    forma_pagamento: 'dinheiro',
    valor: '',
    horario_agendado: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    // Registra o service worker das notificações
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) fetchAgendamentos()
  }, [user])

  const fetchAgendamentos = async () => {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) {
      setAgendamentos(data || [])
      if (data) calcularFaturamento(data)
    }
  }

  const calcularFaturamento = async (dados: Agendamento[]) => {
    if (faturamentoCalculado.current) return
    
    const agora = new Date()
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    const mes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    const ano = new Date(agora.getFullYear(), 0, 1)

    // Usa pago_em (quando foi pago) com fallback pra created_at
    const dataPagamento = (a: Agendamento) => new Date(a.pago_em || a.created_at)

    const diario = dados.filter(a => a.pago === true && dataPagamento(a) >= hoje)
    const mensal = dados.filter(a => a.pago === true && dataPagamento(a) >= mes)
    const anual = dados.filter(a => a.pago === true && dataPagamento(a) >= ano)

    setFaturamento({
      diario: diario.reduce((total, a) => total + (PRECOS[a.servico] || 0), 0),
      mensal: mensal.reduce((total, a) => total + (PRECOS[a.servico] || 0), 0),
      anual: anual.reduce((total, a) => total + (PRECOS[a.servico] || 0), 0)
    })
    faturamentoCalculado.current = true
  }

  const resetarFaturamento = () => {
    faturamentoCalculado.current = false
    setFaturamento({ diario: 0, mensal: 0, anual: 0 })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email ou senha incorretos.')
  }

  const handleLogout = async () => { await supabase.auth.signOut() }

  // ===== Notificações push (barbeiro recebe no celular) =====
  const VAPID_PUBLIC_KEY = 'BOX77pKob48hz25LCPGfbfCGHWk3FtwwwRY4TBt-V8guW2cjqFakhyXaKPUH9_nDt4L-xpJyyS-ObLBvqLBt238'

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(base64)
    const output = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
    return output
  }

  // Checa no load se já tem push ativo neste navegador
  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setPushAtivo(!!sub))
      .catch(() => setPushAtivo(false))
  }, [user])

  const ativarPush = async () => {
    setPushStatus('')
    try {
      const permissao = await Notification.requestPermission()
      if (permissao !== 'granted') {
        setPushStatus('Permissão negada. Habilite notificações nas configurações do navegador.')
        return
      }
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        })
      }
      // Salva a inscrição no banco (Edge Function envia praqui)
      const resp = await fetch('https://croscmpnezlixszygyka.supabase.co/rest/v1/push_inscricoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Prefer': 'resolution=ignore-duplicates',
        },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))) : '',
          auth: sub.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))) : '',
        }),
      })
      if (!resp.ok) throw new Error('Falha ao salvar inscrição')
      setPushAtivo(true)
      setPushStatus('✅ Notificações ativadas! Você receberá alerta a cada alteração na agenda.')
    } catch (err) {
      setPushStatus(`Erro ao ativar: ${err instanceof Error ? err.message : 'desconhecido'}`)
    }
  }

  const testarPush = async () => {
    setPushStatus('Enviando teste...')
    try {
      const resp = await fetch('https://croscmpnezlixszygyka.supabase.co/functions/v1/push-agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ titulo: '🔔 Teste Morais Barber', corpo: 'Notificações funcionando! A agenda avisa quando mudar.' }),
      })
      const res = await resp.json()
      setPushStatus(res.enviados > 0 ? '✅ Teste enviado! Olha teu celular/PC.' : 'Nenhuma inscrição ativa ainda — ativa primeiro.')
    } catch {
      setPushStatus('Erro ao enviar teste.')
    }
  }

  const updateStatus = async (id: number, status: string) => {
    await supabase.from('agendamentos').update({ status }).eq('id', id)
    fetchAgendamentos()
  }

  // Barbeiro confirmou o PIX verificado → confirma e marca pago
  const aprovarComprovante = async (id: number) => {
    await supabase.from('agendamentos').update({
      status: 'confirmado',
      pago: true,
      pago_em: new Date().toISOString()
    }).eq('id', id)
    faturamentoCalculado.current = false
    fetchAgendamentos()
  }

  // Barbeiro rejeitou o comprovante → cancela e bloqueia o telefone de usar PIX
  const rejeitarComprovante = async (id: number) => {
    if (!confirm('Comprovante NÃO bate com o extrato? O cliente será bloqueado de pagar com PIX.')) return
    await supabase.from('agendamentos').update({
      status: 'cancelado',
      comprovante_rejeitado: true
    }).eq('id', id)
    fetchAgendamentos()
  }

  const togglePagamento = async (id: number, atual: boolean) => {
    const novoValor = !atual
    // Grava quando foi pago (ou limpa se desmarcou)
    const updateData: Record<string, unknown> = { pago: novoValor }
    if (novoValor) updateData.pago_em = new Date().toISOString()
    else updateData.pago_em = null

    await supabase.from('agendamentos').update(updateData).eq('id', id)
    faturamentoCalculado.current = false
    fetchAgendamentos()
  }

  const deleteAgendamento = async (id: number) => {
    if (!confirm('Excluir?')) return
    await supabase.from('agendamentos').delete().eq('id', id)
    fetchAgendamentos()
  }

  const adicionarCliente = async () => {
    if (!novoCliente.nome || !novoCliente.telefone || !novoCliente.servico || !novoCliente.horario_agendado) {
      alert('Preencha tudo, incluindo o horário!')
      return
    }
    try {
      const { error } = await supabase.from('agendamentos').insert({
        nome: novoCliente.nome,
        telefone: novoCliente.telefone.replace(/\D/g, ''),
        servico: novoCliente.servico,
        status: 'confirmado',
        pago: novoCliente.forma_pagamento !== 'pendente',
        pago_em: novoCliente.forma_pagamento !== 'pendente' ? new Date().toISOString() : null,
        forma_pagamento: novoCliente.forma_pagamento,
        valor: parseFloat(novoCliente.valor) || 0,
        horario_agendado: novoCliente.horario_agendado
      })
      if (error) {
        alert('Erro ao salvar: ' + error.message)
        return
      }
      setModalAberto(false)
      setNovoCliente({ nome: '', telefone: '', servico: '', forma_pagamento: 'dinheiro', valor: '', horario_agendado: '' })
      fetchAgendamentos()
    } catch (err: unknown) {
      alert('Erro inesperado: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const enviarWhatsApp = (ag: Agendamento, tipo: 'lembrete' | 'confirmacao') => {
    const msg = tipo === 'lembrete' 
      ? `Olá ${ag.nome}! 👋\n\nLembrete: ${ag.servico} na Morais Barber.\n\nTe esperamos! 😊`
      : `Olá ${ag.nome}! ✅\n\nAgendamento confirmado: ${ag.servico}.\n\nTe esperamos! 😊`
    window.open(`https://wa.me/55${ag.telefone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const countStatus = (s: string) => agendamentos.filter(a => a.status === s).length
  // Ordena: agendamentos SEM horário por último; com horário, do mais PRÓXIMO pro mais distante.
  // Depois agrupa por dia (cabeçalho "Quinta, 25/09") na renderização.
  const ordenarAgendamentos = (lista: Agendamento[]): Agendamento[] => {
    return [...lista].sort((a, b) => {
      const ha = a.horario_agendado ? new Date(a.horario_agendado).getTime() : null
      const hb = b.horario_agendado ? new Date(b.horario_agendado).getTime() : null
      if (ha === null && hb === null) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (ha === null) return 1
      if (hb === null) return -1
      return ha - hb
    })
  }

  const filtrados = ordenarAgendamentos(filtro === 'todos' ? agendamentos : agendamentos.filter(a => a.status === filtro))

  // Agrupa por dia: { chave: '2026-09-25', rotulo: 'Quinta, 25/09', itens: [...] }
  const agrupados = (() => {
    const grupos: { chave: string; rotulo: string; itens: Agendamento[] }[] = []
    for (const ag of filtrados) {
      if (!ag.horario_agendado) {
        const gSemData = grupos.find(g => g.chave === 'sem-data')
        if (gSemData) gSemData.itens.push(ag)
        else grupos.push({ chave: 'sem-data', rotulo: 'A combinar', itens: [ag] })
        continue
      }
      const d = new Date(ag.horario_agendado)
      const chave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      const hoje = new Date()
      const ehHoje = d.toDateString() === hoje.toDateString()
      const amanha = new Date(hoje.getTime() + 86400000)
      const ehAmanha = d.toDateString() === amanha.toDateString()
      const rotulo = ehHoje ? '🔥 Hoje' : ehAmanha ? '➡️ Amanhã' : `${dias[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      const g = grupos.find(x => x.chave === chave)
      if (g) g.itens.push(ag)
      else grupos.push({ chave, rotulo, itens: [ag] })
    }
    return grupos
  })()

  if (loading) return <div className="admin-container"><div className="admin-loading">Carregando...</div></div>

  if (!user) {
    return (
      <div className="admin-container">
        <div className="admin-login-card">
          <div className="admin-header">
            <span className="admin-icone">🔐</span>
            <h2>Área do Administrador</h2>
            <p>Faça login para acessar</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-grupo"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div className="form-grupo"><label>Senha</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            {error && <p className="erro-msg">{error}</p>}
            <button type="submit" className="btn btn-primary btn-full">Entrar</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-header-bar">
        <div><h2>📋 Painel de Agendamentos</h2><p>Bem-vindo, {user.email}</p></div>
        <div className="admin-header-acoes">
          {!pushAtivo && (
            <button className="btn btn-notificacao" onClick={ativarPush} title="Receber alerta no celular quando a agenda mudar">🔔 Ativar notificações</button>
          )}
          {pushAtivo && (
            <button className="btn btn-notificacao-ok" onClick={testarPush} title="Mandar notificação de teste">🔔 Notificações ativas — testar</button>
          )}
          <button className="btn btn-primary" onClick={() => setModalAberto(true)}>+ Adicionar Cliente</button>
          <button className="btn btn-outline" onClick={handleLogout}>Sair</button>
        </div>
      </div>
      {pushStatus && <div className="push-status">{pushStatus}</div>}

      <div className="admin-stats">
        <div className="admin-stat"><span className="stat-num">{agendamentos.length}</span><span className="stat-label">Total</span></div>
        <div className="admin-stat"><span className="stat-num stat-amarelo">{countStatus('pendente')}</span><span className="stat-label">Pendentes</span></div>
        <div className="admin-stat"><span className="stat-num stat-verde">{countStatus('confirmado')}</span><span className="stat-label">Confirmados</span></div>
        <div className="admin-stat"><span className="stat-num stat-vermelho">{countStatus('cancelado')}</span><span className="stat-label">Cancelados</span></div>
      </div>

      <div className="faturamento-container">
        <h3 className="faturamento-titulo">💰 Faturamento</h3>
        <div className="faturamento-cards">
          <div className="faturamento-card">
            <span className="faturamento-label">Hoje</span>
            <span className="faturamento-valor">R$ {faturamento.diario.toFixed(2).replace('.', ',')}</span>
            <button className="btn-reset-faturamento" onClick={resetarFaturamento}>🗑 Zerar</button>
          </div>
          <div className="faturamento-card">
            <span className="faturamento-label">Este Mês</span>
            <span className="faturamento-valor">R$ {faturamento.mensal.toFixed(2).replace('.', ',')}</span>
            <button className="btn-reset-faturamento" onClick={resetarFaturamento}>🗑 Zerar</button>
          </div>
          <div className="faturamento-card">
            <span className="faturamento-label">Este Ano</span>
            <span className="faturamento-valor">R$ {faturamento.anual.toFixed(2).replace('.', ',')}</span>
            <button className="btn-reset-faturamento" onClick={resetarFaturamento}>🗑 Zerar</button>
          </div>
        </div>
      </div>

      <div className="admin-filtros">
        {(['todos', 'pendente', 'confirmado', 'cancelado', 'aguardando_verificacao', 'aguardando_pagamento'] as const).map(f => (
          <button key={f} className={`btn-filtro ${filtro === f ? 'ativo' : ''}`} onClick={() => setFiltro(f)}>
            {f === 'aguardando_pagamento' ? 'PIX não pago'
             : f === 'aguardando_verificacao' ? 'Verificar PIX 🔍'
             : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="admin-vazio"><span>📭</span><p>Nenhum agendamento.</p></div>
      ) : (
        <div className="admin-tabela">
          {agrupados.map(grupo => (
            <div key={grupo.chave} className="grupo-dia">
              <div className="grupo-dia-header">
                <span>{grupo.rotulo}</span>
                <small>{grupo.itens.length} {grupo.itens.length === 1 ? 'atendimento' : 'atendimentos'}</small>
              </div>
              <div className="tabela-header">
                <span>Nome</span><span>Telefone</span><span>Serviço</span><span>Hora</span><span>Pgto</span><span>Status</span><span>Ações</span>
              </div>
              {grupo.itens.map(ag => (
                <div key={ag.id} className={`tabela-linha ${ag.status}`}>
                  <span className="celula-nome"><strong>{ag.nome}</strong>{ag.mensagem && <small>{ag.mensagem}</small>}</span>
                  <span className="celula-telefone">{ag.telefone}</span>
                  <span className="celula-servico">{ag.servico}</span>
                  <span className="celula-horario">{ag.horario_agendado ? new Date(ag.horario_agendado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                  <span className="celula-pgto">
                    <button className={`btn-pagamento ${ag.pago ? 'pago' : 'pendente'}`} onClick={() => togglePagamento(ag.id, ag.pago)}>
                      {ag.pago ? '💰' : '⏳'}
                    </button>
                  </span>
                  <span className="celula-status">
                    <span className={`badge ${ag.status}`}>
                      {ag.status === 'pendente' ? '⏳' : ag.status === 'confirmado' ? '✅' : ag.status === 'aguardando_pagamento' ? '📱' : ag.status === 'aguardando_verificacao' ? '🔍' : '❌'}
                      {ag.status === 'aguardando_pagamento' ? 'PIX não pago' : ag.status === 'aguardando_verificacao' ? 'Verificar PIX' : ag.status}
                    </span>
                  </span>
                  <span className="celula-acoes">
                    {ag.status === 'aguardando_verificacao' && (
                      <div className="verificacao-box">
                        <code className="comprovante-mostra" title={ag.comprovante || ''}>
                          {ag.comprovante ? `${ag.comprovante.slice(0, 18)}...` : '—'}
                        </code>
                        <button className="btn-acao confirmar" onClick={() => aprovarComprovante(ag.id)} title="Confere com o extrato — confirmar e marcar pago">✓</button>
                        <button className="btn-acao cancelar" onClick={() => rejeitarComprovante(ag.id)} title="Comprovante não bate — cancelar e bloquear PIX">✕</button>
                      </div>
                    )}
                    {ag.status === 'aguardando_pagamento' && (
                      <>
                        <button className="btn-acao confirmar" onClick={() => updateStatus(ag.id, 'confirmado')} title="Confirmar pagamento recebido">✓</button>
                        <button className="btn-acao cancelar" onClick={() => updateStatus(ag.id, 'cancelado')} title="Cancelar">✕</button>
                      </>
                    )}
                    {ag.status === 'pendente' && (
                      <>
                        <button className="btn-acao confirmar" onClick={() => updateStatus(ag.id, 'confirmado')} title="Confirmar">✓</button>
                        <button className="btn-acao whatsapp" onClick={() => enviarWhatsApp(ag, 'confirmacao')} title="Confirmar via WhatsApp">💬</button>
                        <button className="btn-acao cancelar" onClick={() => updateStatus(ag.id, 'cancelado')} title="Cancelar">✕</button>
                      </>
                    )}
                    {ag.status === 'confirmado' && (
                      <button className="btn-acao whatsapp" onClick={() => enviarWhatsApp(ag, 'lembrete')} title="Enviar lembrete">💬</button>
                    )}
                    <button className="btn-acao excluir" onClick={() => deleteAgendamento(ag.id)} title="Excluir">🗑</button>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>➕ Adicionar Cliente</h3>
            <div className="form-grupo"><label>Nome</label><input type="text" value={novoCliente.nome} onChange={e => setNovoCliente({...novoCliente, nome: e.target.value})} /></div>
            <div className="form-grupo"><label>Telefone</label><input type="tel" value={novoCliente.telefone} onChange={e => setNovoCliente({...novoCliente, telefone: e.target.value})} /></div>
            <div className="form-grupo"><label>Serviço</label>
              <select value={novoCliente.servico} onChange={e => setNovoCliente({...novoCliente, servico: e.target.value})}>
                <option value="">Selecione...</option>
                <option value="Corte + Sobrancelha">Corte + Sobrancelha — R$ 35</option>
                <option value="Barba">Barba — R$ 30</option>
                <option value="Combo Completo">Combo Completo — R$ 60</option>
                <option value="Tatuagem">Tatuagem — Consultar</option>
              </select>
            </div>
            <div className="form-grupo"><label>Pagamento</label>
              <select value={novoCliente.forma_pagamento} onChange={e => setNovoCliente({...novoCliente, forma_pagamento: e.target.value})}>
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="pix">📱 PIX</option>
                <option value="cartao">💳 Cartão</option>
                <option value="pendente">⏳ Pendente</option>
              </select>
            </div>
            <div className="form-grupo"><label>Valor (R$)</label><input type="text" value={novoCliente.valor} onChange={e => setNovoCliente({...novoCliente, valor: e.target.value})} placeholder="45" /></div>
            <div className="form-grupo"><label>Data/Hora</label><input type="datetime-local" value={novoCliente.horario_agendado} onChange={e => setNovoCliente({...novoCliente, horario_agendado: e.target.value})} /></div>
            <div className="modal-botoes">
              <button className="btn btn-primary" onClick={adicionarCliente}>Salvar</button>
              <button className="btn btn-outline" onClick={() => setModalAberto(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
