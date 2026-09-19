import { useState, useEffect } from 'react'
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
  const [faturamentoDiario, setFaturamentoDiario] = useState(0)
  const [faturamentoMensal, setFaturamentoMensal] = useState(0)
  const [faturamentoAnual, setFaturamentoAnual] = useState(0)

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
    if (user) {
      fetchAgendamentos()
    }
  }, [user])

  // Faturamento e fechamento são calculados dentro de fetchAgendamentos

  const fetchAgendamentos = async () => {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar:', error)
    } else {
      setAgendamentos(data || [])
      if (data && data.length > 0) {
        calcularTodosFaturamentos(data)
      }
    }
  }

  const calcularTodosFaturamentos = async (listaAgendamentos?: Agendamento[]) => {
    const dados = listaAgendamentos || agendamentos
    const diario = await calcularFaturamento('diario', dados)
    const mensal = await calcularFaturamento('mensal', dados)
    const anual = await calcularFaturamento('anual', dados)
    setFaturamentoDiario(diario)
    setFaturamentoMensal(mensal)
    setFaturamentoAnual(anual)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setError('Email ou senha incorretos.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const updateStatus = async (id: number, status: 'pendente' | 'confirmado' | 'cancelado') => {
    const { error } = await supabase
      .from('agendamentos')
      .update({ status })
      .eq('id', id)

    if (!error) {
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    }
  }

  const togglePagamento = async (id: number, valorAtual: boolean) => {
    const novoValor = !valorAtual
    const { error } = await supabase
      .from('agendamentos')
      .update({ pago: novoValor })
      .eq('id', id)

    if (!error) {
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, pago: novoValor } : a))
    }
  }

  const deleteAgendamento = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir?')) return
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id)

    if (!error) {
      setAgendamentos(prev => prev.filter(a => a.id !== id))
    }
  }

  const verificarFechamentoAutomatico = async () => {
    const hoje = new Date()
    const diaSemana = hoje.getDay()
    const diaMes = hoje.getDate()
    const mes = hoje.getMonth()
    const hojeStr = hoje.toISOString().split('T')[0]

    // Diário: todo sábado
    if (diaSemana === 6) {
      const { data } = await supabase
        .from('fechamentos')
        .select('ultima_data')
        .eq('tipo', 'diario')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const ultimaData = data?.ultima_data
      if (!ultimaData || ultimaData !== hojeStr) {
        const valor = await calcularFaturamento('diario')
        await supabase.from('fechamentos').insert({
          tipo: 'diario',
          ultima_data: hojeStr,
          valor_fechado: valor
        })
        setFaturamentoDiario(0)
      }
    }

    // Mensal: último dia do mês
    const ultimoDiaMes = new Date(hoje.getFullYear(), mes + 1, 0).getDate()
    if (diaMes === ultimoDiaMes) {
      const { data } = await supabase
        .from('fechamentos')
        .select('ultima_data')
        .eq('tipo', 'mensal')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const ultimaData = data?.ultima_data
      if (!ultimaData || ultimaData !== hojeStr) {
        const valor = await calcularFaturamento('mensal')
        await supabase.from('fechamentos').insert({
          tipo: 'mensal',
          ultima_data: hojeStr,
          valor_fechado: valor
        })
        setFaturamentoMensal(0)
      }
    }

    // Anual: 31 de dezembro
    if (mes === 11 && diaMes === 31) {
      const { data } = await supabase
        .from('fechamentos')
        .select('ultima_data')
        .eq('tipo', 'anual')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const ultimaData = data?.ultima_data
      if (!ultimaData || ultimaData !== hojeStr) {
        const valor = await calcularFaturamento('anual')
        await supabase.from('fechamentos').insert({
          tipo: 'anual',
          ultima_data: hojeStr,
          valor_fechado: valor
        })
        setFaturamentoAnual(0)
      }
    }
  }

  const calcularFaturamento = async (periodo: 'diario' | 'mensal' | 'anual', listaAgendamentos?: Agendamento[]) => {
    const dados = listaAgendamentos || agendamentos
    const agora = new Date()
    let inicio: Date

    if (periodo === 'diario') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    } else if (periodo === 'mensal') {
      inicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
    } else {
      inicio = new Date(agora.getFullYear(), 0, 1)
    }

    const { data: ultimoFechamento } = await supabase
      .from('fechamentos')
      .select('ultima_data')
      .eq('tipo', periodo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let dataCorte = inicio
    if (ultimoFechamento?.ultima_data) {
      const dataFechamento = new Date(ultimoFechamento.ultima_data)
      if (dataFechamento >= inicio) {
        dataCorte = new Date(dataFechamento.getTime() + 86400000)
      }
    }

    const agendamentosPeriodo = dados.filter(
      a => {
        const dataAgendamento = new Date(a.created_at)
        return a.status === 'confirmado' && dataAgendamento >= dataCorte
      }
    )

    return agendamentosPeriodo.reduce((total, a) => {
      return total + (PRECOS[a.servico] || 0)
    }, 0)
  }

  const handleResetFaturamento = async (periodo: 'diario' | 'mensal' | 'anual') => {
    const periodoLabel = periodo === 'diario' ? 'DIÁRIO' : periodo === 'mensal' ? 'MENSAL' : 'ANUAL'
    const confirmou = window.confirm(
      `⚠️ CONFIRMAÇÃO NECESSÁRIA\n\n` +
      `Você está prestes a ZERAR o faturamento ${periodoLabel}.\n\n` +
      `Esta ação não pode ser desfeita!\n\n` +
      `Deseja realmente continuar?`
    )
    if (confirmou) {
      const hojeStr = new Date().toISOString().split('T')[0]
      const valor = await calcularFaturamento(periodo)
      await supabase.from('fechamentos').insert({
        tipo: periodo,
        ultima_data: hojeStr,
        valor_fechado: valor
      })
      if (periodo === 'diario') setFaturamentoDiario(0)
      if (periodo === 'mensal') setFaturamentoMensal(0)
      if (periodo === 'anual') setFaturamentoAnual(0)
    }
  }

  const [modalAberto, setModalAberto] = useState(false)
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    telefone: '',
    servico: '',
    forma_pagamento: 'dinheiro',
    valor: '',
    horario_agendado: ''
  })

  const adicionarClienteManual = async () => {
    if (!novoCliente.nome || !novoCliente.telefone || !novoCliente.servico) {
      alert('Preencha nome, telefone e serviço!')
      return
    }
    const { error } = await supabase.from('agendamentos').insert({
      nome: novoCliente.nome,
      telefone: novoCliente.telefone.replace(/\D/g, ''),
      servico: novoCliente.servico,
      status: 'confirmado',
      pago: novoCliente.forma_pagamento !== 'pendente',
      forma_pagamento: novoCliente.forma_pagamento,
      valor: parseFloat(novoCliente.valor) || 0,
      horario_agendado: novoCliente.horario_agendado || null
    })
    if (!error) {
      setModalAberto(false)
      setNovoCliente({ nome: '', telefone: '', servico: '', forma_pagamento: 'dinheiro', valor: 0, horario_agendado: '' })
      fetchAgendamentos()
    }
  }
  const filtrados = filtro === 'todos' ? agendamentos : agendamentos.filter(a => a.status === filtro)

  // Modal de adicionar cliente

  // Lembretes - agendamentos de amanhã
  const amanhã = new Date()
  amanhã.setDate(amanhã.getDate() + 1)
  const amanhãStr = amanhã.toISOString().split('T')[0]
  const lembretes = agendamentos.filter(
    a => a.horario_agendado && a.horario_agendado.startsWith(amanhãStr) && a.status !== 'cancelado'
  )

  const enviarLembrete = (ag: Agendamento) => {
    const dataHora = ag.horario_agendado
      ? new Date(ag.horario_agendado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : ''
    const mensagem = `Olá ${ag.nome}! 👋\n\nLembrete do seu agendamento na Morais Barber:\n📅 ${dataHora}\n✂️ ${ag.servico}\n\nTe esperamos! 😊`
    const whatsappUrl = `https://wa.me/55${ag.telefone}?text=${encodeURIComponent(mensagem)}`
    window.open(whatsappUrl, '_blank')
  }

  const enviarConfirmacao = (ag: Agendamento) => {
    const dataHora = ag.horario_agendado
      ? new Date(ag.horario_agendado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : ''
    const mensagem = `Olá ${ag.nome}! ✅\n\nSeu agendamento na Morais Barber foi CONFIRMADO!\n📅 ${dataHora}\n✂️ ${ag.servico}\n\nTe esperamos! 😊`
    const whatsappUrl = `https://wa.me/55${ag.telefone}?text=${encodeURIComponent(mensagem)}`
    window.open(whatsappUrl, '_blank')
  }

  const enviarTodosLembretes = () => {
    lembretes.forEach(ag => enviarLembrete(ag))
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-loading">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="admin-container">
        <div className="admin-login-card">
          <div className="admin-header">
            <span className="admin-icone">🔐</span>
            <h2>Área do Administrador</h2>
            <p>Faça login para acessar os agendamentos</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-grupo">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seuemail@gmail.com" required />
            </div>
            <div className="form-grupo">
              <label>Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" required />
            </div>
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
        <div>
          <h2>📋 Painel de Agendamentos</h2>
          <p>Bem-vindo, {user.email}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalAberto(true)}>+ Adicionar Cliente</button>
        <button className="btn btn-outline" onClick={handleLogout}>Sair</button>
      </div>

      <div className="lembretes-container">
        <div className="lembretes-header">
          <h3>⏰ Lembretes para Amanhã ({amanhãStr})</h3>
          {lembretes.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={enviarTodosLembretes}>
              Enviar Todos ({lembretes.length})
            </button>
          )}
        </div>
        {lembretes.length === 0 ? (
          <div className="lembretes-vazio">
            <p>Nenhum agendamento para amanhã</p>
          </div>
        ) : (
          <div className="lembretes-lista">
            {lembretes.map(ag => (
              <div key={ag.id} className="lembrete-card">
                <div className="lembrete-info">
                  <strong>{ag.nome}</strong>
                  <span className="lembrete-horario">
                    {ag.horario_agendado ? new Date(ag.horario_agendado).toLocaleString('pt-BR', { timeStyle: 'short' }) : ''}
                  </span>
                  <span className="lembrete-servico">{ag.servico}</span>
                </div>
                <button className="btn-lembrete" onClick={() => enviarLembrete(ag)} title="Enviar lembrete">
                  💬
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-stats">
        <div className="admin-stat">
          <span className="stat-num">{agendamentos.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="admin-stat">
          <span className="stat-num stat-amarelo">{countStatus('pendente')}</span>
          <span className="stat-label">Pendentes</span>
        </div>
        <div className="admin-stat">
          <span className="stat-num stat-verde">{countStatus('confirmado')}</span>
          <span className="stat-label">Confirmados</span>
        </div>
        <div className="admin-stat">
          <span className="stat-num stat-vermelho">{countStatus('cancelado')}</span>
          <span className="stat-label">Cancelados</span>
        </div>
      </div>

      <div className="faturamento-container">
        <h3 className="faturamento-titulo">💰 Faturamento</h3>
        <div className="faturamento-cards">
          <div className="faturamento-card">
            <span className="faturamento-label">Hoje</span>
            <span className="faturamento-valor">
              R$ {faturamentoDiario.toFixed(2).replace('.', ',')}
            </span>
            <button className="btn-reset-faturamento" onClick={() => handleResetFaturamento('diario')}>
              🗑 Zerar
            </button>
          </div>
          <div className="faturamento-card">
            <span className="faturamento-label">Este Mês</span>
            <span className="faturamento-valor">
              R$ {faturamentoMensal.toFixed(2).replace('.', ',')}
            </span>
            <button className="btn-reset-faturamento" onClick={() => handleResetFaturamento('mensal')}>
              🗑 Zerar
            </button>
          </div>
          <div className="faturamento-card">
            <span className="faturamento-label">Este Ano</span>
            <span className="faturamento-valor">
              R$ {faturamentoAnual.toFixed(2).replace('.', ',')}
            </span>
            <button className="btn-reset-faturamento" onClick={() => handleResetFaturamento('anual')}>
              🗑 Zerar
            </button>
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
        <div className="admin-vazio">
          <span>📭</span>
          <p>Nenhum agendamento encontrado.</p>
        </div>
      ) : (
        <div className="admin-tabela">
          <div className="tabela-header">
            <span>Nome</span>
            <span>Telefone</span>
            <span>Serviço</span>
            <span>Horário</span>
            <span>Pgto</span>
            <span>Status</span>
            <span>Ações</span>
          </div>
          {filtrados.map(ag => (
            <div key={ag.id} className={`tabela-linha ${ag.status}`}>
              <span className="celula-nome">
                <strong>{ag.nome}</strong>
                {ag.mensagem && <small>{ag.mensagem}</small>}
              </span>
              <span className="celula-telefone">{ag.telefone}</span>
              <span className="celula-servico">{ag.servico}</span>
              <span className="celula-horario">
                {ag.horario_agendado ? new Date(ag.horario_agendado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
              </span>
              <span className="celula-pgto">
                <button
                  className={`btn-pagamento ${ag.pago ? 'pago' : 'pendente'}`}
                  onClick={() => togglePagamento(ag.id, ag.pago)}
                  title={ag.pago ? 'Clique para marcar como não pago' : 'Clique para marcar como pago'}
                >
                  {ag.pago ? '💰' : '⏳'}
                </button>
              </span>
              <span className="celula-status">
                <span className={`badge ${ag.status}`}>
                  {ag.status === 'pendente' ? '⏳' : ag.status === 'confirmado' ? '✅' : '❌'} {ag.status}
                </span>
              </span>
              <span className="celula-acoes">
                {ag.status === 'pendente' && (
                  <>
                    <button className="btn-acao confirmar" onClick={() => updateStatus(ag.id, 'confirmado')} title="Confirmar">✓</button>
                    <button className="btn-acao whatsapp" onClick={() => enviarConfirmacao(ag)} title="Enviar confirmação WhatsApp">💬</button>
                    <button className="btn-acao cancelar" onClick={() => updateStatus(ag.id, 'cancelado')} title="Cancelar">✕</button>
                  </>
                )}
                {ag.status === 'confirmado' && (
                  <button className="btn-acao whatsapp" onClick={() => enviarLembrete(ag)} title="Enviar lembrete">💬</button>
                )}
                <button className="btn-acao excluir" onClick={() => deleteAgendamento(ag.id)} title="Excluir">🗑</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal Adicionar Cliente */}
      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>➕ Adicionar Cliente Manual</h3>
            <div className="form-grupo">
              <label>Nome</label>
              <input type="text" value={novoCliente.nome} onChange={e => setNovoCliente({...novoCliente, nome: e.target.value})} placeholder="Nome do cliente" />
            </div>
            <div className="form-grupo">
              <label>Telefone</label>
              <input type="tel" value={novoCliente.telefone} onChange={e => setNovoCliente({...novoCliente, telefone: e.target.value})} placeholder="(51) 99999-9999" />
            </div>
            <div className="form-grupo">
              <label>Serviço</label>
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
            <div className="form-grupo">
              <label>Forma de Pagamento</label>
              <select value={novoCliente.forma_pagamento} onChange={e => setNovoCliente({...novoCliente, forma_pagamento: e.target.value})}>
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="pix">📱 PIX</option>
                <option value="cartao">💳 Cartão</option>
                <option value="pendente">⏳ Pendente</option>
              </select>
            </div>
            <div className="form-grupo">
              <label>Valor (R$)</label>
              <input type="text" value={novoCliente.valor} onChange={e => setNovoCliente({...novoCliente, valor: e.target.value})} placeholder="45,00" />
            </div>
            <div className="form-grupo">
              <label>Data/Hora (opcional)</label>
              <input type="datetime-local" value={novoCliente.horario_agendado} onChange={e => setNovoCliente({...novoCliente, horario_agendado: e.target.value})} />
            </div>
            <div className="modal-botoes">
              <button className="btn btn-primary" onClick={adicionarClienteManual}>Salvar</button>
              <button className="btn btn-outline" onClick={() => setModalAberto(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
