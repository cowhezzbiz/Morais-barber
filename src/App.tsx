import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import { Scissors, Crown, Sparkles, Palette, Droplets, PenTool, MapPin, Clock, MessageCircle, Star, CheckCircle } from 'lucide-react'
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
  { id: 1, nome: 'Corte Masculino', descricao: 'Corte moderno e personalizado, lavagem e finalização incluso.', preco: 'R$ 45', duracao: '40 min', icone: 'scissors' },
  { id: 2, nome: 'Barba', descricao: 'Modelagem completa com navalha, toalha quente e hidratação.', preco: 'R$ 30', duracao: '30 min', icone: 'scissors' },
  { id: 3, nome: 'Corte + Barba', descricao: 'Combo completo com desconto especial. O visual perfeito.', preco: 'R$ 65', duracao: '1h', icone: 'crown' },
  { id: 4, nome: 'Sobrancelha', descricao: 'Design e limpeza de sobrancelha com navalha.', preco: 'R$ 15', duracao: '15 min', icone: 'sparkles' },
  { id: 5, nome: 'Pigmentação', descricao: 'Camufla falhas no cabelo ou barba com pigmento natural.', preco: 'R$ 50', duracao: '45 min', icone: 'palette' },
  { id: 6, nome: 'Hidratação Capilar', descricao: 'Tratamento profundo para cabelos ressecados e danificados.', preco: 'R$ 35', duracao: '30 min', icone: 'droplets' },
  { id: 7, nome: 'Tatuagem', descricao: 'Tatuagens artísticas e personalizadas. Agende uma consulta.', preco: 'Consultar', duracao: 'Variável', icone: 'pen' },
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

