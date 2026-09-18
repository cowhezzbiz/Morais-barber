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
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'confirmado' | 'cancelado'>('todos')

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

  const fetchAgendamentos = async () => {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar:', error)
    } else {
      setAgendamentos(data || [])
    }
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

  const filtrados = filtro === 'todos' ? agendamentos : agendamentos.filter(a => a.status === filtro)
  const countStatus = (status: string) => agendamentos.filter(a => a.status === status).length

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
        <button className="btn btn-outline" onClick={handleLogout}>Sair</button>
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
              <span className="celula-status">
                <span className={`badge ${ag.status}`}>
                  {ag.status === 'pendente' ? '⏳' : ag.status === 'confirmado' ? '✅' : '❌'} {ag.status}
                </span>
              </span>
              <span className="celula-acoes">
                {ag.status === 'pendente' && (
                  <>
                    <button className="btn-acao confirmar" onClick={() => updateStatus(ag.id, 'confirmado')} title="Confirmar">✓</button>
                    <button className="btn-acao cancelar" onClick={() => updateStatus(ag.id, 'cancelado')} title="Cancelar">✕</button>
                  </>
                )}
                <button className="btn-acao excluir" onClick={() => deleteAgendamento(ag.id)} title="Excluir">🗑</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
