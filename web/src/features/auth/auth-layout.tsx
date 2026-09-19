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
import { Link } from '@tanstack/react-router'
import { Code2, Gauge, Layers, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { DeepSpaceBackdrop } from '@/components/layout/components/deep-space-backdrop'
import { Skeleton } from '@/components/ui/skeleton'
import { useThemeCustomization } from '@/context/theme-customization-provider'
import { useDeepSpace } from '@/hooks/use-deep-space'
import { useSystemConfig } from '@/hooks/use-system-config'

type AuthLayoutProps = {
  children: React.ReactNode
}

// Stock (non-deep-space) brand column feature chips.
const BRAND_FEATURES = [
  { icon: Layers, label: 'Multi-model aggregation' },
  { icon: ShieldCheck, label: 'High availability' },
  { icon: Gauge, label: 'Metered billing' },
  { icon: Code2, label: 'Developer-friendly' },
] as const

/**
 * Deep Space login screen (WO-019) — 1:1 port of the approved render
 * 13-渲染稿-v6-登录.html (lines 58-120, 162-203): atmosphere layers come
 * from DeepSpaceBackdrop (same frozen v6.1 recipe), the two life planets
 * and the left brand block are ported verbatim here; only the form itself
 * stays functional.
 */
function CloudSvg(props: {
  id: string
  bf: string
  octaves: number
  seed: number
  values: string
}) {
  return (
    <svg aria-hidden='true'>
      <filter id={props.id}>
        <feTurbulence
          type='fractalNoise'
          baseFrequency={props.bf}
          numOctaves={props.octaves}
          seed={props.seed}
          stitchTiles='stitch'
        />
        <feColorMatrix type='matrix' values={props.values} />
      </filter>
      <rect width='100%' height='100%' filter={`url(#${props.id})`} />
    </svg>
  )
}

/** Render lines 198-201 verbatim: inline feature icon strokes. */
function FeatIcon(props: { d: readonly (string | React.ReactNode)[] }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      strokeWidth='1.7'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      {props.d}
    </svg>
  )
}

const DS_FEATURE_ICONS = {
  aggregate: [
    <path key='a' d='M12 2l8 4.5v11L12 22l-8-4.5v-11z' />,
    <path key='b' d='M12 22V11.5' />,
    <path key='c' d='M4 6.5l8 5 8-5' />,
  ],
  availability: [
    <path key='a' d='M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z' />,
    <path key='b' d='M9 12l2 2 4-4' />,
  ],
  metered: [
    <circle key='a' cx='12' cy='12' r='9' />,
    <path key='b' d='M12 7v5l3 3' />,
  ],
  developer: [
    <path key='a' d='M8 6l-5 6 5 6' />,
    <path key='b' d='M16 6l5 6-5 6' />,
  ],
} as const