const scrollToSection = (id: string) => {
  setMenuAberto(false)
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
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

  const enviarFormulario = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!isValidPhone(formTelefone)) {
      setErro('Telefone inválido. Digite pelo menos 10 dígitos.')
      return
    }
    setLoading(true)
    try {
      const horarioISO = horario ? new Date(horario).toISOString() : null
      const texto = `Olá! Gostaria de agendar.\nNome: ${formNome}\nTelefone: ${formTelefone}\nServiço: ${formServico}\nHorário: ${horario}\nMensagem: ${formMensagem || 'Nenhuma'}`
      const whatsappUrl = `https://wa.me/5551981301035?text=${encodeURIComponent(texto)}`
      const { error: insertError } = await supabase.from('agendamentos').insert({
        nome: formNome.trim().slice(0, 100),
        telefone: formTelefone.replace(/\D/g, ''),
        servico: formServico,
        mensagem: formMensagem.trim().slice(0, 500),
        status: 'pendente',
        horario_agendado: horarioISO
      })
      if (insertError) {
        if (insertError.code === '23505') {
          setErro('Este horário acabou de ser reservado. Escolha outro.')
          setLoading(false)
          return
        }
        throw insertError
      }
      window.open(whatsappUrl, '_blank')
      setEnviado(true)
      setFormNome(''); setFormTelefone(''); setFormServico(''); setFormMensagem(''); setHorario('')
      setTimeout(() => setEnviado(false), 5000)
    } catch (err: unknown) {
      console.error('Erro:', err)
      setErro(err instanceof Error ? err.message : 'Erro ao enviar.')
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
            <li><button onClick={() => scrollToSection('galeria')}>Galeria</button></li>
            <li><button onClick={() => scrollToSection('avaliacoes')}>Avaliações</button></li>
            <li><button onClick={() => scrollToSection('contato')}>Contato</button></li>
          </ul>
        </div>
      </nav>

      <section id="inicio" className="hero">
        <div className="hero-content">
          <p className="hero-subtitle">Barbearia Clássica • Tattoo</p>
          <h1 className="hero-title">Onde estilo encontra <span className="destaque">excelência</span></h1>
          <p className="hero-desc">Cortes modernos, barba feita com capricho e tatuagens artísticas.</p>
          <div className="hero-botoes">
            <button className="btn btn-primary" onClick={() => scrollToSection('contato')}>Agendar Horário</button>
            <button className="btn btn-outline" onClick={() => scrollToSection('servicos')}>Ver Serviços</button>
          </div>
          <div className="hero-stats">
            <div className="stat"><span className="stat-num">2000+</span><span className="stat-label">Clientes</span></div>
            <div className="stat"><span className="stat-num">5.0</span><span className="stat-label">Avaliação</span></div>
            <div className="stat"><span className="stat-num">5+</span><span className="stat-label">Anos</span></div>
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

      <section id="galeria" className="secao secao-escura">
        <div className="container">
          <p className="secao-subtitle">PORTFÓLIO</p>
          <h2 className="secao-titulo">Nossos <span className="destaque">trabalhos</span></h2>
          <div className="galeria-grid">
            {['Fade', 'Undercut', 'Pompadour', 'Barba', 'Social', 'Moicano'].map(item => (
              <div key={item} className="galeria-item">
                <div className="galeria-item-img"><Scissors size={48} /></div>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="avaliacoes" className="secao">
        <div className="container">
          <p className="secao-subtitle">AVALIAÇÕES</p>
          <h2 className="secao-titulo">O que nossos <span className="destaque">clientes</span> dizem</h2>
          <div className="google-rating">
            <div className="rating-score">
              <span className="rating-num">5.0</span>
              <div className="rating-stars">
                <Star fill="#ffc107" color="#ffc107" size={24} />
                <Star fill="#ffc107" color="#ffc107" size={24} />
                <Star fill="#ffc107" color="#ffc107" size={24} />
                <Star fill="#ffc107" color="#ffc107" size={24} />
                <Star fill="#ffc107" color="#ffc107" size={24} />
              </div>
              <span className="rating-count">+200 avaliações</span>
            </div>
          </div>
          <div className="google-reviews">
            <div className="review-card">
              <div className="review-header"><div className="review-avatar">GM</div><div><strong>Geanderson</strong><div className="review-stars"><Star fill="#ffc107" color="#ffc107" size={16} /><Star fill="#ffc107" color="#ffc107" size={16} /><Star fill="#ffc107" color="#ffc107" size={16} /><Star fill="#ffc107" color="#ffc107" size={16} /><Star fill="#ffc107" color="#ffc107" size={16} /></div></div></div>
              <p className="review-text">"Atendimento e corte impecáveis!"</p>
            </div>
            <div className="review-card">
              <div className="review-header"><div className="review-avatar">CL</div><div><strong>Cliente Leal</strong><div className="review-stars"><Star fill="#ffc107" color="#ffc107" size={16} /><Star fill="#ffc107" color="#ffc107" size={16} /><Star fill="#ffc107" color="#ffc107" size={16} /><Star fill="#ffc107" color="#ffc107" size={16} /><Star fill="#ffc107" color="#ffc107" size={16} /></div></div></div>
              <p className="review-text">"Corto há mais de 5 anos. Excelência!"</p>
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
              <div className="info-item"><span className="info-icone"><MapPin size={24} /></span><div><strong>Endereço</strong><p>R. Potiguara, 974 - Canudos</p></div></div>
              <div className="info-item"><span className="info-icone"><Phone size={24} /></span><div><strong>Telefone</strong><p>(51) 98130-1035</p></div></div>
              <div className="info-item"><span className="info-icone"><Clock size={24} /></span><div><strong>Horário</strong><p>Terça a Sexta: 9h às 19:30h</p><p>Sábado: 9h às 17h</p></div></div>
              <a href="https://wa.me/5551981301035" target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><MessageCircle size={20} /> Agendar pelo WhatsApp</a>
            </div>
            <div className="contato-form">
              <h3>Envie uma mensagem</h3>
              {enviado && (<div className="sucesso-msg"><CheckCircle size={18} /> Agendamento enviado!<p className="link-acompanhar"><a href="#/agendamento">Acompanhe aqui</a></p></div>)}
              <form onSubmit={enviarFormulario}>
                <div className="form-grupo"><label htmlFor="nome">Nome</label><input type="text" id="nome" placeholder="Seu nome" value={formNome} onChange={e => setFormNome(e.target.value)} required disabled={loading} maxLength={100} /></div>
                <div className="form-grupo"><label htmlFor="telefone">Telefone</label><input type="tel" id="telefone" placeholder="(51) 99999-9999" value={formTelefone} onChange={e => setFormTelefone(e.target.value)} required disabled={loading} /></div>
                <div className="form-grupo"><label htmlFor="servico">Serviço</label><select id="servico" value={formServico} onChange={e => setFormServico(e.target.value)} required disabled={loading}><option value="">Selecione...</option>{SERVICOS.map(s => <option key={s.id} value={s.nome}>{s.nome} — {s.preco}</option>)}</select></div>
                <div className="form-grupo"><label htmlFor="horario">Data e Horário</label><select id="horario" value={horario} onChange={e => setHorario(e.target.value)} required disabled={loading}><option value="">Selecione...</option>{horariosDisponiveis.map(h => { const d = new Date(h); const dia = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()]; return <option key={h} value={h}>{dia} {String(d.getDate()).padStart(2,'0')}/{String(d.getMonth()+1).padStart(2,'0')} às {h.split('T')[1]}</option> })}</select></div>
                <div className="form-grupo"><label htmlFor="mensagem">Mensagem</label><textarea id="mensagem" placeholder="Opcional" value={formMensagem} onChange={e => setFormMensagem(e.target.value)} disabled={loading} maxLength={500}></textarea></div>
                {erro && <p className="erro-msg">{erro}</p>}
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Enviando...' : 'Enviar'}</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="logo footer-logo"><span className="logo-icon"><Scissors size={24} /></span><span className="logo-text">MORAIS<span className="logo-highlight"> BARBER</span></span></div>
              <p className="footer-desc">O melhor da barbearia masculina em um só lugar.</p>
            </div>
            <div className="footer-col"><h4>Contato</h4><ul><li>📍 R. Potiguara, 974</li><li>📞 (51) 98130-1035</li><li>🕐 Ter-Sex 9h-19:30h</li></ul></div>
          </div>
          <div className="footer-bottom"><p>© 2026 Morais Barber. Todos os direitos reservados.</p></div>
        </div>
      </footer>
    </div>
  )
}
