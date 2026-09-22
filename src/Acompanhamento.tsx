import { useState } from 'react'
import { Search, Clock, CheckCircle, XCircle, Ticket, Copy, Check, Calendar, Scissors, Wallet, CreditCard, ArrowLeft } from 'lucide-react'
import './App.css'

interface Agendamento {
  id: number
  nome: string
  servico: string
  status: 'pendente' | 'confirmado' | 'cancelado'
  horario_agendado: string | null
  pago: boolean
  forma_pagamento: string
  valor: number
}

export default function Acompanhamento() {
  const [token, setToken] = useState('')
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null)
  const [buscou, setBuscou] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [tentativas, setTentativas] = useState(0)
  const [ultimoTentativa, setUltimoTentativa] = useState(0)

  const podeBuscar = tentativas < 5 || (Date.now() - ultimoTentativa) > 60000

  // Token salvo do último agendamento (localStorage)
  const [tokenSalvo] = useState(() => {
    try { return localStorage.getItem('ultimo_token') } catch { return null }
  })

  const buscarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setAgendamento(null)

    if (!token.trim()) return

    if (!podeBuscar) {
      setErro('Muitas tentativas. Aguarde 1 minuto.')
      return
    }

    setLoading(true)
    setTentativas(t => t + 1)
    setUltimoTentativa(Date.now())

    try {
      const response = await fetch('https://croscmpnezlixszygyka.supabase.co/functions/v1/acompanhamento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ token: token.trim().toUpperCase() })
      })

      const result = await response.json()

      if (!response.ok) {
        setErro(result.error || 'Erro ao buscar.')
        setBuscou(true)
        return
      }

      setAgendamento(result.agendamento)
      setBuscou(true)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setBuscou(true)
    } finally {
      setLoading(false)
    }
  }

  const copiarToken = () => {
    if (tokenSalvo) {
      navigator.clipboard.writeText(tokenSalvo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pendente':
        return { icon: <Clock size={28} />, text: 'Aguardando confirmação', color: 'amarelo', desc: 'O barbeiro vai confirmar seu horário em breve' }
      case 'confirmado':
        return { icon: <CheckCircle size={28} />, text: 'Confirmado!', color: 'verde', desc: 'Te esperamos na data e hora marcada' }
      case 'cancelado':
        return { icon: <XCircle size={28} />, text: 'Cancelado', color: 'vermelho', desc: 'Este agendamento foi cancelado' }
      default:
        return { icon: <Clock size={28} />, text: status, color: 'cinza', desc: '' }
    }
  }

  const formatarData = (dataISO: string | null) => {
    if (!dataISO) return { data: 'A combinar', hora: '' }
    const d = new Date(dataISO)
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    return {
      data: `${dias[d.getDay()]}, ${d.toLocaleDateString('pt-BR')}`,
      hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const formaPagamentoLabel = (forma: string) => {
    switch (forma) {
      case 'pix': return { icon: <Wallet size={14} />, label: 'PIX' }
      case 'dinheiro': return { icon: <Wallet size={14} />, label: 'Dinheiro' }
      case 'cartao': return { icon: <CreditCard size={14} />, label: 'Cartão' }
      default: return { icon: <Clock size={14} />, label: 'A definir' }
    }
  }

  return (
    <div className="app">
      <section className="secao acompanhamento-secao">
        <div className="container">
          <a href="#/" className="btn-voltar">
            <ArrowLeft size={18} /> Voltar ao início
          </a>
          <div className="acompanhar-header">
            <span className="acompanhar-icone-grande"><Ticket size={40} /></span>
            <p className="secao-subtitle">MEU AGENDAMENTO</p>
            <h2 className="secao-titulo">Acompanhe com seu <span className="destaque">token</span></h2>
            <p className="secao-desc">
              Cada agendamento recebe um código único de 8 caracteres.
              Guarde seu token — só quem tem ele consegue ver o agendamento.
            </p>
          </div>

          {tokenSalvo && !buscou && (
            <div className="token-salvo-card">
              <div className="token-salvo-info">
                <span className="token-salvo-label">Seu último token:</span>
                <code className="token-salvo-valor">{tokenSalvo}</code>
              </div>
              <div className="token-salvo-acoes">
                <button type="button" className="btn-token-usar" onClick={() => setToken(tokenSalvo)}>
                  <Search size={14} /> Usar
                </button>
                <button type="button" className="btn-token-copiar" onClick={copiarToken}>
                  {copiado ? <Check size={14} /> : <Copy size={14} />}
                  {copiado ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={buscarAgendamento} className="formulario-token">
            <div className="token-input-grupo">
              <Ticket size={22} className="token-input-icone" />
              <input
                type="text"
                value={token}
                onChange={e => setToken(e.target.value.toUpperCase())}
                placeholder="Ex: K7XM2P9Q"
                maxLength={8}
                required
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {erro && <p className="erro-msg">{erro}</p>}
          </form>

          {buscou && agendamento && (
            <div className="resultado-token">
              {(() => {
                const statusInfo = getStatusInfo(agendamento.status)
                const { data, hora } = formatarData(agendamento.horario_agendado)
                const pgto = formaPagamentoLabel(agendamento.forma_pagamento)
                return (
                  <div className={`token-card ${statusInfo.color}`}>
                    <div className="token-card-topo">
                      <div className={`token-status-icone ${statusInfo.color}`}>
                        {statusInfo.icon}
                      </div>
                      <div className="token-status-texto">
                        <strong>{statusInfo.text}</strong>
                        <span>{statusInfo.desc}</span>
                      </div>
                    </div>

                    <div className="token-card-grade">
                      <div className="token-info-item">
                        <span className="token-info-label"><Scissors size={14} /> Serviço</span>
                        <span className="token-info-valor">{agendamento.servico}</span>
                      </div>
                      <div className="token-info-item">
                        <span className="token-info-label"><Calendar size={14} /> Data</span>
                        <span className="token-info-valor">{data}</span>
                      </div>
                      <div className="token-info-item">
                        <span className="token-info-label"><Clock size={14} /> Hora</span>
                        <span className="token-info-valor">{hora || '—'}</span>
                      </div>
                      <div className="token-info-item">
                        <span className="token-info-label"><Wallet size={14} /> Valor</span>
                        <span className="token-info-valor token-valor">
                          {agendamento.valor > 0 ? `R$ ${agendamento.valor.toFixed(2).replace('.', ',')}` : 'Consultar'}
                        </span>
                      </div>
                      <div className="token-info-item">
                        <span className="token-info-label">{pgto.icon} Pagamento</span>
                        <span className={`token-info-valor ${agendamento.pago ? 'pago-ok' : 'pago-pendente'}`}>
                          {agendamento.pago ? '✓ Pago' : 'Pendente'}
                        </span>
                      </div>
                      <div className="token-info-item">
                        <span className="token-info-label"><CreditCard size={14} /> Forma</span>
                        <span className="token-info-valor">{pgto.label}</span>
                      </div>
                    </div>

                    <div className="token-card-rodape">
                      <span>Agendamento <strong>#{agendamento.id}</strong> • {agendamento.nome}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
