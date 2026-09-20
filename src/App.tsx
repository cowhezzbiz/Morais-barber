import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import { Scissors, Crown, Sparkles, Palette, Droplets, PenTool, MapPin, Phone, Clock, MessageCircle, Star, CheckCircle } from 'lucide-react'
import './App.css'

interface Servico {
  id: number
  nome: string
  descricao: string
  preco: string
  duracao: string
  icone: string
}

const SERVICOS: Servico[] = [
  { id: 1, nome: 'Corte + Sobrancelha', descricao: 'Corte personalizado + design de sobrancelha com navalha.', preco: 'R$ 35', duracao: '50 min', icone: 'scissors' },
  { id: 2, nome: 'Corte + Barba', descricao: 'Corte moderno + modelagem completa de barba.', preco: 'R$ 35', duracao: '1h', icone: 'crown' },
  { id: 3, nome: 'Combo Completo', descricao: 'Corte + Barba + Sobrancelha. O visual perfeito.', preco: 'R$ 60', duracao: '1h15min', icone: 'sparkles' },
  { id: 4, nome: 'Tatuagem', descricao: 'Tatuagens artísticas e personalizadas. Agende uma consulta.', preco: 'Consultar', duracao: 'Variável', icone: 'pen' },
]

const getIcon = (name: string) => {
  const icons: Record<string, React.ReactNode> = {
    scissors: <Scissors size={28} />,
    crown: <Crown size={28} />,
    sparkles: <Sparkles size={28} />,
    palette: <Palette size={28} />,
    droplets: <Droplets size={28} />,
    pen: <PenTool size={28} />,
  }
  return icons[name] || <Scissors size={28} />
}

const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 11
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

