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

import { useMemo, type CSSProperties } from 'react'

import { useDeepSpaceDark } from '@/hooks/use-deep-space-dark'
import { useDeepSpace } from '@/hooks/use-deep-space'

/**
 * Deep Space console backdrop (WO-019).
 *
 * Renders the approved v6 sky behind the console shell: sky ramp with
 * violet/indigo/cyan glow masses, screen-blended turbulence noise, a
 * blurred milky-way band, floating glow particles and an edge vignette.
 * Layer visuals live in theme-presets.css (.ds-*) and are frozen to the
 * v6 mock chrome — retune there first, then mirror here.
 *
 * Light mode renders the approved light pass (drafts 32–42): cold
 * indigo-violet nebula on a bright canvas, dark-navy stars behind the
 * glass, a ✦ sparkle overlay above the content and the same floating
 * particles. Layer visuals live in theme-presets.css (.ds-l*).
 */

type Particle = { className: string; style: CSSProperties }
type Star = { className: string; style: CSSProperties }

// Deterministic LCG so every mount seeds the same particle field as the
// approved mock (seed 7, 34 glow points + 5 soft orbs).
function buildParticles(): Particle[] {
  let s = 7
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const particles: Particle[] = []
  for (let i = 0; i < 34; i++) {
    particles.push({
      className: rnd() < 0.3 ? 'ds-pt violet' : 'ds-pt',
      style: {
        width: `${(2 + rnd() * 5).toFixed(1)}px`,
        height: `${(2 + rnd() * 5).toFixed(1)}px`,
        left: `${(rnd() * 100).toFixed(2)}%`,
        top: `${(6 + rnd() * 58).toFixed(2)}%`,
        '--sw': `${Math.round(rnd() * 64 - 32)}px`,
        '--po': (0.35 + rnd() * 0.55).toFixed(2),
        '--dur': `${(10 + rnd() * 16).toFixed(1)}s`,
        '--del': `${(-rnd() * 22).toFixed(1)}s`,
      } as CSSProperties,
    })
  }
  for (let i = 0; i < 5; i++) {
    particles.push({
      className: 'ds-pt orb',
      style: {
        width: `${(10 + rnd() * 12).toFixed(1)}px`,
        height: `${(10 + rnd() * 12).toFixed(1)}px`,
        left: `${(rnd() * 100).toFixed(2)}%`,
        top: `${(30 + rnd() * 70).toFixed(2)}%`,
        '--sw': `${Math.round(rnd() * 80 - 40)}px`,
        '--po': (0.1 + rnd() * 0.12).toFixed(2),
        '--dur': `${(18 + rnd() * 14).toFixed(1)}s`,
        '--del': `${(-rnd() * 26).toFixed(1)}s`,
      } as CSSProperties,
    })
  }
  return particles
}

// Light pass star layers (draft 33 script, verbatim parameters, seed 7):
// 118 dark-navy dots behind the glass + 22 four-point ✦ sparkles.
function buildLightStars(): Star[] {
  let s = 7
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const stars: Star[] = []
  for (let i = 0; i < 118; i++) {
    stars.push({
      className: 'ds-lstar',
      style: {
        width: `${(1.8 + rnd() * 1.8).toFixed(1)}px`,
        height: `${(1.8 + rnd() * 1.8).toFixed(1)}px`,
        left: `${(rnd() * 100).toFixed(2)}%`,
        top: `${(2 + rnd() * 84).toFixed(2)}%`,
        '--so': (0.65 + rnd() * 0.35).toFixed(2),
        '--tdur': `${(3.5 + rnd() * 5).toFixed(1)}s`,
        '--tdel': `${(-rnd() * 8).toFixed(1)}s`,
        '--dx': `${(rnd() * 16 - 8).toFixed(1)}px`,
        '--dy': `${(rnd() * 12 - 6).toFixed(1)}px`,
        '--ddur': `${(7 + rnd() * 9).toFixed(1)}s`,
        '--ddel': `${(-rnd() * 10).toFixed(1)}s`,
      } as CSSProperties,
    })
  }
  return stars
}

function buildLightSparkles(): Star[] {
  let s = 7
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const sparkles: Star[] = []
  for (let i = 0; i < 22; i++) {
    sparkles.push({
      className: 'ds-lstar-bright',
      style: {
        width: `${(11 + rnd() * 9).toFixed(1)}px`,
        height: `${(11 + rnd() * 9).toFixed(1)}px`,
        left: `${(rnd() * 100).toFixed(2)}%`,
        top: `${(4 + rnd() * 82).toFixed(2)}%`,
        '--so': (0.65 + rnd() * 0.35).toFixed(2),
        '--tdur': `${(3.5 + rnd() * 5).toFixed(1)}s`,
        '--tdel': `${(-rnd() * 8).toFixed(1)}s`,
        '--dx': `${(rnd() * 24 - 12).toFixed(1)}px`,
        '--dy': `${(rnd() * 16 - 8).toFixed(1)}px`,
        '--ddur': `${(7 + rnd() * 9).toFixed(1)}s`,
        '--ddel': `${(-rnd() * 10).toFixed(1)}s`,
      } as CSSProperties,
    })
  }
  return sparkles
}