const DS_FEATURES = [
  { icon: DS_FEATURE_ICONS.aggregate, label: 'Multi-model aggregation' },
  { icon: DS_FEATURE_ICONS.availability, label: 'High availability' },
  { icon: DS_FEATURE_ICONS.metered, label: 'Metered billing' },
  { icon: DS_FEATURE_ICONS.developer, label: 'Developer-friendly' },
] as const

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()
  const { customization } = useThemeCustomization()
  // Deep-space auth chrome (renders 13/13b) is structural: the light pass
  // drafts 37/38 keep the same planets + brand block + card frame with light
  // values in CSS (html:not(.dark) section of theme-presets.css).
  const deepSpace = useDeepSpace()
  const isDeepSpace = customization.preset === 'deep-space'
  const displaySystemName =
    isDeepSpace && (!systemName || systemName === 'New API')
      ? 'MindClaw'
      : systemName

  if (deepSpace) {
    return (
      <div className='relative h-svh max-w-none overflow-hidden'>
        <DeepSpaceBackdrop withLandscape={false} />
        {/* Render lines 162-176 verbatim: large life planet, top-right. */}
        <div aria-hidden className='ds-earth-big'>
          <div className='ball' />
          <div className='clouds'>
            <CloudSvg
              id='ds-auth-cl1'
              bf='0.011 0.019'
              octaves={4}
              seed={8}
              values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'
            />
          </div>
          <div className='clouds2'>
            <CloudSvg
              id='ds-auth-cl1b'
              bf='0.006 0.011'
              octaves={3}
              seed={15}
              values='0 0 0 0 0.75  0 0 0 0 0.88  0 0 0 0 1  0 0 0 0.85 0'
            />
          </div>
          <div className='rim' />
        </div>
        {/* Render lines 178-186 verbatim: small life planet, bottom-left. */}
        <div aria-hidden className='ds-earth-small'>
          <div className='ball' />
          <div className='clouds'>
            <CloudSvg
              id='ds-auth-cl2'
              bf='0.013 0.021'
              octaves={4}
              seed={4}
              values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.85 0'
            />
          </div>
        </div>
        {/* User ruling 2026-09-17 (supersedes D7 anchoring): the brand block
            becomes a top-left hanging intro — enlarged type, anchored to the
            viewport's upper-left; no vertical alignment with the card. */}
        <div className='ds-auth-brand'>
          <Link to='/' className='logo-row'>
            <div className='ds-auth-logo-orb' />
            {loading ? (
              <Skeleton className='h-12 w-56' />
            ) : (
              <h1>{displaySystemName}</h1>
            )}
          </Link>
          <div className='ds-auth-gw'>{t('AI Model Gateway')}</div>
          <div className='ds-auth-tl1'>
            {t('Global AI models, unified access center')}
          </div>
          <div className='ds-auth-tl2'>
            {t('Smart routing · Cost optimization · Security control')}
          </div>
          <div className='ds-auth-feats'>
            {DS_FEATURES.map((feature) => (
              <div key={feature.label} className='ds-auth-feat'>
                <FeatIcon d={feature.icon} />
                {t(feature.label)}
              </div>
            ))}
          </div>
        </div>
        {/* Render line 123 verbatim: glass login card placement. */}
        <div className='ds-auth-card-pos'>{children}</div>
      </div>
    )
  }

  return (
    <div className='relative grid h-svh max-w-none overflow-hidden'>
      {isDeepSpace && <DeepSpaceBackdrop withLandscape={false} />}
      <Link
        to='/'
        className='absolute top-4 left-4 z-10 flex items-center gap-2 transition-opacity hover:opacity-80 sm:top-8 sm:left-8'
      >
        <div className='relative h-8 w-8'>
          {loading ? (
            <Skeleton className='absolute inset-0 rounded-full' />
          ) : (
            <img
              src={logo}
              alt={t('Logo')}
              className='h-8 w-8 rounded-full object-cover'
            />
          )}
        </div>
        {loading ? (
          <Skeleton className='h-6 w-24' />
        ) : (
          <h1 className='text-xl font-medium lg:hidden'>{displaySystemName}</h1>
        )}
      </Link>
      <div className='absolute top-20 left-4 z-10 hidden max-w-sm space-y-4 sm:top-24 sm:left-8 lg:block'>
        <div className='space-y-1.5'>
          <p className='bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-[#9ec5ff] dark:via-[#a5b4fc] dark:to-[#c4b5fd]'>
            {displaySystemName}
          </p>
          <p className='text-primary/90 text-sm font-semibold tracking-[0.2em] uppercase'>
            {t('AI Model Gateway')}
          </p>
        </div>
        <div className='space-y-1'>
          <p className='text-foreground text-lg font-semibold'>
            {t("The relay to the world's leading AI models")}
          </p>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            {t(
              'One API Key for OpenAI, Claude, Gemini, DeepSeek, Qwen and more'
            )}
          </p>
          <p className='text-muted-foreground text-sm'>
            {t('Stable · Fast · Affordable')}
          </p>
        </div>
        <div className='grid grid-cols-2 gap-x-5 gap-y-2.5 pt-1'>
          {BRAND_FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.label}
                className='text-muted-foreground flex items-center gap-2 text-sm'
              >
                <Icon className='text-primary/80 h-4 w-4' />
                {t(feature.label)}
              </div>
            )
          })}
        </div>
      </div>
      <div className='container flex items-center pt-16 sm:pt-0'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 px-4 py-8 sm:w-[480px] sm:p-8'>
          {children}
        </div>
      </div>
    </div>
  )
}
