import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import { GalleryImage, Banner, TestimonialCard, StatItem, PremiumButton, IMAGES } from './ComponentsPremium'
import { CalendarCheck, BadgeCheck, BellRing, XCircle, MapPin, Phone, Clock, ChevronDown, CheckCircle, Scissors, Sparkles, PenTool, MessageCircle } from 'lucide-react'
import './preview.css'
import './App.css'

interface Servico {
  id: number
  nome: string
  descricao: string
  preco: string
  duracao: string
}

const SERVICOS: Servico[] = [
  { id: 1, nome: 'Corte', descricao: 'Corte personalizado com navalha. Para quem quer look impecável.', preco: 'R$ 35', duracao: '50 min' },
  { id: 2, nome: 'Barba', descricao: 'Modelagem completa de barba com toalha quente.', preco: 'R$ 30', duracao: '40 min' },
  { id: 3, nome: 'Combo Completo', descricao: 'Corte + Barba. O visual completo em uma sessão.', preco: 'R$ 60', duracao: '1h15min' },
  { id: 4, nome: 'Tatuagem', descricao: 'Tatuagens artísticas e personalizadas. Agende uma consulta.', preco: 'Consultar', duracao: 'Variável' },
]

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

// ===== PIX BR Code =====
const PIX_CHAVE = '51981301035'
const PIX_NOME = 'MORAIS BARBER'
const PIX_CIDADE = 'NOVO HAMBURGO'

function crc16(str: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, '0') + value
}

function gerarPixPayload(valor: number): string {
  const gui = tlv('00', 'br.gov.bcb.pix') + tlv('01', PIX_CHAVE)
  const mai = tlv('00', PIX_NOME.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25)) + tlv('01', PIX_CIDADE.toUpperCase().slice(0, 15))
  const valorStr = valor > 0 ? tlv('54', valor.toFixed(2)) : ''
  const payload =
    tlv('00', '01') +
    tlv('26', gui) +
    tlv('52', '0000') +
    tlv('53', '986') +
    valorStr +
    tlv('58', 'BR') +
    tlv('59', PIX_NOME.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25)) +
    tlv('60', PIX_CIDADE.toUpperCase().slice(0, 15)) +
    tlv('62', tlv('05', '***'))
  return payload + '6304' + crc16(payload + '6304')
}

const FAQS = [
  { p: 'Preciso ligar ou mandar mensagem pra confirmar?', r: 'Não. Quando você agenda pelo site, o horário já fica confirmado na hora. Você recebe um token pra acompanhar e cancelar se precisar.' },
  { p: 'Consigo cancelar se surgir algo?', r: 'Sim! Com o token do agendamento você cancela sozinho no site, até 2h antes do horário. Depois disso é só chamar no WhatsApp.' },
  { p: 'Como funciona o pagamento?', r: 'Você escolhe: pagar na hora (PIX, dinheiro ou cartão lá na barbearia) ou adiantar por PIX na hora de agendar e garantir o horário.' },
  { p: 'Preciso baixar algum aplicativo?', r: 'Não. Tudo funciona direto no navegador do celular, pelo link do site. Simples assim.' },
  { p: 'Vou receber lembrete do horário?', r: 'Sim — guarde seu token. E se você pagou por PIX, o barbeiro confirma o pagamento assim que o comprovante for verificado.' },
]

