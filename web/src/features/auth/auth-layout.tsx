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
import { useSystemConfig } from '@/hooks/use-system-config'

type AuthLayoutProps = {
  children: React.ReactNode
}

// WO-019 rendering baseline: four feature chips under the brand column,
// copy from the WO-008 approved homepage chip row.
const BRAND_FEATURES = [
  { icon: Layers, label: 'Multi-model aggregation' },
  { icon: ShieldCheck, label: 'High availability' },
  { icon: Gauge, label: 'Metered billing' },
  { icon: Code2, label: 'Developer-friendly' },
] as const

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()
  const { customization } = useThemeCustomization()
  const isDeepSpace = customization.preset === 'deep-space'
  const displaySystemName =
    isDeepSpace && (!systemName || systemName === 'New API')
      ? 'MindClaw'
      : systemName

  return (
    <div className='relative grid h-svh max-w-none overflow-hidden'>
      {isDeepSpace && <DeepSpaceBackdrop />}
      {isDeepSpace && (
        <>
          {/* Sign-in backdrop decor (WO-019 S1): large life planet
           * top-right + small one bottom-left, dark mode only. */}
          <div
            aria-hidden
            className='ds-auth-planet-lg -z-10 hidden dark:block'
          >
            <div className='ds-cockpit-planet' />
          </div>
          <div
            aria-hidden
            className='ds-auth-planet-sm -z-10 hidden dark:block'
          >
            <div className='ds-cockpit-planet' />
          </div>
        </>
      )}
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
