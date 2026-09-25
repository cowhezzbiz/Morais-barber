// ComponentsPremium.tsx - Componentes de UI premium com efeitos hover
import { useState } from 'react'
import { Scissors, Sparkles, PenTool } from 'lucide-react'

// Images do site - usando arquivos locais do public/ (fotos reais da barbearia)
// Cada imagem é ÚNICA - sem duplicatas
export const IMAGES = {
  hero: '/barber-hero.jpg',
  gallery: [
    { id: 1, src: '/gallery-1.jpg', label: 'CORTE PREMIUM', alt: 'Corte masculino com detalhes' },
    { id: 2, src: '/gallery-2.jpg', label: 'BARBA', alt: 'Modelagem de barba' },
    { id: 3, src: '/gallery-3.jpg', label: 'SOBRANCELHA', alt: 'Sobrancelhas perfeitamente alinhadas' },
  ],
  banners: {
    howItWorks: '/barber-hero.jpg', // mesma imagem do hero, usada como banner secundário
  }
}

// Card de serviço com hover premium
export function ServicoCard({ nome, preco, descricao, icon, onClick }: {
  nome: string
  preco: string
  descricao: string
  icon: React.ReactNode
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'linear-gradient(135deg, #1a1a1a, #151515)' : '#111111',
        border: `1px solid ${hovered ? '#c8963e' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '16px',
        padding: '32px 28px',
        cursor: 'pointer',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: hovered ? '0 8px 40px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,150,62,0.12)' : 'none',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: hovered ? 0.08 : 0,
        background: 'radial-gradient(circle at 50% 0%, rgba(200,150,62,0.8) 0%, transparent 70%)',
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, rgba(200,150,62,${hovered ? 0.2 : 0.15}), rgba(200,150,62,0.05))`,
          border: `1px solid rgba(200,150,62,${hovered ? 0.4 : 0.2})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: hovered ? 'scale(1.1) rotate(-3deg)' : 'scale(1)',
        }}>
          {icon}
        </div>
        <h3 style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: '20px',
          fontWeight: '600',
          color: hovered ? '#c8963e' : '#ffffff',
          marginBottom: '8px',
          transition: 'color 0.3s ease',
        }}>
          {nome}
        </h3>
        <p style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: '14px',
          lineHeight: '1.6',
          marginBottom: '20px',
        }}>
          {descricao}
        </p>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: '28px',
            fontWeight: '700',
            color: '#c8963e',
          }}>
            {preco}
          </span>
          <span style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '12px',
            fontWeight: '500',
            fontFamily: '"Inter", sans-serif',
          }}>
            Agendar
          </span>
        </div>
      </div>
    </div>
  )
}

// Imagem com efeito hover (galeria)
export function GalleryImage({ src, label, alt = '' }: { src: string; label: string; alt?: string }) {
  const [hovered, setHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        setMousePos({ x, y })
      }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px',
        cursor: 'pointer',
        aspectRatio: '4/3',
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), filter 0.5s ease',
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
          filter: hovered ? 'brightness(0.75) saturate(1.05)' : 'brightness(1)',
        }}
      />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.4) 40%, transparent 80%)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.4s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '16px',
        pointerEvents: 'none',
      }}>
        <span style={{
          color: '#c8963e',
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          fontFamily: '"Inter", sans-serif',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0,
        background: `radial-gradient(200px circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.08), transparent 60%)`,
        transition: 'opacity 0.3s ease',
        borderRadius: '12px',
      }}>
        {hovered && <div />}
      </div>
      <div style={{
        position: 'absolute',
        inset: -2,
        borderRadius: '14px',
        border: '2px solid transparent',
        background: 'linear-gradient(135deg, #c8963e, #a67c2e) border-box',
        opacity: 0,
        transition: 'opacity 0.4s ease 0.1s',
        pointerEvents: 'none',
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        mask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
      }}>
        {hovered && <div />}
      </div>
    </div>
  )
}

// Banner com imagem de fundo
export function Banner({ src, title, subtitle }: { src: string; title: string; subtitle?: string }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '400px',
      borderRadius: '20px',
      overflow: 'hidden',
      marginBottom: '60px',
    }}>
      <img
        src={src}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
        loading="lazy"
      />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.7) 100%)',
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: 'clamp(28px, 5vw, 42px)',
          fontWeight: '600',
          color: '#ffffff',
          marginBottom: subtitle ? '12px' : '0',
          lineHeight: '1.2',
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '15px',
            maxWidth: '500px',
            fontFamily: '"Inter", sans-serif',
          }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

// === COMPONENTES DE GRID ===

interface GalleryImageData {
  id: number
  src: string
  label: string
  alt: string
}

interface GalleryGridProps {
  images: GalleryImageData[]
  columns?: 2 | 3 | 4
}

export function GalleryGrid({ images, columns = 3 }: GalleryGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: columns === 4 ? '16px' : '20px' }}>
      {images.map((img) => (
        <GalleryImage key={img.id} src={img.src} label={img.label} alt={img.alt} />
      ))}
    </div>
  )
}

interface TestimonialData {
  id: number
  src: string
  name: string
  text: string
}

interface TestimonialsGridProps {
  testimonials: TestimonialData[]
}

export function TestimonialsGrid({ testimonials }: TestimonialsGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '40px' }}>
      {testimonials.map((t) => (
        <TestimonialCard key={t.id} name={t.name} text={t.text} avatarUrl={t.src} />
      ))}
    </div>
  )
}

interface StatData {
  value: string | number
  label: string
}

interface StatsGridProps {
  stats: StatData[]
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginTop: '60px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {stats.map((s, idx) => (
        <StatItem key={idx} value={s.value} label={s.label} />
      ))}
    </div>
  )
}

// Depoimento com avatar
export function TestimonialCard({ name, text, avatarUrl }: {
  name: string
  text: string
  avatarUrl: string
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#111111',
        border: `1px solid ${hovered ? 'rgba(200,150,62,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '16px',
        padding: '28px',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '16px',
        color: '#c8963e',
        fontSize: '16px',
      }}>
        ★★★★★
      </div>
      <p style={{
        fontFamily: '"Playfair Display", serif',
        fontSize: '15px',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: '1.7',
        marginBottom: '20px',
        fontStyle: 'italic',
      }}>
        "{text}"
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src={avatarUrl}
          alt={name}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgba(200,150,62,0.3)',
            transition: 'all 0.3s ease',
          }}
        />
        <span style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: '15px',
          fontWeight: '600',
          color: '#ffffff',
        }}>
          {name}
        </span>
      </div>
    </div>
  )
}

