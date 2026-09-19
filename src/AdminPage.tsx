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
  status: 'pendente' | 'confirmado' | 'cancelado'
  created_at: string
  horario_agendado: string | null
  pago: boolean
  forma_pagamento: string
  valor: number
}

const PRECOS: Record<string, number> = {
  'Corte Masculino': 45,
  'Barba': 30,
  'Corte + Barba': 65,
  'Sobrancelha': 15,
  'Pigmentação': 50,
  'Hidratação Capilar': 35,
  'Tatuagem': 0,
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'confirmado' | 'cancelado'>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [faturamento, setFaturamento] = useState({ diario: 0, mensal: 0, anual: 0 })
  const faturamentoCalculado = useRef(false)
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email ou senha incorretos.')
  }

  const handleLogout = async () => { await supabase.auth.signOut() }

  const updateStatus = async (id: number, status: string) => {
    await supabase.from('agendamentos').update({ status }).eq('id', id)
    fetchAgendamentos()
  }

  const togglePagamento = async (id: number, atual: boolean) => {
    await supabase.from('agendamentos').update({ pago: !atual }).eq('id', id)
    fetchAgendamentos()
  }

  const deleteAgendamento = async (id: number) => {
    if (!confirm('Excluir?')) return
    await supabase.from('agendamentos').delete().eq('id', id)
    fetchAgendamentos()
  }

  const calcularFaturamento = async (dados: Agendamento[]) => {
    if (faturamentoCalculado.current) return
    
    const agora = new Date()
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    const mes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    const ano = new Date(agora.getFullYear(), 0, 1)

    const diario = dados.filter(a => a.status === 'confirmado' && new Date(a.created_at) >= hoje)
    const mensal = dados.filter(a => a.status === 'confirmado' && new Date(a.created_at) >= mes)
    const anual = dados.filter(a => a.status === 'confirmado' && new Date(a.created_at) >= ano)

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

  const adicionarCliente = async () => {
    if (!novoCliente.nome || !novoCliente.telefone || !novoCliente.servico) {
      alert('Preencha tudo!')
      return
    }
    await supabase.from('agendamentos').insert({
      nome: novoCliente.nome,
      telefone: novoCliente.telefone.replace(/\D/g, ''),
      servico: novoCliente.servico,
      status: 'confirmado',
      pago: novoCliente.forma_pagamento !== 'pendente',
      forma_pagamento: novoCliente.forma_pagamento,
      valor: parseFloat(novoCliente.valor) || 0,
      horario_agendado: novoCliente.horario_agendado || null
    })
    setModalAberto(false)
    setNovoCliente({ nome: '', telefone: '', servico: '', forma_pagamento: 'dinheiro', valor: '', horario_agendado: '' })
    fetchAgendamentos()
  }

  const enviarWhatsApp = (ag: Agendamento, tipo: 'lembrete' | 'confirmacao') => {
    const msg = tipo === 'lembrete' 
      ? `Olá ${ag.nome}! 👋\n\nLembrete: ${ag.servico} na Morais Barber.\n\nTe esperamos! 😊`
      : `Olá ${ag.nome}! ✅\n\nAgendamento confirmado: ${ag.servico}.\n\nTe esperamos! 😊`
    window.open(`https://wa.me/55${ag.telefone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const countStatus = (s: string) => agendamentos.filter(a => a.status === s).length
  const filtrados = filtro === 'todos' ? agendamentos : agendamentos.filter(a => a.status === filtro)

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
        <button className="btn btn-primary" onClick={() => setModalAberto(true)}>+ Adicionar Cliente</button>
        <button className="btn btn-outline" onClick={handleLogout}>Sair</button>
      </div>

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
        {(['todos', 'pendente', 'confirmado', 'cancelado'] as const).map(f => (
          <button key={f} className={`btn-filtro ${filtro === f ? 'ativo' : ''}`} onClick={() => setFiltro(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="admin-vazio"><span>📭</span><p>Nenhum agendamento.</p></div>
      ) : (
        <div className="admin-tabela">
          <div className="tabela-header">
            <span>Nome</span><span>Telefone</span><span>Serviço</span><span>Horário</span><span>Pgto</span><span>Status</span><span>Ações</span>
          </div>
          {filtrados.map(ag => (
            <div key={ag.id} className={`tabela-linha ${ag.status}`}>
              <span className="celula-nome"><strong>{ag.nome}</strong>{ag.mensagem && <small>{ag.mensagem}</small>}</span>
              <span className="celula-telefone">{ag.telefone}</span>
              <span className="celula-servico">{ag.servico}</span>
              <span className="celula-horario">{ag.horario_agendado ? new Date(ag.horario_agendado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</span>
              <span className="celula-pgto">
                <button className={`btn-pagamento ${ag.pago ? 'pago' : 'pendente'}`} onClick={() => togglePagamento(ag.id, ag.pago)}>
                  {ag.pago ? '💰' : '⏳'}
                </button>
              </span>
              <span className="celula-status">
                <span className={`badge ${ag.status}`}>{ag.status === 'pendente' ? '⏳' : ag.status === 'confirmado' ? '✅' : '❌'} {ag.status}</span>
              </span>
              <span className="celula-acoes">
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
                <option value="Corte Masculino">Corte Masculino — R$ 45</option>
                <option value="Barba">Barba — R$ 30</option>
                <option value="Corte + Barba">Corte + Barba — R$ 65</option>
                <option value="Sobrancelha">Sobrancelha — R$ 15</option>
                <option value="Pigmentação">Pigmentação — R$ 50</option>
                <option value="Hidratação Capilar">Hidratação Capilar — R$ 35</option>
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
