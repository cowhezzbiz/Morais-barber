import { useState } from 'react'
import { supabase } from './supabase'
import { Search, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react'
import './App.css'

interface Agendamento {
  id: number
  nome: string
  telefone: string
  servico: string
  status: 'pendente' | 'confirmado' | 'cancelado'
  horario_agendado: string | null
  created_at: string
}

export default function Acompanhamento() {
  const [telefone, setTelefone] = useState('')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [buscou, setBuscou] = useState(false)
  const [loading, setLoading] = useState(false)

  const buscarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!telefone.trim()) return

    setLoading(true)
    const telefoneFormatado = telefone.replace(/\D/g, '')
    
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .ilike('telefone', `%${telefoneFormatado.slice(-8)}%`)
      .order('horario_agendado', { ascending: true })

    if (error) {
      console.error('Erro:', error)
    } else {
      setAgendamentos(data || [])
      setBuscou(true)
    }
    setLoading(false)
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pendente':
        return { icon: <Clock size={24} />, text: 'Aguardando confirmação', color: 'amarelo' }
      case 'confirmado':
        return { icon: <CheckCircle size={24} />, text: 'Confirmado!', color: 'verde' }
      case 'cancelado':
        return { icon: <XCircle size={24} />, text: 'Cancelado', color: 'vermelho' }
      default:
        return { icon: <Clock size={24} />, text: status, color: 'cinza' }
    }
  }

  return (
    <div className="app">
      <section className="secao acompanhamento-secao">
        <div className="container">
          <p className="secao-subtitle">ACOMPANHAMENTO</p>
          <h2 className="secao-titulo">Veja o status do seu <span className="destaque">agendamento</span></h2>
          <p className="secao-desc">Digite seu telefone para verificar</p>

          <form onSubmit={buscarAgendamento} className="formulario-busca">
            <div className="form-grupo-busca">
              <input
                type="tel"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="Digite seu telefone com DDD"
                required
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Search size={20} />
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>

          {buscou && (
            <div className="resultado-busca">
              {agendamentos.length === 0 ? (
                <div className="sem-resultado">
                  <Calendar size={48} />
                  <p>Nenhum agendamento encontrado com este telefone.</p>
                  <p className="dica">Verifique se digitou correto ou entre em contato conosco.</p>
                </div>
              ) : (
                <div className="lista-agendamentos">
                  {agendamentos.map(ag => {
                    const statusInfo = getStatusInfo(ag.status)
                    return (
                      <div key={ag.id} className={`agendamento-card ${statusInfo.color}`}>
                        <div className="agendamento-status">
                          <div className={`icone-status ${statusInfo.color}`}>
                            {statusInfo.icon}
                          </div>
                          <div>
                            <strong>{statusInfo.text}</strong>
                            <span>#{ag.id}</span>
                          </div>
                        </div>
                        <div className="agendamento-detalhes">
                          <div className="detalhe">
                            <strong>Nome:</strong>
                            <span>{ag.nome}</span>
                          </div>
                          <div className="detalhe">
                            <strong>Serviço:</strong>
                            <span>{ag.servico}</span>
                          </div>
                          {ag.horario_agendado && (
                            <div className="detalhe">
                              <strong>Data/Hora:</strong>
                              <span>
                                {new Date(ag.horario_agendado).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(ag.horario_agendado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