// Estatística
export function StatItem({ value, label }: { value: string | number; label: string }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: 'center',
        padding: '20px',
        background: hovered ? '#1a1a1a' : '#111111',
        borderRadius: '12px',
        border: `1px solid ${hovered ? 'rgba(200,150,62,0.2)' : 'rgba(255,255,255,0.06)'}`,
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{
        fontFamily: '"Playfair Display", serif',
        fontSize: '36px',
        fontWeight: '700',
        color: '#c8963e',
        lineHeight: '1',
        marginBottom: '6px',
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: '"Inter", sans-serif',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}>
        {label}
      </div>
    </div>
  )
}

// Botão premium
export function PremiumButton({ children, onClick, variant = 'primary', size = 'md', fullWidth = false }: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: '600',
    fontFamily: '"Inter", sans-serif',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  }

  const sizes = {
    sm: { padding: '10px 20px', fontSize: '13px' },
    md: { padding: '14px 28px', fontSize: '14px' },
    lg: { padding: '16px 36px', fontSize: '15px' },
  }

  const variants = {
    primary: {
      background: hovered ? '#d4a853' : '#c8963e',
      color: '#0a0a0a',
      boxShadow: hovered ? '0 8px 24px rgba(200,150,62,0.3)' : 'none',
    },
    secondary: {
      background: 'transparent',
      color: '#ffffff',
      border: `1px solid ${hovered ? '#c8963e' : 'rgba(255,255,255,0.1)'}`,
    },
    ghost: {
      background: 'transparent',
      color: hovered ? '#c8963e' : 'rgba(255,255,255,0.6)',
    },
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...baseStyles,
        ...sizes[size],
        ...variants[variant],
        borderRadius: '10px',
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      {children}
    </button>
  )
}
