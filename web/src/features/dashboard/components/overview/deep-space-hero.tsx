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
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { useThemeCustomization } from '@/context/theme-customization-provider'
import { MOTION_TRANSITION } from '@/lib/motion'

/**
 * Deep Space cockpit hero (WO-019 spec v2, structure batch B1).
 *
 * Brand block (MindClaw / AI Model Gateway / tagline) on the left and an
 * animated planet on the right: a breathing glass sphere with two orbit
 * rings carrying glowing routing nodes, plus flowing request lines drawn
 * as an SVG overlay. Pure CSS/SVG animation — no 3D library. Renders only
 * for the deep-space preset; light mode gets the same structure and is
 * polished separately (user final review pending).
 */

const REQUEST_LINES = [
  { d: 'M 40 150 C 200 150, 340 62, 640 84', color: '#00bfff', delay: '0s' },
  { d: 'M 60 42 C 240 72, 420 44, 650 96', color: '#22d3ee', delay: '-1.3s' },
  { d: 'M 30 102 C 260 122, 480 142, 655 108', color: '#8b5cf6', delay: '-2.4s' },
]

function DeepSpaceHero() {
  const { t } = useTranslation()
  const { customization } = useThemeCustomization()
  const shouldReduceMotion = useReducedMotion()

  if (customization.preset !== 'deep-space') return null

  return (
    <motion.section
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={MOTION_TRANSITION.slow}
      className='ds-hero relative overflow-hidden rounded-2xl border shadow-xs'
    >
      <svg
        className='ds-hero-links'
        viewBox='0 0 800 200'
        preserveAspectRatio='xMidYMid slice'
        aria-hidden='true'
      >
        {REQUEST_LINES.map((line) => (
          <g key={line.color}>
            <path
              className='ds-hero-link'
              d={line.d}
              stroke={line.color}
              style={{ animationDelay: line.delay }}
            />
            <circle cx='640' cy='90' r='2' fill={line.color} opacity='0.7' />
          </g>
        ))}
      </svg>

      <div className='relative flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between md:gap-8'>
        <div className='flex min-w-0 flex-col gap-1.5'>
          <h2 className='ds-hero-title'>MindClaw</h2>
          <p className='ds-hero-subtitle'>{t('AI Model Gateway')}</p>
          <p className='ds-hero-tagline'>
            {t(
              'Global AI model unified access hub · Smart routing · Cost optimization · Secure control'
            )}
          </p>
        </div>

        <div className='ds-hero-planet-wrap' aria-hidden='true'>
          <div className='ds-hero-planet' />
          <div className='ds-hero-orbit ds-hero-orbit-a'>
            <span className='ds-hero-node' />
          </div>
          <div className='ds-hero-orbit ds-hero-orbit-b'>
            <span className='ds-hero-node ds-hero-node-alt' />
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export { DeepSpaceHero }
