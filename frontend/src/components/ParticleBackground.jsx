import { useEffect, useRef } from 'react'

const PARTICLE_COUNT = 80
const COLORS = [
  { r: 34, g: 211, b: 238 },  // cyan-400
  { r: 167, g: 139, b: 250 }, // purple-400
  { r: 255, g: 255, b: 255 }, // white
  { r: 52, g: 211, b: 153 },  // green-400
]

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 34, g: 211, b: 238 }
}

export default function ParticleBackground() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const particlesRef = useRef([])
  const animationRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let width = window.innerWidth
    let height = window.innerHeight

    // Set canvas size
    canvas.width = width
    canvas.height = height
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)]
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2 + 1,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: -(Math.random() * 0.5 + 0.2),
          color,
          alpha: Math.random() * 0.5 + 0.3,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.01
        }
      })
    }

    initParticles()

    // Mouse interaction
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    // Resize handler
    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      initParticles()
    }

    window.addEventListener('resize', handleResize)

    // Draw background gradient
    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, 'rgba(88, 28, 135, 0.15)')   // dark purple top-left
      gradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.1)')   // slate-950 center
      gradient.addColorStop(1, 'rgba(8, 47, 73, 0.2)')     // dark blue bottom-right
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw background
      drawBackground()

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Update pulse
        particle.pulse += particle.pulseSpeed

        // Mouse repulsion
        const dx = particle.x - mouseRef.current.x
        const dy = particle.y - mouseRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const repelRadius = 120

        if (dist < repelRadius && dist > 0) {
          const force = (repelRadius - dist) / repelRadius
          particle.x += (dx / dist) * force * 2
          particle.y += (dy / dist) * force * 2
        }

        // Update position
        particle.x += particle.speedX
        particle.y += particle.speedY

        // Add slight drift
        particle.x += Math.sin(particle.pulse) * 0.1

        // Wrap around edges
        if (particle.y < -10) {
          particle.y = height + 10
          particle.x = Math.random() * width
        }
        if (particle.x < -10) particle.x = width + 10
        if (particle.x > width + 10) particle.x = -10

        // Calculate alpha based on pulse
        const pulseAlpha = particle.alpha + Math.sin(particle.pulse) * 0.15

        // Draw particle glow
        const { r, g, b } = particle.color

        // Outer glow
        const glowGradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 4
        )
        glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${pulseAlpha * 0.8})`)
        glowGradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${pulseAlpha * 0.3})`)
        glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 4, 0, Math.PI * 2)
        ctx.fillStyle = glowGradient
        ctx.fill()

        // Inner core
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulseAlpha})`
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ position: 'fixed', top: 0, left: 0 }}
    />
  )
}