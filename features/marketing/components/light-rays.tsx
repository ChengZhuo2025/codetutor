"use client"

import { useEffect, useRef } from "react"

interface Ray {
  angle: number
  width: number
  speed: number
  opacity: number
  length: number
  hue: number
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

export function LightRays() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let width = 0
    let height = 0

    // Create rays
    const NUM_RAYS = 12
    const rays: Ray[] = Array.from({ length: NUM_RAYS }, () => ({
      angle: randomBetween(-0.55, 0.55),       // radians from vertical
      width: randomBetween(60, 180),            // beam width at base
      speed: randomBetween(0.0003, 0.0008),     // oscillation speed
      opacity: randomBetween(0.04, 0.11),       // max opacity
      length: randomBetween(0.65, 1.1),         // relative to canvas height
      hue: randomBetween(170, 195),             // cyan-ish teal
    }))

    // Each ray has its own phase offset
    const phases = rays.map(() => randomBetween(0, Math.PI * 2))

    function resize() {
      if (!canvas) return
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = width
      canvas.height = height
    }

    function draw(t: number) {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      const originX = width / 2
      const originY = 0

      rays.forEach((ray, i) => {
        const phase = phases[i]
        // Gently oscillate each ray's angle over time
        const liveAngle = ray.angle + Math.sin(t * ray.speed + phase) * 0.08
        const liveOpacity = ray.opacity * (0.7 + 0.3 * Math.sin(t * ray.speed * 1.7 + phase))

        const rayLength = height * ray.length
        const halfW = ray.width / 2

        // End point of ray center
        const ex = originX + Math.sin(liveAngle) * rayLength
        const ey = originY + Math.cos(liveAngle) * rayLength

        // Perpendicular direction for beam width
        const perpX = Math.cos(liveAngle)
        const perpY = -Math.sin(liveAngle)

        // Four corners of the beam quad
        const x0 = originX - perpX * halfW * 0.15   // narrow at origin
        const y0 = originY - perpY * halfW * 0.15
        const x1 = originX + perpX * halfW * 0.15
        const y1 = originY + perpY * halfW * 0.15
        const x2 = ex + perpX * halfW
        const y2 = ey + perpY * halfW
        const x3 = ex - perpX * halfW
        const y3 = ey - perpY * halfW

        // Gradient along the ray length
        const grad = ctx.createLinearGradient(originX, originY, ex, ey)
        grad.addColorStop(0, `hsla(${ray.hue}, 80%, 65%, ${liveOpacity})`)
        grad.addColorStop(0.4, `hsla(${ray.hue}, 70%, 60%, ${liveOpacity * 0.6})`)
        grad.addColorStop(1, `hsla(${ray.hue}, 60%, 55%, 0)`)

        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.lineTo(x3, y3)
        ctx.closePath()
        ctx.fillStyle = grad
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize)
    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  )
}
