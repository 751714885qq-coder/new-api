/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useRef, useState } from 'react'

import { useThemeCustomization } from '@/context/theme-customization-provider'

/**
 * Deep Space console backdrop (WO-019).
 *
 * Renders the WO-008 sky behind the console shell: a layered
 * feTurbulence nebula (SVG, same technique as the approved homepage)
 * plus an animated parallax star field on a 2D canvas. The layer sits at
 * negative z-index so every shell surface painted on top of it decides
 * for itself whether the sky shows through — theme-presets.css turns the
 * sidebar and content inset translucent for this preset (glass look).
 *
 * Dark mode only: the light deep-space variant keeps its own subtle CSS
 * backdrop (single star layer) which reads better on a bright canvas.
 */

type Star = {
  x: number
  y: number
  r: number
  /** Drift velocity and twinkle parameters, per depth layer. */
  vx: number
  baseAlpha: number
  phase: number
  twinkleSpeed: number
  tint: string
}

const STAR_TINTS = ['#e8eeff', '#cfe4ff', '#8fd6ff', '#ffffff', '#b9a8ff']

function seedStars(width: number, height: number): Star[] {
  const stars: Star[] = []
  // Three depth layers: far/dim/dense -> near/bright/sparse. Densities and
  // alphas tuned against the rendering baseline (dense visible field).
  const layers = [
    { count: 150, rMin: 0.4, rMax: 0.9, alpha: 0.45, vx: -0.004 },
    { count: 85, rMin: 0.8, rMax: 1.4, alpha: 0.65, vx: -0.009 },
    { count: 30, rMin: 1.3, rMax: 2.2, alpha: 0.95, vx: -0.016 },
  ]
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: layer.rMin + Math.random() * (layer.rMax - layer.rMin),
        vx: layer.vx * (0.6 + Math.random() * 0.8),
        baseAlpha: layer.alpha * (0.6 + Math.random() * 0.4),
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.0004 + Math.random() * 0.001,
        tint: STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)],
      })
    }
  }
  return stars
}

function DeepSpaceBackdrop() {
  const { customization } = useThemeCustomization()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  // Track the app's dark class so the canvas re-initializes its palette
  // when the user flips light/dark without a remount.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isDark) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    let stars: Star[] = []
    let raf = 0
    let last = performance.now()
    let running = true

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = seedStars(window.innerWidth, window.innerHeight)
    }

    const paintFrame = (now: number) => {
      const w = window.innerWidth
      const h = window.innerHeight
      // Rendering-baseline sky: indigo with a violet-lifted upper field,
      // close to the approved concept art rather than near-black.
      const sky = ctx.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, '#141a3d')
      sky.addColorStop(0.4, '#0d1330')
      sky.addColorStop(1, '#050818')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, h)

      const dt = Math.min(now - last, 100)
      last = now
      for (const s of stars) {
        if (!reduceMotion) {
          s.x += s.vx * dt
          if (s.x < -2) s.x = w + 2
        }
        const twinkle = reduceMotion
          ? 1
          : 0.62 + 0.38 * Math.sin(now * s.twinkleSpeed + s.phase)
        ctx.globalAlpha = s.baseAlpha * twinkle
        ctx.fillStyle = s.tint
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const loop = (now: number) => {
      if (!running) return
      paintFrame(now)
      raf = requestAnimationFrame(loop)
    }

    const onVisibility = () => {
      running = !document.hidden
      if (running) {
        last = performance.now()
        raf = requestAnimationFrame(loop)
      } else {
        cancelAnimationFrame(raf)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    if (reduceMotion) {
      paintFrame(performance.now())
    } else {
      raf = requestAnimationFrame(loop)
    }

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isDark])

  if (customization.preset !== 'deep-space') return null
  if (!isDark) return null

  return (
    <div aria-hidden className='pointer-events-none fixed inset-0 -z-10'>
      {/* Canvas paints the opaque sky + stars; the nebula SVG sits above it
       * (semi-transparent) so stars shine through the clouds. */}
      <canvas ref={canvasRef} className='absolute inset-0 h-full w-full' />
      <svg
        className='absolute inset-0 h-full w-full'
        viewBox='0 0 1600 900'
        preserveAspectRatio='xMidYMid slice'
      >
        <filter id='deepspace-nebula' x='-20%' y='-20%' width='140%' height='140%'>
          <feTurbulence
            type='fractalNoise'
            baseFrequency='0.0032 0.006'
            numOctaves='3'
            seed='11'
          />
          <feColorMatrix
            values='0 0 0 0 0.31  0 0 0 0 0.43  0 0 0 0 1  0 0 0 1 0'
          />
          {/* Gamma curve: mid-noise maps to ~0 so the sky stays dark and
           * only turbulence peaks surface as clouds (validated against a
           * standalone render — discrete/table tables filled the screen). */}
          <feComponentTransfer>
            <feFuncA type='gamma' amplitude='0.65' exponent='5' offset='0' />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation='2' />
        </filter>
        <rect width='1600' height='900' filter='url(#deepspace-nebula)' />
        {/* Second nebula layer: violet, offset turbulence so the two
         * clouds interleave like in the concept art. */}
        <filter
          id='deepspace-nebula-violet'
          x='-20%'
          y='-20%'
          width='140%'
          height='140%'
        >
          <feTurbulence
            type='fractalNoise'
            baseFrequency='0.0024 0.005'
            numOctaves='3'
            seed='47'
          />
          <feColorMatrix
            values='0 0 0 0 0.55  0 0 0 0 0.38  0 0 0 0 1  0 0 0 1 0'
          />
          <feComponentTransfer>
            <feFuncA type='gamma' amplitude='0.55' exponent='5' offset='0' />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation='2' />
        </filter>
        <rect
          width='1600'
          height='900'
          filter='url(#deepspace-nebula-violet)'
        />
      </svg>
    </div>
  )
}

export { DeepSpaceBackdrop }