// Light pass glow particles (draft 33 script, verbatim parameters): rise +
// sway + twinkle behind the glass. 34 points + 5 soft orbs.
function buildLightParticles(): Particle[] {
  let s = 7
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const particles: Particle[] = []
  for (let i = 0; i < 34; i++) {
    particles.push({
      className: rnd() < 0.3 ? 'ds-lpt violet' : 'ds-lpt',
      style: {
        width: `${(2 + rnd() * 5).toFixed(1)}px`,
        height: `${(2 + rnd() * 5).toFixed(1)}px`,
        left: `${(rnd() * 100).toFixed(2)}%`,
        top: `${(6 + rnd() * 58).toFixed(2)}%`,
        '--sw': `${Math.round(rnd() * 64 - 32)}px`,
        '--po': (0.45 + rnd() * 0.5).toFixed(2),
        '--dur': `${(8 + rnd() * 10).toFixed(1)}s`,
        '--del': `${(-rnd() * 22).toFixed(1)}s`,
      } as CSSProperties,
    })
  }
  for (let i = 0; i < 5; i++) {
    particles.push({
      className: 'ds-lpt orb',
      style: {
        width: `${(10 + rnd() * 12).toFixed(1)}px`,
        height: `${(10 + rnd() * 12).toFixed(1)}px`,
        left: `${(rnd() * 100).toFixed(2)}%`,
        top: `${(30 + rnd() * 70).toFixed(2)}%`,
        '--sw': `${Math.round(rnd() * 80 - 40)}px`,
        '--po': (0.1 + rnd() * 0.12).toFixed(2),
        '--dur': `${(18 + rnd() * 14).toFixed(1)}s`,
        '--del': `${(-rnd() * 26).toFixed(1)}s`,
      } as CSSProperties,
    })
  }
  return particles
}

function DeepSpaceBackdrop(props: { withLandscape?: boolean }) {
  // withLandscape=false for the auth pages: the approved login render has its
  // own planet pair and no horizon, so the console landscape would double up.
  const { withLandscape = true } = props
  const isDeepSpace = useDeepSpace()
  const isDeepSpaceDark = useDeepSpaceDark()

  const particles = useMemo(() => buildParticles(), [])
  const lightStars = useMemo(() => buildLightStars(), [])
  const lightSparkles = useMemo(() => buildLightSparkles(), [])
  const lightParticles = useMemo(() => buildLightParticles(), [])

  if (!isDeepSpace) return null

  if (isDeepSpaceDark) {
    return (
      <div aria-hidden className='pointer-events-none fixed inset-0 -z-10'>
        <div className='ds-sky' />
        {/* Render lines 210-214 verbatim: one full-bleed turbulence field. */}
        <svg className='ds-noise' width='100%' height='100%' aria-hidden='true'>
          <filter id='ds-noise-filter'>
            <feTurbulence
              type='fractalNoise'
              baseFrequency='0.005 0.008'
              numOctaves='4'
              seed='11'
              stitchTiles='stitch'
            />
            <feColorMatrix
              type='matrix'
              values='0 0 0 0 0.45  0 0 0 0 0.52  0 0 0 0 0.95  0 0 0 0.6 0'
            />
          </filter>
          <rect width='100%' height='100%' filter='url(#ds-noise-filter)' />
        </svg>
        <div className='ds-milkyway' />
        {withLandscape && <div className='ds-planet' />}
        {withLandscape && <div className='ds-horizon' />}
        <div className='ds-particles'>
          {particles.map((p) => (
            <i
              key={`${p.style.left}-${p.style.top}`}
              className={p.className}
              style={p.style}
            />
          ))}
        </div>
        <div className='ds-vignette' />
      </div>
    )
  }

  return (
    <>
      <div aria-hidden className='pointer-events-none fixed inset-0 -z-10'>
        <div className='ds-lsky' />
        {/* Draft 33 lines 356-360 verbatim: multiply-blended turbulence. */}
        <svg
          className='ds-lnoise'
          width='100%'
          height='100%'
          aria-hidden='true'
        >
          <filter id='ds-lnoise-filter'>
            <feTurbulence
              type='fractalNoise'
              baseFrequency='0.005 0.008'
              numOctaves='4'
              seed='11'
              stitchTiles='stitch'
            />
            <feColorMatrix
              type='matrix'
              values='0 0 0 0 0.30  0 0 0 0 0.32  0 0 0 0 0.70  0 0 0 0.6 0'
            />
          </filter>
          <rect width='100%' height='100%' filter='url(#ds-lnoise-filter)' />
        </svg>
        <div className='ds-lmilkyway' />
        <div className='ds-lstarfield'>
          {lightStars.map((st) => (
            <i
              key={`${st.style.left}-${st.style.top}`}
              className={st.className}
              style={st.style}
            />
          ))}
        </div>
        <div className='ds-lmoon' />
        {withLandscape && <div className='ds-lhorizon' />}
        <div className='ds-lparticles'>
          {lightParticles.map((p) => (
            <i
              key={`${p.style.left}-${p.style.top}`}
              className={p.className}
              style={p.style}
            />
          ))}
        </div>
        <div className='ds-lvignette' />
      </div>
      {/* Draft 33 line 368: the ✦ sparkles float ABOVE the content (draft
          z-6, below the drawer scrim z-9), low opacity, non-interactive. */}
      <div
        aria-hidden
        className='ds-lsparkles pointer-events-none fixed inset-0 z-30'
      >
        {lightSparkles.map((st) => (
          <i
            key={`${st.style.left}-${st.style.top}`}
            className={st.className}
            style={st.style}
          />
        ))}
      </div>
    </>
  )
}

export { DeepSpaceBackdrop }
