import { useState } from 'react'
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

function App() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [abaGaleria, setAbaGaleria] = useState(0)
  const [formNome, setFormNome] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formServico, setFormServico] = useState('')
  const [formMensagem, setFormMensagem] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [horario, setHorario] = useState('')

  const enviarFormulario = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await supabase.from('agendamentos').insert({
        nome: formNome,
        telefone: formTelefone,
        servico: formServico,
        mensagem: formMensagem || '',
        status: 'pendente',
        horario_agendado: horario ? new Date(horario).toISOString() : null
      })

      const texto = `Olá! Gostaria de agendar um horário.\nNome: ${formNome}\nTelefone: ${formTelefone}\nServiço: ${formServico}\nHorário: ${horario}\nMensagem: ${formMensagem || 'Nenhuma'}`
      const url = `https://wa.me/5551981301035?text=${encodeURIComponent(texto)}`
      window.open(url, '_blank')

      setEnviado(true)
      setFormNome('')
      setFormTelefone('')
      setFormServico('')
      setFormMensagem('')
      setHorario('')
      setTimeout(() => setEnviado(false), 4000)
    } catch {
      alert('Erro ao enviar. Tente novamente.')
    }
  }

  const servicos: Servico[] = [
    { id: 1, nome: 'Corte Masculino', descricao: 'Corte moderno e personalizado, lavagem e finalização incluso.', preco: 'R$ 45', duracao: '40 min', icone: 'scissors' },
    { id: 2, nome: 'Barba', descricao: 'Modelagem completa com navalha, toalha quente e hidratação.', preco: 'R$ 30', duracao: '30 min', icone: 'razor' },
    { id: 3, nome: 'Corte + Barba', descricao: 'Combo completo com desconto especial. O visual perfeito.', preco: 'R$ 65', duracao: '1h', icone: 'crown' },
    { id: 4, nome: 'Sobrancelha', descricao: 'Design e limpeza de sobrancelha com navalha.', preco: 'R$ 15', duracao: '15 min', icone: 'sparkles' },
    { id: 5, nome: 'Pigmentação', descricao: 'Camufla falhas no cabelo ou barba com pigmento natural.', preco: 'R$ 50', duracao: '45 min', icone: 'palette' },
    { id: 6, nome: 'Hidratação Capilar', descricao: 'Tratamento profundo para cabelos ressecados e danificados.', preco: 'R$ 35', duracao: '30 min', icone: 'droplets' },
    { id: 7, nome: 'Tatuagem', descricao: 'Tatuagens artísticas e personalizadas. Agende uma consulta.', preco: 'Consultar', duracao: 'Variável', icone: 'pentool' },
  ]

  const getIcon = (name: string) => {
    const icons: any = {
      scissors: <Scissors size={32} />,
      razor: <Scissors size={32} />,
      crown: <Crown size={32} />,
      sparkles: <Sparkles size={32} />,
      palette: <Palette size={32} />,
      droplets: <Droplets size={32} />,
      pentool: <PenTool size={32} />,
    }
    return icons[name] || <Scissors size={32} />
  }

  const galeria = [
    { id: 1, estilo: 'Fade degradê' },
    { id: 2, estilo: 'Undercut' },
    { id: 3, estilo: 'Pompadour' },
    { id: 4, estilo: 'Barba cheia' },
    { id: 5, estilo: 'Social' },
    { id: 6, estilo: 'Moicano' },
  ]

  return (
    <div className="app">
      <nav className={`navbar ${menuAberto ? 'aberto' : ''}`}>
        <div className="nav-container">
          <div className="logo">
            <span className="logo-icon"><Scissors size={28} /></span>
            <span className="logo-text">MORAIS<span className="logo-highlight"> BARBER</span></span>
          </div>

          <button className="menu-toggle" onClick={() => setMenuAberto(!menuAberto)} aria-label="Menu">
            <span className={`hamburger ${menuAberto ? 'ativo' : ''}`}></span>
          </button>

          <ul className={`nav-links ${menuAberto ? 'ativo' : ''}`}>
            <li><a href="#inicio" onClick={() => setMenuAberto(false)}>Início</a></li>
            <li><a href="#servicos" onClick={() => setMenuAberto(false)}>Serviços</a></li>
            <li><a href="#galeria" onClick={() => setMenuAberto(false)}>Galeria</a></li>
            <li><a href="#avaliacoes" onClick={() => setMenuAberto(false)}>Avaliações</a></li>
            <li><a href="#contato" onClick={() => setMenuAberto(false)}>Contato</a></li>
          </ul>

          <a href="#contato" className="btn-agendar-nav">Agendar</a>
        </div>
      </nav>

      <section id="inicio" className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-subtitle">Barbearia Morais</p>
          <h1 className="hero-title">Onde estilo encontra <span className="destaque">excelência</span></h1>
          <p className="hero-desc">
            Cortes modernos, barba feita com capricho e tatuagens artísticas.
            Um ambiente pensado pra você se sentir bem. Agende seu horário e transforme seu visual.
          </p>
          <div className="hero-botoes">
            <a href="#contato" className="btn btn-primary">Agendar Horário</a>
            <a href="#servicos" className="btn btn-outline">Ver Serviços</a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">2000+</span>
              <span className="stat-label">Clientes felizes</span>
            </div>
            <div className="stat">
              <span className="stat-num">5★</span>
              <span className="stat-label">Avaliação</span>
            </div>
            <div className="stat">
              <span className="stat-num">5+</span>
              <span className="stat-label">Anos de experiência</span>
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="secao">
        <div className="container">
          <p className="secao-subtitle">NOSSOS SERVIÇOS</p>
          <h2 className="secao-titulo">O que fazemos de <span className="destaque">melhor</span></h2>
          <p className="secao-desc">Serviços pensados pra você sair com o visual impecável.</p>
          <div className="grid-servicos">
            {servicos.map(servico => (
              <div key={servico.id} className="card-servico">
                <div className="servico-icone">{getIcon(servico.icone)}</div>
                <h3>{servico.nome}</h3>
                <p className="servico-desc">{servico.descricao}</p>
                <div className="servico-info">
                  <span className="servico-preco">{servico.preco}</span>
                  <span className="servico-duracao"><Clock size={16} /> {servico.duracao}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="secao secao-escura">
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
              <p className="sobre-p">A Morais Barber nasceu da paixão por transformar visagismo e autoestima. Nosso barbeiro tem mais de 5 anos de experiência e sempre se mantém atualizado com as últimas tendências e técnicas do mercado.</p>
              <p className="sobre-p">Aqui você encontra um ambiente descontraído, cerveja gelada e o melhor atendimento da cidade. Cada cliente é tratado de forma única e personalizada.</p>
              <ul className="sobre-lista">
                <li><CheckCircle size={18} /> Profissional certificado e experiente</li>
                <li><CheckCircle size={18} /> Ambiente climatizado e confortável</li>
                <li><CheckCircle size={18} /> Produtos de primeira linha</li>
                <li><CheckCircle size={18} /> Atendimento personalizado</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="galeria" className="secao">
        <div className="container">
          <p className="secao-subtitle">PORTFÓLIO</p>
          <h2 className="secao-titulo">Nossos <span className="destaque">trabalhos</span></h2>
          <p className="secao-desc">Confira alguns cortes realizados por nosso barbeiro.</p>
          <div className="galeria-tabs">
            {galeria.map((item, index) => (
              <button key={item.id} className={`galeria-tab ${abaGaleria === index ? 'ativa' : ''}`} onClick={() => setAbaGaleria(index)}>
                {item.estilo}
              </button>
            ))}
          </div>
          <div className="galeria-grid">
            {galeria.map((item) => (
              <div key={item.id} className="galeria-item">
                <div className="galeria-item-img">
                  <Scissors size={48} />
                </div>
                <p>{item.estilo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="avaliacoes" className="secao secao-escura">
        <div className="container">
          <p className="secao-subtitle">AVALIAÇÕES</p>
          <h2 className="secao-titulo">O que nossos <span className="destaque">clientes</span> dizem no Google</h2>
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
              <div className="review-header">
                <div className="review-avatar">LM</div>
                <div>
                  <strong>Lucas Mendes</strong>
                  <div className="review-stars">
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                  </div>
                </div>
              </div>
              <p className="review-text">"Melhor barbeiro da cidade! Sempre saio satisfeito. O ambiente é top e o atendimento é impecável."</p>
              <span className="review-source">Google Reviews</span>
            </div>
            <div className="review-card">
              <div className="review-header">
                <div className="review-avatar">RC</div>
                <div>
                  <strong>Rafael Costa</strong>
                  <div className="review-stars">
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                  </div>
                </div>
              </div>
              <p className="review-text">"Corte sempre na régua. Profissional de primeira, recomendo demais!"</p>
              <span className="review-source">Google Reviews</span>
            </div>
            <div className="review-card">
              <div className="review-header">
                <div className="review-avatar">AS</div>
                <div>
                  <strong>André Silva</strong>
                  <div className="review-stars">
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                    <Star fill="#ffc107" color="#ffc107" size={16} />
                  </div>
                </div>
              </div>
              <p className="review-text">"Melhor custo-benefício. Corte rápido, bonito e barato. Já é meu barbeiro fixo!"</p>
              <span className="review-source">Google Reviews</span>
            </div>
          </div>
        </div>
      </section>

      <section id="contato" className="secao">
        <div className="container">
          <p className="secao-subtitle">CONTATO</p>
          <h2 className="secao-titulo">Agende seu <span className="destaque">horário</span></h2>
          <p className="secao-desc">Escolha o melhor dia e horário pra você.</p>
          <div className="contato-grid">
            <div className="contato-info">
              <div className="info-item">
                <span className="info-icone"><MapPin size={28} /></span>
                <div><strong>Endereço</strong><p>R. Potiguara, 974 - Canudos</p></div>
              </div>
              <div className="info-item">
                <span className="info-icone"><Phone size={28} /></span>
                <div><strong>Telefone</strong><p>(51) 98130-1035</p></div>
              </div>
              <div className="info-item">
                <span className="info-icone"><Clock size={28} /></span>
                <div><strong>Horário</strong><p>Terça a Sexta: 9h às 19:30h</p><p>Sáb: 9h às 17h</p></div>
              </div>
              <div className="info-item">
                <span className="info-icone"><Phone size={28} /></span>
                <div><strong>Redes Sociais</strong><p>@moraisbarber.tattoo</p></div>
              </div>
              <a href="https://wa.me/5551981301035" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                <MessageCircle size={20} /> Agendar pelo WhatsApp
              </a>
            </div>
            <div className="contato-form">
              <h3>Envie uma mensagem</h3>
              {enviado && <div className="sucesso-msg"><CheckCircle size={18} /> Agendamento enviado com sucesso! Aguarde a confirmação.</div>}
              <form onSubmit={enviarFormulario}>
                <div className="form-grupo">
                  <label htmlFor="nome">Nome</label>
                  <input type="text" id="nome" placeholder="Seu nome" value={formNome} onChange={e => setFormNome(e.target.value)} required />
                </div>
                <div className="form-grupo">
                  <label htmlFor="telefone">Telefone</label>
                  <input type="tel" id="telefone" placeholder="(51) 99999-9999" value={formTelefone} onChange={e => setFormTelefone(e.target.value)} required />
                </div>
                <div className="form-grupo">
                  <label htmlFor="servico">Serviço</label>
                  <select id="servico" value={formServico} onChange={e => setFormServico(e.target.value)} required>
                    <option value="">Selecione...</option>
                    {servicos.map(s => <option key={s.id} value={s.nome}>{s.nome} — {s.preco}</option>)}
                  </select>
                </div>
                <div className="form-grupo">
                  <label htmlFor="horario"><Clock size={16} /> Data e Horário desejados</label>
                  <input type="datetime-local" id="horario" value={horario} onChange={e => setHorario(e.target.value)} />
                </div>
                <div className="form-grupo">
                  <label htmlFor="mensagem">Mensagem (opcional)</label>
                  <textarea id="mensagem" rows={3} placeholder="Alguma preferência?" value={formMensagem} onChange={e => setFormMensagem(e.target.value)}></textarea>
                </div>
                <button type="submit" className="btn btn-primary btn-full">Enviar Mensagem</button>
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
                <span className="logo-icon"><Scissors size={28} /></span>
                <span className="logo-text">MORAIS<span className="logo-highlight"> BARBER</span></span>
              </div>
              <p className="footer-desc">O melhor da barbearia masculina em um só lugar. Corte, barba e estilo com excelência.</p>
            </div>
            <div className="footer-col">
              <h4>Links Rápidos</h4>
              <ul>
                <li><a href="#inicio">Início</a></li>
                <li><a href="#servicos">Serviços</a></li>
                <li><a href="#galeria">Galeria</a></li>
                <li><a href="#avaliacoes">Avaliações</a></li>
                <li><a href="#contato">Contato</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Serviços</h4>
              <ul>
                <li><a href="#servicos">Corte Masculino</a></li>
                <li><a href="#servicos">Barba</a></li>
                <li><a href="#servicos">Corte + Barba</a></li>
                <li><a href="#servicos">Sobrancelha</a></li>
                <li><a href="#servicos">Pigmentação</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Contato</h4>
              <ul>
                <li><MapPin size={16} /> R. Potiguara, 974</li>
                <li><Phone size={16} /> (51) 98130-1035</li>
                <li><Clock size={16} /> Ter-Sex 9h-19:30h</li>
                <li><Phone size={16} /> @moraisbarber.tattoo</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Morais Barber. Todos os direitos reservados.</p>
            <p>Feito com carinho para clientes incríveis.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