export default function App() {
  const [formNome, setFormNome] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formServico, setFormServico] = useState('')
  const [formMensagem, setFormMensagem] = useState('')
  const [horario, setHorario] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [tokenGerado, setTokenGerado] = useState('')
  const [tokenCopiado, setTokenCopiado] = useState(false)
  const [tentativas, setTentativas] = useState(0)
  const [ultimoTentativa, setUltimoTentativa] = useState(0)
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'pix_na_hora'>('pix_na_hora')
  const [pixPago, setPixPago] = useState(false)
  const [confirmandoPix, setConfirmandoPix] = useState(false)
  const [valorAgendado, setValorAgendado] = useState(0)
  const [comprovante, setComprovante] = useState('')
  const [pixInicioEm, setPixInicioEm] = useState(0)
  const [, setTick] = useState(0) // força re-render pro timer do PIX andar
  const [faqAberta, setFaqAberta] = useState<number | null>(0)

  const isBot = honeypot.length > 0
  const podeEnviar = tentativas < 3 || (Date.now() - ultimoTentativa) > 60000

  useEffect(() => {
    if (erro) {
      const timer = setTimeout(() => setErro(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [erro])

  // Timer do PIX: atualiza o contador a cada 30s enquanto espera pagamento
  useEffect(() => {
    if (!enviado || formaPagamento !== 'pix' || pixPago) return
    const t = setInterval(() => setTick(v => v + 1), 30000)
    return () => clearInterval(t)
  }, [enviado, formaPagamento, pixPago])

  // ===== Grade de horários =====
  const gerarHorariosDoDia = (data: Date): string[] => {
    const diaSemana = data.getDay()
    if (diaSemana === 0 || diaSemana === 1) return []
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    const horarios: string[] = []
    const push = (h: number, m: number) => horarios.push(`${ano}-${mes}-${dia}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    if (diaSemana >= 2 && diaSemana <= 5) {
      for (let h = 9; h < 12; h++) { push(h, 0); push(h, 30) }
      for (let h = 14; h < 19; h++) { push(h, 0); push(h, 30) }
      push(19, 0); push(19, 30)
    } else if (diaSemana === 6) {
      for (let h = 9; h < 17; h++) { push(h, 0); push(h, 30) }
      push(17, 0)
    }
    return horarios
  }

  const datasDisponiveis = useMemo(() => {
    const datas: Date[] = []
    const hoje = new Date()
    for (let i = 0; i < 28; i++) {
      const d = new Date(hoje)
      d.setDate(hoje.getDate() + i)
      const dow = d.getDay()
      if (dow === 0 || dow === 1) continue
      datas.push(d)
    }
    return datas
  }, [])

  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null)
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([])
  const [carregandoGrade, setCarregandoGrade] = useState(false)

  // ===== Agenda da Semana (tabela estilo Excel) =====
  // Semana atual: ter-sáb (pula dom/seg). Colunas = dias, linhas = horários.
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [gradeSemanaOcupados, setGradeSemanaOcupados] = useState<string[]>([])
  const [gradeSemanaCarregando, setGradeSemanaCarregando] = useState(true)

  const diasDaSemana = useMemo(() => {
    const hoje = new Date()
    // Acha a terça da semana atual (ou da semana seguinte se hoje for dom/seg)
    const dow = hoje.getDay() // 0=Dom
    let base: Date
    if (dow === 0) base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 2 + semanaOffset * 7)
    else if (dow === 1) base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1 + semanaOffset * 7)
    else base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (dow - 2) + semanaOffset * 7)
    // Ter, Qua, Qui, Sex, Sáb — FILTRA dias que já passaram
    const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    return [0, 1, 2, 3, 4].map(i => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return d
    }).filter(d => d >= hojeZero)
  }, [semanaOffset])

  // Todos os horários possíveis (linhas da tabela): união dos horários de ter-sáb
  const linhasHorarios = useMemo(() => {
    const set = new Set<string>()
    for (const d of diasDaSemana) {
      for (const h of gerarHorariosDoDia(d)) set.add(h.split('T')[1])
    }
    return Array.from(set).sort()
  }, [diasDaSemana])

  useEffect(() => {
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const ini = diasDaSemana[0]
    const fim = diasDaSemana[diasDaSemana.length - 1]
    setGradeSemanaCarregando(true)
    fetch(`https://croscmpnezlixszygyka.supabase.co/functions/v1/horarios-ocupados?inicio=${fmt(ini)}&fim=${fmt(fim)}`, {
      headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }
    })
      .then(r => r.json())
      .then(res => {
        const locais = (res.ocupados || []).map((iso: string) => {
          const d = new Date(iso)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        })
        setGradeSemanaOcupados(locais)
      })
      .catch(() => setGradeSemanaOcupados([]))
      .finally(() => setGradeSemanaCarregando(false))
  }, [diasDaSemana])

  const chaveHorario = (d: Date, hora: string) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${hora}`

  // Clicou num horário verde da grade → pré-preenche o formulário e rola até ele
  const escolherDaGrade = (d: Date, hora: string) => {
    const chave = chaveHorario(d, hora)
    if (gradeSemanaOcupados.includes(chave)) return
    const hoje = new Date()
    if (d.toDateString() === hoje.toDateString() && new Date(chave).getTime() < Date.now()) return
    setDataSelecionada(d)
    setHorario(chave)
    scrollTo('agendar')
  }

  useEffect(() => {
    if (!dataSelecionada) return
    const dataISOBase = `${dataSelecionada.getFullYear()}-${String(dataSelecionada.getMonth() + 1).padStart(2, '0')}-${String(dataSelecionada.getDate()).padStart(2, '0')}`
    setCarregandoGrade(true)
    fetch(`https://croscmpnezlixszygyka.supabase.co/functions/v1/horarios-ocupados?data=${dataISOBase}`, {
      headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }
    })
      .then(r => r.json())
      .then(res => {
        const locais = (res.ocupados || []).map((iso: string) => {
          const d = new Date(iso)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        })
        setHorariosOcupados(locais)
      })
      .catch(() => setHorariosOcupados([]))
      .finally(() => setCarregandoGrade(false))
  }, [dataSelecionada])

  const agoraMs = Date.now()
  const horariosDoDia = dataSelecionada ? gerarHorariosDoDia(dataSelecionada) : []
  const horarioPassado = (h: string) => {
    if (!dataSelecionada) return false
    const hoje = new Date()
    const mesmoDia = dataSelecionada.toDateString() === hoje.toDateString()
    return mesmoDia && new Date(h).getTime() < agoraMs
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormTelefone(formatPhone(e.target.value))
  }

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const enviarFormulario = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (isBot) return
    if (!podeEnviar) { setErro('Muitas tentativas. Aguarde 1 minuto.'); return }
    const telefoneDigits = formTelefone.replace(/\D/g, '')
    if (!isValidPhone(formTelefone)) { setErro('Telefone inválido. Digite pelo menos 10 dígitos.'); return }
    if (!horario) { setErro('Escolha um horário na agenda.'); return }

    setLoading(true)
    setTentativas(t => t + 1)
    setUltimoTentativa(Date.now())

    try {
      const nomeSanitizado = formNome.replace(/<[^>]*>/g, '').trim().slice(0, 100)
      const mensagemSanitizada = formMensagem.replace(/<[^>]*>/g, '').trim().slice(0, 500)
      const servicoSelecionado = SERVICOS.find(s => s.nome === formServico)
      const valorServico = servicoSelecionado ? parseFloat(servicoSelecionado.preco.replace('R$ ', '')) || 0 : 0
      setValorAgendado(valorServico)

      const response = await fetch('https://croscmpnezlixszygyka.supabase.co/functions/v1/agendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          nome: nomeSanitizado,
          telefone: telefoneDigits,
          servico: formServico,
          mensagem: mensagemSanitizada,
          horario_agendado: horario || null,
          forma_pagamento: formaPagamento
        })
      })

      const result = await response.json()
      if (!response.ok) { setErro(result.error || 'Erro ao enviar.'); setLoading(false); return }

      if (result.token) {
        setTokenGerado(result.token)
        try { localStorage.setItem('ultimo_token', result.token) } catch {}
      }
      setEnviado(true)
      setPixPago(false)
      setPixInicioEm(Date.now())
      setTentativas(0)
      setFormNome(''); setFormTelefone(''); setFormServico(''); setFormMensagem(''); setHorario('')
    } catch (err: unknown) {
      setErro(`Erro: ${err instanceof Error ? err.message : 'Erro ao enviar.'}`)
    } finally {
      setLoading(false)
    }
  }

  const confirmarPix = async () => {
    if (!tokenGerado || comprovante.length < 20) return
    setConfirmandoPix(true)
    try {
      const response = await fetch('https://croscmpnezlixszygyka.supabase.co/functions/v1/confirmar-pagamento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ token: tokenGerado, comprovante })
      })
      const result = await response.json()
      if (response.ok) setPixPago(true)
      else setErro(result.error || 'Erro ao enviar comprovante.')
    } catch {
      setErro('Erro de conexão ao enviar comprovante.')
    } finally {
      setConfirmandoPix(false)
    }
  }

  const pixPayload = gerarPixPayload(valorAgendado)

  return (
    <div className="pv-app">
      {/* ===== Barra topo ===== */}
      <header className="pv-topo">
        <div className="pv-container pv-topo-inner">
          <span className="pv-logo">MORAIS<span> BARBER</span></span>
          <nav className="pv-nav">
            <button onClick={() => scrollTo('servicos')}>Serviços</button>
            <button onClick={() => scrollTo('como-funciona')}>Como funciona</button>
            <button onClick={() => scrollTo('faq')}>Dúvidas</button>
            </nav>
          <button className="pv-btn pv-btn-dourado" onClick={() => scrollTo('agendar')}>Agendar agora</button>
        </div>
      </header>

      {/* ===== BANNER HERO COM IMAGEM ===== */}
      <section className="pv-hero" style={{ position: 'relative', minHeight: '90vh', display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: '0',
          }}
        >
          <img
            src={IMAGES.hero}
            alt="Morais Barber - Barbearia premium em Novo Hamburgo"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              opacity: 0.7,
            }}
            loading="eager"
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.7) 100%)',
            }}
          />
        </div>
        <div className="pv-container" style={{ position: 'relative', zIndex: 1 }}>
          <span className="pv-badge"><CalendarCheck size={14} /> Confirmação na hora · sem ligação</span>
          <h1 className="pv-h1">
            Seu corte, agendado<br />em <span className="pv-destaque">30 segundos</span>.
          </h1>
          <p className="pv-sub">
            Veja a agenda da barbearia em tempo real, toque no horário livre<br className="pv-only-desktop" />
            e pronto — confirmado na hora. Sem espera, sem mensagem, sem caderno.
          </p>
          <div className="pv-hero-cta">
            <button className="pv-btn pv-btn-dourado pv-btn-grande" onClick={() => scrollTo('agendar')}>
              Agendar meu horário
            </button>
            <button className="pv-btn pv-btn-fantasma pv-btn-grande" onClick={() => scrollTo('como-funciona')}>
              Ver como funciona
            </button>
          </div>
          <div className="pv-hero-selos">
            <span><BadgeCheck size={15} /> Horário garantido</span>
            <span><BellRing size={15} /> Lembrete automático</span>
            <span><XCircle size={15} /> Cancele até 2h antes</span>
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section className="pv-secao" id="como-funciona">
        <div className="pv-container">
          <p className="pv-eyebrow">SEM COMPROMISSO</p>
          <h2 className="pv-h2">Agendar é simples assim</h2>
          <div className="pv-passos">
            <div className="pv-passo">
              <span className="pv-passo-num">1</span>
              <h3>Escolha o serviço</h3>
              <p>Corte, barba, combo ou tatuagem — com preço na tela, sem surpresa.</p>
            </div>
            <div className="pv-passo">
              <span className="pv-passo-num">2</span>
              <h3>Toque no horário verde</h3>
              <p>A agenda mostra os horários livres em verde e os reservados em vermelho. Um toque e é seu.</p>
            </div>
            <div className="pv-passo">
              <span className="pv-passo-num">3</span>
              <h3>Pronto, confirmado</h3>
              <p>Você recebe um token pra acompanhar, pagar por PIX se quiser e cancelar se precisar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SERVIÇOS - CARDS PREMIUM COM HOVER ===== */}
      <section className="pv-secao pv-secao-escura" id="servicos">
        <div className="pv-container">
          <p className="pv-eyebrow">TABELA DE PREÇOS</p>
          <h2 className="pv-h2">Escolha seu estilo</h2>
          <p className="pv-secao-desc" style={{ marginBottom: '50px' }}>
            Cada serviço com técnica e atenção que você merece. Toque no card pra agendar.
          </p>
          <div
            className="services-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
            }}
          >
            {SERVICOS.map((s, idx) => (
              <div
                key={s.id}
                className="service-card"
                onClick={() => { scrollTo('agendar'); setTimeout(() => setFormServico(s.nome), 400) }}
                style={{
                  background: '#111111',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  padding: '32px 28px',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget
                  el.style.background = 'linear-gradient(135deg, #1a1a1a, #151515)'
                  el.style.borderColor = '#c8963e'
                  el.style.boxShadow = '0 8px 40px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,150,62,0.12)'
                  el.style.transform = 'translateY(-4px)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget
                  el.style.background = '#111111'
                  el.style.borderColor = 'rgba(255,255,255,0.06)'
                  el.style.boxShadow = 'none'
                  el.style.transform = 'translateY(0)'
                }}
              >
                {/* Gradient de fundo */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    background: 'radial-gradient(circle at 50% 0%, rgba(200,150,62,0.08) 0%, transparent 70%)',
                    transition: 'opacity 0.4s ease',
                    pointerEvents: 'none',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                />

                {/* Ícone */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(200,150,62,0.15), rgba(200,150,62,0.02))',
                    border: '1px solid rgba(200,150,62,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    zIndex: 1,
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget
                    el.style.transform = 'scale(1.1) rotate(-3deg)'
                    el.style.background = 'linear-gradient(135deg, rgba(200,150,62,0.2), rgba(200,150,62,0.05))'
                    el.style.borderColor = 'rgba(200,150,62,0.4)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget
                    el.style.transform = 'scale(1)'
                    el.style.background = 'linear-gradient(135deg, rgba(200,150,62,0.15), rgba(200,150,62,0.02))'
                    el.style.borderColor = 'rgba(200,150,62,0.2)'
                  }}
                >
                  {idx === 0 && <Scissors size={24} color="#c8963e" />}
                  {idx === 1 && <Sparkles size={24} color="#c8963e" />}
                  {idx === 2 && <Sparkles size={24} color="#c8963e" />}
                  {idx === 3 && <PenTool size={24} color="#c8963e" />}
                </div>

                {/* Conteúdo */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h3
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#ffffff',
                      marginBottom: '8px',
                      transition: 'color 0.3s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#c8963e'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                  >
                    {s.nome}
                  </h3>
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.55)',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      marginBottom: '20px',
                    }}
                  >
                    {s.descricao}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                      paddingTop: '16px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Inter, monospace',
                        fontSize: '26px',
                        fontWeight: '700',
                        color: '#c8963e',
                        letterSpacing: '-0.5px',
                      }}
                    >
                      {s.preco}
                    </span>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {s.duracao}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PROVA SOCIAL - DEPOIMENTOS PREMIUM ===== */}
      <section className="pv-secao" id="depoimentos">
        <div className="pv-container">
          <p className="pv-eyebrow">QUEM JÁ SENTOU NA CADEIRA</p>
          <h2 className="pv-h2">Resultado que se vê no espelho</h2>
          <p className="pv-secao-desc" style={{ marginBottom: '30px' }}>
            Depoimentos de quem já experimentou o corte na Morais Barber.
          </p>
          <TestimonialCard
            name="Camila Santos"
            text="Ótimo ambiente, espaço amplo e serviço de qualidade. O melhor da região!"
            avatarUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&facepad=2"
          />
          <TestimonialCard
            name="Luke Oliveira"
            text="Preço justo, indico demais o trabalho do Renan! Profissionalismo de outra galáxia."
            avatarUrl="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80&facepad=2"
          />
          <TestimonialCard
            name="Murillo Ferreira"
            text="O cabeleireiro bem massa, o corte ficou muito bom. Aprovado demais!"
            avatarUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80&facepad=2"
          />
          {/* ===== GALERIA DE IMAGENS ===== */}
          <section className="pv-secao" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
            <div className="pv-container">
              <p className="pv-eyebrow">NO QUE VOCÊ VAI ENCONTRAR</p>
              <h2 className="pv-h2">Ambiente e qualidade</h2>
              <p className="pv-secao-desc" style={{ marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
                Um espaço pensado pra você ter a melhor experiência.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                    {IMAGES.gallery.map((img) => (
                      <GalleryImage key={img.id} src={img.src} label={img.label} alt={img.alt} />
                    ))}
                  </div>
            </div>
          </section>
        </div>
      </section>

      {/* ===== AGENDAR (form) ===== */}
      <section className="pv-secao pv-secao-escura" id="agendar">
        <div className="pv-container">
          <p className="pv-eyebrow">AGENDA EM TEMPO REAL</p>
          <h2 className="pv-h2">Garanta seu horário</h2>
          <p className="pv-secao-desc">Os horários em <strong className="pv-verde">verde</strong> estão livres. Toque, preencha e confirme.</p>

          <div className="pv-form-card">
            {enviado ? (
              <div className="pv-sucesso">
                <div className="pv-sucesso-titulo"><CheckCircle size={24} /> Agendamento confirmado!</div>
                {formaPagamento === 'pix' && !pixPago && (
                  <div className="pv-pix-box">
                    <span className="pv-pix-titulo">Pague com PIX pra garantir</span>
                    <div className="pv-pix-timer">
                      ⏳ Seu horário fica reservado por <strong>{Math.max(0, 15 - Math.floor((Date.now() - pixInicioEm) / 60000))} min</strong>
                    </div>
                    <div className="pv-pix-qr">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(pixPayload)}`} alt="QR Code PIX" />
                    </div>
                    <p className="pv-pix-aviso">
                      {valorAgendado > 0 ? `Valor: R$ ${valorAgendado.toFixed(2).replace('.', ',')}. ` : ''}
                      Depois de pagar, cole o texto do comprovante (aparece no app do banco) pra confirmar:
                    </p>
                    <input
                      type="text"
                      className="pv-comprovante-input"
                      value={comprovante}
                      onChange={e => setComprovante(e.target.value)}
                      placeholder="Copie e cole o texto do comprovante PIX (do app do banco)"
                      maxLength={2000}
                      disabled={pixPago || confirmandoPix}
                    />
                    <button className="pv-btn pv-btn-dourado" onClick={confirmarPix} disabled={confirmandoPix || comprovante.length < 30}>
                      {confirmandoPix ? 'Enviando...' : 'Enviar comprovante'}
                    </button>
                    {pixPago && <div className="pv-pix-ok">✓ Comprovante recebido! Assim que for verificado, seu horário fica garantido.</div>}
                  </div>
                )}
                {formaPagamento === 'pix_na_hora' && (
                  <p className="pv-sucesso-desc">Seu horário já está reservado. Pague na hora (PIX, dinheiro ou cartão). Te esperamos!</p>
                )}
                {tokenGerado && (
                  <div className="pv-token">
                    <span>Guarde seu token de acompanhamento:</span>
                    <code>{tokenGerado}</code>
                    <button onClick={() => { navigator.clipboard.writeText(tokenGerado); setTokenCopiado(true); setTimeout(() => setTokenCopiado(false), 2000) }}>
                      {tokenCopiado ? '✓ Copiado!' : 'Copiar'}
                    </button>
                    <a href="#/agendamento" className="pv-btn pv-btn-fantasma">Acompanhar / cancelar</a>
                  </div>
                )}
                <button className="pv-btn pv-btn-fantasma" onClick={() => setEnviado(false)}>Fazer outro agendamento</button>
              </div>
            ) : (
              <form onSubmit={enviarFormulario}>
                <div className="pv-form-grid">
                  <div className="pv-form-grupo">
                    <label>Seu nome</label>
                    <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} required disabled={loading} maxLength={100} placeholder="Como te chamamos?" />
                  </div>
                  <div className="pv-form-grupo">
                    <label>WhatsApp</label>
                    <input type="tel" value={formTelefone} onChange={handleTelefoneChange} required disabled={loading} maxLength={15} placeholder="(51) 99999-9999" />
                  </div>
                </div>
                <div style={{ display: 'none' }} aria-hidden="true">
                  <input type="text" name="honeypot" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
                </div>
                <div className="pv-form-grupo">
                  <label>Serviço</label>
                  <select value={formServico} onChange={e => setFormServico(e.target.value)} required disabled={loading}>
                    <option value="">Selecione...</option>
                    {SERVICOS.map(s => <option key={s.id} value={s.nome}>{s.nome} — {s.preco}</option>)}
                  </select>
                </div>

                <div className="pv-form-grupo">
                  <label>Data e horário</label>
                  <div className="pv-agenda-inline">
                    {/* Navegação de semanas */}
                    <div className="pv-semana-nav">
                      <button type="button" onClick={() => setSemanaOffset(Math.max(0, semanaOffset - 1))} disabled={semanaOffset === 0} aria-label="Semana anterior">‹</button>
                      <span>{semanaOffset === 0 ? 'Esta semana' : semanaOffset === 1 ? 'Próxima semana' : `Em ${semanaOffset} semanas`}</span>
                      <button type="button" onClick={() => setSemanaOffset(Math.min(3, semanaOffset + 1))} disabled={semanaOffset === 3} aria-label="Próxima semana">›</button>
                    </div>

                    {/* Abas de dias */}
                    <div className="pv-dias-tabs">
                      {diasDaSemana.map(d => {
                        const diaNome = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()]
                        const hoje = new Date().toDateString() === d.toDateString()
                        const sel = dataSelecionada && dataSelecionada.toDateString() === d.toDateString()
                        return (
                          <button
                            type="button"
                            key={d.toISOString()}
                            className={`pv-dia-tab ${sel ? 'selecionada' : ''}`}
                            onClick={() => { setDataSelecionada(d); setHorario('') }}
                          >
                            <span className="pv-dia-nome">{hoje ? 'HOJE' : diaNome}</span>
                            <span className="pv-dia-num">{String(d.getDate()).padStart(2, '0')}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Chips de horário do dia selecionado */}
                    {!dataSelecionada && <p className="pv-chips-dica">Escolha um dia acima pra ver os horários</p>}
                    {dataSelecionada && gradeSemanaCarregando && <p className="pv-chips-dica">Carregando horários...</p>}
                    {dataSelecionada && !gradeSemanaCarregando && (
                      <>
                        <div className="pv-chips">
                          {gerarHorariosDoDia(dataSelecionada).map(chave => {
                            const hora = chave.split('T')[1]
                            const ocupado = gradeSemanaOcupados.includes(chave)
                            const hoje = new Date()
                            const passado = dataSelecionada.toDateString() === hoje.toDateString() && new Date(chave).getTime() < Date.now()
                            const ind = ocupado || passado
                            const sel = horario === chave
                            return (
                              <button
                                type="button"
                                key={chave}
                                className={`pv-chip ${ind ? 'ocupado' : 'livre'} ${sel ? 'selecionado' : ''}`}
                                disabled={ind}
                                onClick={() => setHorario(chave)}
                              >
                                {hora}
                              </button>
                            )
                          })}
                        </div>
                        <p className="pv-chips-legenda">
                          <span><i className="pv-leg-livre" /> disponível</span>
                          <span><i className="pv-leg-ocupado" /> reservado</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="pv-form-grupo">
                  <label>Pagamento</label>
                  <div className="pv-pagamento">
                    <button type="button" className={`pv-pag-opcao ${formaPagamento === 'pix_na_hora' ? 'ativa' : ''}`} onClick={() => setFormaPagamento('pix_na_hora')}>
                      <span className="pv-pag-titulo">💵 Pagar na hora do corte</span>
                      <span className="pv-pag-desc">PIX, dinheiro ou cartão lá na barbearia</span>
                    </button>
                    <button type="button" className={`pv-pag-opcao ${formaPagamento === 'pix' ? 'ativa' : ''}`} onClick={() => setFormaPagamento('pix')}>
                      <span className="pv-pag-titulo">✨ Adiantar com PIX</span>
                      <span className="pv-pag-desc">Garanta o horário pagando agora</span>
                    </button>
                  </div>
                </div>

                <div className="pv-form-grupo">
                  <label>Observação (opcional)</label>
                  <textarea rows={2} value={formMensagem} onChange={e => setFormMensagem(e.target.value)} disabled={loading} maxLength={500} placeholder="Alguma preferência?"></textarea>
                </div>

                {erro && <p className="pv-erro">{erro}</p>}
                <button type="submit" className="pv-btn pv-btn-dourado pv-btn-grande pv-btn-full" disabled={loading}>
                  {loading ? 'Confirmando...' : 'Confirmar agendamento'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="pv-secao" id="faq">
        <div className="pv-container">
          <p className="pv-eyebrow">TIRA-DÚVIDAS</p>
          <h2 className="pv-h2">Perguntas rápidas</h2>
          <div className="pv-faqs">
            {FAQS.map((f, i) => (
              <div key={i} className={`pv-faq ${faqAberta === i ? 'aberta' : ''}`}>
                <button type="button" className="pv-faq-pergunta" onClick={() => setFaqAberta(faqAberta === i ? null : i)}>
                  {f.p}
                  <ChevronDown size={18} className="pv-faq-seta" />
                </button>
                {faqAberta === i && <p className="pv-faq-resposta">{f.r}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="pv-cta-final">
        <div className="pv-container">
          <h2>A cadeira tá esperando.</h2>
          <p>Escolha seu horário agora — leva 30 segundos.</p>
          <button className="pv-btn pv-btn-dourado pv-btn-grande" onClick={() => scrollTo('agendar')}>Agendar meu corte</button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="pv-footer">
        <div className="pv-container pv-footer-inner">
          <div>
            <span className="pv-logo">MORAIS<span> BARBER</span></span>
            <p className="pv-footer-desc">Barbearia + Tattoo em Canudos, Novo Hamburgo.</p>
          </div>
          <div className="pv-footer-info">
            <span><MapPin size={14} /> R. Potiguara, 974 — Canudos, NH</span>
            <span><Phone size={14} /> (51) 98130-1035</span>
            <span><Clock size={14} /> Ter-Sex 9h-12h · 14h-19h30 | Sáb 9h-17h</span>
            <a href="https://instagram.com/moraisbarber.tattoo" target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> @moraisbarber.tattoo</a>
          </div>
        </div>
        <div className="pv-container pv-footer-base">
          <span>© 2026 Morais Barber. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  )
}
