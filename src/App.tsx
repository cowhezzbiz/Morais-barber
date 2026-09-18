import { useState } from 'react'
import { supabase } from './supabase'
import './App.css'

interface Servico {
  id: number
  nome: string
  descricao: string
  preco: string
  duracao: string
  icone: string
}

interface Depoimento {
  id: number
  nome: string
  texto: string
  estrelas: number
  foto: string
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
    { id: 1, nome: 'Corte Masculino', descricao: 'Corte moderno e personalizado, lavagem e finalização incluso.', preco: 'R$ 45', duracao: '40 min', icone: '✂️' },
    { id: 2, nome: 'Barba', descricao: 'Modelagem completa com navalha, toalha quente e hidratação.', preco: 'R$ 30', duracao: '30 min', icone: '🪒' },
    { id: 3, nome: 'Corte + Barba', descricao: 'Combo completo com desconto especial. O visual perfeito.', preco: 'R$ 65', duracao: '1h', icone: '👑' },
    { id: 4, nome: 'Sobrancelha', descricao: 'Design e limpeza de sobrancelha com navalha.', preco: 'R$ 15', duracao: '15 min', icone: '✨' },
    { id: 5, nome: 'Pigmentação', descricao: 'Camufla falhas no cabelo ou barba com pigmento natural.', preco: 'R$ 50', duracao: '45 min', icone: '🎨' },
    { id: 6, nome: 'Hidratação Capilar', descricao: 'Tratamento profundo para cabelos ressecados e danificados.', preco: 'R$ 35', duracao: '30 min', icone: '💧' },
    { id: 7, nome: 'Tatuagem', descricao: 'Tatuagens artísticas e personalizadas. Agende uma consulta.', preco: 'Consultar', duracao: 'Variável', icone: '🖋️' },
  ]

  const depoimentos: Depoimento[] = [
    { id: 1, nome: 'Lucas Mendes', texto: 'Melhor barbeiro da cidade! Sempre saio satisfeito. O ambiente é top e o atendimento é impecável.', estrelas: 5, foto: 'LM' },
    { id: 2, nome: 'Rafael Costa', texto: 'Corte sempre na régua. Profissional de primeira, recomendo demais!', estrelas: 5, foto: 'RC' },
    { id: 3, nome: 'André Silva', texto: 'Melhor custo-benefício. Corte rápido, bonito e barato. Já é meu barbeiro fixo!', estrelas: 5, foto: 'AS' },
  ]

  const galeria = [
    { id: 1, estilo: 'Fade degradê', desc: 'Corte degradê com acabamento perfeito' },
    { id: 2, estilo: 'Undercut', desc: 'Lateral raspada com volume no topo' },
    { id: 3, estilo: 'Pompadour', desc: 'Estilo clássico com finalização moderna' },
    { id: 4, estilo: 'Barba cheia', desc: 'Modelagem completa com navalha' },
    { id: 5, estilo: 'Social', desc: 'Corte elegante para o dia a dia' },
    { id: 6, estilo: 'Moicano', desc: 'Estilo moderno e ousado' },
  ]

  return (
    <div className="app">
      <nav className={`navbar ${menuAberto ? 'aberto' : ''}`}>
        <div className="nav-container">
          <div className="logo">
            <span className="logo-icon">✂️</span>
            <span className="logo-text">MORAIS<span className="logo-highlight"> BARBER</span></span>
          </div>

          <button className="menu-toggle" onClick={() => setMenuAberto(!menuAberto)} aria-label="Menu">
            <span className={`hamburger ${menuAberto ? 'ativo' : ''}`}></span>
          </button>

          <ul className={`nav-links ${menuAberto ? 'ativo' : ''}`}>
            <li><a href="#inicio" onClick={() => setMenuAberto(false)}>Início</a></li>
            <li><a href="#servicos" onClick={() => setMenuAberto(false)}>Serviços</a></li>
            <li><a href="#galeria" onClick={() => setMenuAberto(false)}>Galeria</a></li>
            <li><a href="#depoimentos" onClick={() => setMenuAberto(false)}>Depoimentos</a></li>
            <li><a href="#contato" onClick={() => setMenuAberto(false)}>Contato</a></li>
          </ul>

          <a href="#contato" className="btn-agendar-nav">Agendar</a>
        </div>
      </nav>

      <section id="inicio" className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-subtitle">✨ BARBearia CLÁSSICA ⚜️ TATTOO ⚜️</p>
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
                <div className="servico-icone">{servico.icone}</div>
                <h3>{servico.nome}</h3>
                <p className="servico-desc">{servico.descricao}</p>
                <div className="servico-info">
                  <span className="servico-preco">{servico.preco}</span>
                  <span className="servico-duracao">⏱ {servico.duracao}</span>
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
                <span>✂️</span>
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
                <li>✅ Profissional certificado e experiente</li>
                <li>✅ Ambiente climatizado e confortável</li>
                <li>✅ Produtos de primeira linha</li>
                <li>✅ Atendimento personalizado</li>
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
                <div className="galeria-item-img"><span>💈</span></div>
                <p>{item.estilo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="depoimentos" className="secao secao-escura">
        <div className="container">
          <p className="secao-subtitle">DEPOIMENTOS</p>
          <h2 className="secao-titulo">O que nossos <span className="destaque">clientes</span> dizem</h2>
          <div className="grid-depoimentos">
            {depoimentos.map(dep => (
              <div key={dep.id} className="card-depoimento">
                <div className="estrelas">{'★'.repeat(dep.estrelas)}</div>
                <p className="dep-texto">"{dep.texto}"</p>
                <div className="dep-autor">
                  <div className="dep-foto">{dep.foto}</div>
                  <div>
                    <strong className="dep-nome">{dep.nome}</strong>
                    <span className="dep-verificado">✓ Cliente verificado</span>
                  </div>
                </div>
              </div>
            ))}
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
                <span className="info-icone">📍</span>
                <div><strong>Endereço</strong><p>R. Potiguara, 974 - Canudos</p></div>
              </div>
              <div className="info-item">
                <span className="info-icone">📞</span>
                <div><strong>Telefone</strong><p>(51) 98130-1035</p></div>
              </div>
              <div className="info-item">
                <span className="info-icone">⏰</span>
                <div><strong>Horário</strong><p>Terça a Sexta: 9h às 19:30h</p><p>Sáb: 9h às 17h</p></div>
              </div>
              <div className="info-item">
                <span className="info-icone">📱</span>
                <div><strong>Redes Sociais</strong><p>@moraisbarber.tattoo</p></div>
              </div>
              <a href="https://wa.me/5551981301035" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">💬 Agendar pelo WhatsApp</a>
            </div>
            <div className="contato-form">
              <h3>Envie uma mensagem</h3>
              {enviado && <div className="sucesso-msg">✅ Agendamento enviado com sucesso! Aguarde a confirmação.</div>}
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
                  <label htmlFor="horario">📅 Data e Horário desejados</label>
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
                <span className="logo-icon">✂️</span>
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
                <li><a href="#depoimentos">Depoimentos</a></li>
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
                <li>📍 R. Potiguara, 974</li>
                <li>📞 (51) 98130-1035</li>
                <li>⏰ Ter-Sex 9h-19:30h</li>
                <li>📷 @moraisbarber.tattoo</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Morais Barber. Todos os direitos reservados.</p>
            <p>Feito com ❤️ para clientes incríveis.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