export default function App() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [formNome, setFormNome] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formServico, setFormServico] = useState('')
  const [formMensagem, setFormMensagem] = useState('')
  const [horario, setHorario] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [tentativas, setTentativas] = useState(0)
  const [ultimoTentativa, setUltimoTentativa] = useState(0)

  const isBot = honeypot.length > 0
  const podeEnviar = tentativas < 3 || (Date.now() - ultimoTentativa) > 60000

  const scrollToSection = (id: string) => {
    setMenuAberto(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (erro) {
      const timer = setTimeout(() => setErro(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [erro])

  const horariosDisponiveis = useMemo(() => {
    const horarios: string[] = []
    const hoje = new Date()
    for (let i = 0; i < 30; i++) {
      const data = new Date(hoje)
      data.setDate(hoje.getDate() + i)
      const diaSemana = data.getDay()
      if (diaSemana === 0 || diaSemana === 1) continue
      const ano = data.getFullYear()
      const mes = String(data.getMonth() + 1).padStart(2, '0')
      const dia = String(data.getDate()).padStart(2, '0')
      if (diaSemana >= 2 && diaSemana <= 5) {
        for (let h = 9; h <= 19; h++) {
          horarios.push(`${ano}-${mes}-${dia}T${String(h).padStart(2, '0')}:00`)
          if (h < 19) horarios.push(`${ano}-${mes}-${dia}T${String(h).padStart(2, '0')}:30`)
        }
        horarios.push(`${ano}-${mes}-${dia}T19:30`)
      } else if (diaSemana === 6) {
        for (let h = 9; h <= 17; h++) {
          horarios.push(`${ano}-${mes}-${dia}T${String(h).padStart(2, '0')}:00`)
          if (h < 17) horarios.push(`${ano}-${mes}-${dia}T${String(h).padStart(2, '0')}:30`)
        }
      }
    }
    return horarios
  }, [])

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setFormTelefone(formatted)
  }

  const enviarFormulario = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (isBot) return

    if (!podeEnviar) {
      setErro('Muitas tentativas. Aguarde 1 minuto.')
      return
    }

    const telefoneDigits = formTelefone.replace(/\D/g, '')
    if (!isValidPhone(formTelefone)) {
      setErro('Telefone inválido. Digite pelo menos 10 dígitos.')
      return
    }

    setLoading(true)
    setTentativas(t => t + 1)
    setUltimoTentativa(Date.now())

    try {
      const horarioISO = horario ? new Date(horario).toISOString() : null
      if (horario && !horarioISO) {
        setErro('Data/horário inválido.')
        setLoading(false)
        return
      }

      const texto = `Olá! Gostaria de agendar.\nNome: ${formNome}\nTelefone: ${formTelefone}\nServiço: ${formServico}\nHorário: ${horario}\nMensagem: ${formMensagem || 'Nenhuma'}`
      const whatsappUrl = `https://wa.me/5551981301035?text=${encodeURIComponent(texto)}`
      const servicoSelecionado = SERVICOS.find(s => s.nome === formServico)
      const valorServico = servicoSelecionado ? parseFloat(servicoSelecionado.preco.replace('R$ ', '')) : 0

      const nomeSanitizado = formNome.replace(/<[^>]*>/g, '').trim().slice(0, 100)
      const mensagemSanitizada = formMensagem.replace(/<[^>]*>/g, '').trim().slice(0, 500)

      const dadosInsert: Record<string, unknown> = {
        nome: nomeSanitizado,
        telefone: telefoneDigits,
        servico: formServico,
        mensagem: mensagemSanitizada,
        status: 'pendente',
        forma_pagamento: 'pendente',
        valor: valorServico
      }
      if (horarioISO) dadosInsert.horario_agendado = horarioISO

      const { error: insertError } = await supabase.from('agendamentos').insert(dadosInsert)
      if (insertError) {
        if (insertError.code === '23505') {
          setErro('Este horário acabou de ser reservado. Escolha outro.')
        } else {
          setErro(`Erro: ${insertError.message}`)
        }
        setLoading(false)
        return
      }

      window.open(whatsappUrl, '_blank')
      setEnviado(true)
      setTentativas(0)
      setFormNome(''); setFormTelefone(''); setFormServico(''); setFormMensagem(''); setHorario('')
      setTimeout(() => setEnviado(false), 5000)
    } catch (err: unknown) {
      console.error('Erro:', err)
      setErro(`Erro: ${err instanceof Error ? err.message : 'Erro ao enviar.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <nav className={`navbar ${menuAberto ? 'aberto' : ''}`}>
        <div className="nav-container">
          <button className="logo" onClick={() => scrollToSection('inicio')}>
            <span className="logo-icon"><Scissors size={24} /></span>
            <span className="logo-text">MORAIS<span className="logo-highlight"> BARBER</span></span>
          </button>
          <button className="menu-toggle" onClick={() => setMenuAberto(!menuAberto)} aria-label="Menu">
            <span className={`hamburger ${menuAberto ? 'ativo' : ''}`}></span>
          </button>
          <ul className={`nav-links ${menuAberto ? 'ativo' : ''}`}>
            <li><button onClick={() => scrollToSection('inicio')}>Início</button></li>
            <li><button onClick={() => scrollToSection('servicos')}>Serviços</button></li>
            <li><button onClick={() => scrollToSection('sobre')}>Sobre</button></li>
            <li><button onClick={() => scrollToSection('contato')}>Contato</button></li>
          </ul>
        </div>
      </nav>

      <section id="inicio" className="hero">
        <div className="hero-content">
          <p className="hero-subtitle">Barbearia Premium • Tattoo Artística</p>
          <h1 className="hero-title">Onde estilo encontra <span className="destaque">excelência</span></h1>
          <p className="hero-desc">Cortes modernos, barba impecável e tatuagens únicas. Um ambiente pensado pra você se sentir bem.</p>
          <div className="hero-botoes">
            <button className="btn btn-primary" onClick={() => scrollToSection('contato')}>Agendar Horário</button>
            <a href="#/agendamento" className="btn btn-outline">Acompanhar Agendamento</a>
          </div>
          <div className="hero-stats">
            <div className="stat"><span className="stat-num">2000+</span><span className="stat-label">Clientes Felizes</span></div>
            <div className="stat"><span className="stat-num">5.0</span><span className="stat-label">Avaliação</span></div>
            <div className="stat"><span className="stat-num">5+</span><span className="stat-label">Anos de Experiência</span></div>
          </div>
        </div>
      </section>

      <section id="servicos" className="secao">
        <div className="container">
          <p className="secao-subtitle">NOSSOS SERVIÇOS</p>
          <h2 className="secao-titulo">O que fazemos de <span className="destaque">melhor</span></h2>
          <p className="secao-desc">Serviços pensados pra você sair com o visual impecável.</p>
          <div className="grid-servicos">
            {SERVICOS.map(s => (
              <div key={s.id} className="card-servico">
                <div className="servico-icone">{getIcon(s.icone)}</div>
                <h3>{s.nome}</h3>
                <p className="servico-desc">{s.descricao}</p>
                <div className="servico-info">
                  <span className="servico-preco">{s.preco}</span>
                  <span className="servico-duracao"><Clock size={16} /> {s.duracao}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sobre" className="secao secao-escura">
        <div className="container">
          <div className="sobre-grid">
            <div className="sobre-img">
              <div className="img-placeholder">
                <Scissors size={64} />
                <p>Morais Barber</p>
                <small>Desde 2020</small>
              </div>
            </div>
            <div className="sobre-texto">
              <p className="secao-subtitle">SOBRE NÓS</p>
              <h2 className="secao-titulo">Tradição e modernidade em cada <span className="destaque">corte</span></h2>
              <p className="sobre-p">A Morais Barber nasceu da paixão por transformar autoestima. Nosso barbeiro tem mais de 5 anos de experiência.</p>
              <p className="sobre-p">Aqui você encontra um ambiente descontraído, produtos de primeira e o melhor atendimento.</p>
              <ul className="sobre-lista">
                <li><CheckCircle size={18} /> Profissional certificado</li>
                <li><CheckCircle size={18} /> Ambiente confortável</li>
                <li><CheckCircle size={18} /> Produtos premium</li>
                <li><CheckCircle size={18} /> Atendimento personalizado</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="contato" className="secao secao-escura">
        <div className="container">
          <p className="secao-subtitle">CONTATO</p>
          <h2 className="secao-titulo">Agende seu <span className="destaque">horário</span></h2>
          <p className="secao-desc">Escolha o melhor dia e horário pra você.</p>
          <div className="contato-grid">
            <div className="contato-info">
              <div className="info-item">
                <span className="info-icone"><MapPin size={24} /></span>
                <div><strong>Endereço</strong><p>R. Potiguara, 974 - Canudos, NH</p></div>
              </div>
              <div className="info-item">
                <span className="info-icone"><Phone size={24} /></span>
                <div><strong>Telefone</strong><p>(51) 98130-1035</p></div>
              </div>
              <div className="info-item">
                <span className="info-icone"><Clock size={24} /></span>
                <div><strong>Horário</strong><p>Terça a Sexta: 9h às 19:30h</p><p>Sábado: 9h às 17h</p></div>
              </div>
              <div className="info-item">
                <span className="info-icone"><Star size={24} /></span>
                <div><strong>Instagram</strong><p>@moraisbarber.tattoo</p></div>
              </div>
              <a href="https://wa.me/5551981301035" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                <MessageCircle size={20} /> Agendar pelo WhatsApp
              </a>
              <div className="mapa-container">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3516.0!2d-51.1!3d-29.1!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sR.+Potiguara%2C+974+-29035-490!5e0!3m2!1spt-BR!2sbr!4v1234567890"
                  width="100%"
                  height="200"
                  style={{ border: 0, borderRadius: 12 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localização Morais Barber"
                ></iframe>
              </div>
            </div>
            <div className="contato-form">
              <h3>Envie uma mensagem</h3>
              {enviado && (
                <div className="sucesso-msg">
                  <CheckCircle size={18} /> Agendamento enviado!
                  <p className="link-acompanhar"><a href="#/agendamento">Acompanhe aqui</a></p>
                </div>
              )}
              <form onSubmit={enviarFormulario}>
                <div className="form-grupo">
                  <label htmlFor="nome">Nome</label>
                  <input type="text" id="nome" placeholder="Seu nome" value={formNome} onChange={e => setFormNome(e.target.value)} required disabled={loading} maxLength={100} />
                </div>
                <div className="form-grupo">
                  <label htmlFor="telefone">Telefone</label>
                  <input type="tel" id="telefone" placeholder="(51) 99999-9999" value={formTelefone} onChange={handleTelefoneChange} required disabled={loading} maxLength={15} />
                </div>
                <div style={{ display: 'none' }} aria-hidden="true">
                  <input type="text" name="honeypot" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
                </div>
                <div className="form-grupo">
                  <label htmlFor="servico">Serviço</label>
                  <select id="servico" value={formServico} onChange={e => setFormServico(e.target.value)} required disabled={loading}>
                    <option value="">Selecione...</option>
                    {SERVICOS.map(s => <option key={s.id} value={s.nome}>{s.nome} — {s.preco}</option>)}
                  </select>
                </div>
                <div className="form-grupo">
                  <label htmlFor="horario">Data e Horário</label>
                  <select id="horario" value={horario} onChange={e => setHorario(e.target.value)} required disabled={loading}>
                    <option value="">Selecione...</option>
                    {horariosDisponiveis.map(h => {
                      const d = new Date(h)
                      const dia = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()]
                      const data = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
                      const hora = h.split('T')[1]
                      return <option key={h} value={h}>{dia} {data} às {hora}</option>
                    })}
                  </select>
                </div>
                <div className="form-grupo">
                  <label htmlFor="mensagem">Mensagem (opcional)</label>
                  <textarea id="mensagem" rows={3} placeholder="Alguma observação?" value={formMensagem} onChange={e => setFormMensagem(e.target.value)} disabled={loading} maxLength={500}></textarea>
                </div>
                {erro && <p className="erro-msg">{erro}</p>}
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="logo footer-logo">
                <span className="logo-icon"><Scissors size={24} /></span>
                <span className="logo-text">MORAIS<span className="logo-highlight"> BARBER</span></span>
              </div>
              <p className="footer-desc">O melhor da barbearia em Canudos, NH.</p>
            </div>
            <div className="footer-col">
              <h4>Links</h4>
              <ul>
                <li><button onClick={() => scrollToSection('inicio')}>Início</button></li>
                <li><button onClick={() => scrollToSection('servicos')}>Serviços</button></li>
                <li><button onClick={() => scrollToSection('sobre')}>Sobre</button></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Contato</h4>
              <ul>
                <li>📍 R. Potiguara, 974</li>
                <li>📞 (51) 98130-1035</li>
                <li>🕐 Ter-Sex 9h-19:30h</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Morais Barber. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
