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
import { useQuery } from '@tanstack/react-query'
import { VChart } from '@visactor/react-vchart'
import { TrendingDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DS_PANEL_STYLE, sumQuotaBetween } from '@/components/deep-space/ds-kit'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { useDeepSpace } from '@/hooks/use-deep-space'
import { useDeepSpaceDark } from '@/hooks/use-deep-space-dark'
import { useThemeCustomization } from '@/context/theme-customization-provider'
import { useTheme } from '@/context/theme-provider'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { processChartData } from '@/features/dashboard/lib'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { formatQuota } from '@/lib/format'
import { useThemeRadiusPx } from '@/lib/theme-radius'

// ============================================================================
// Wallet Consumption Trend Card (WO-019 rendering baseline: 消费趋势 card)
// Mirrors the overview cockpit chart plumbing (theme init + spec overrides).
// ============================================================================

let themeManagerPromise: Promise<
  (typeof import('@visactor/vchart'))['ThemeManager']
> | null = null

function useVChartTheme() {
  const { resolvedTheme } = useTheme()
  const [themeReady, setThemeReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!themeManagerPromise) {
      themeManagerPromise = import('@visactor/vchart').then(
        (m) => m.ThemeManager
      )
    }
    themeManagerPromise
      .then((ThemeManager) => {
        if (cancelled) return
        ThemeManager.setCurrentTheme(
          resolvedTheme === 'dark' ? 'dark' : 'light'
        )
        setThemeReady(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [resolvedTheme])

  return { themeReady, resolvedTheme }
}

const VCHART_OPTION = { mode: 'desktop-browser' } as const

function startOfDay(offsetDays = 0): number {
  const day = new Date()
  day.setHours(0, 0, 0, 0)
  day.setDate(day.getDate() + offsetDays)
  return Math.floor(day.getTime() / 1000)
}

export function WalletConsumptionTrendCard() {
  const { t } = useTranslation()
  // Panel frame is structural (draft 34 keeps it in light); only the weekly
  // total color and legend-dot glow carry dark literals (draft 34: #0e7490
  // / rgba(8,145,178,.6)).
  const deepSpace = useDeepSpace()
  const deepSpaceDark = useDeepSpaceDark()
  const { customization } = useThemeCustomization()
  const chartRadius = useThemeRadiusPx(
    '--radius-md',
    `${customization.preset}:${customization.radius}`
  )
  const { themeReady, resolvedTheme } = useVChartTheme()

  const start = useMemo(() => startOfDay(-6), [])
  const end = useMemo(() => startOfDay(1), [])

  const query = useQuery({
    queryKey: ['wallet', 'trend-7d', start],
    queryFn: async () => {
      const result = await getUserQuotaDates({
        start_timestamp: start,
        end_timestamp: end,
        default_time: 'day',
      })
      return result.success ? ((result.data ?? []) as QuotaDataItem[]) : []
    },
    staleTime: 60 * 1000,
  })

  const chartData = useMemo(
    () =>
      processChartData(
        query.isLoading ? [] : (query.data ?? []),
        'day',
        t,
        chartRadius
      ),
    [query.data, query.isLoading, t, chartRadius]
  )

  const hasData = (query.data ?? []).length > 0
  const weekTotal = useMemo(
    () => sumQuotaBetween(query.data ?? [], start, end).quota,
    [query.data, start, end]
  )

  const spec = useMemo(() => {
    const base = chartData.spec_area as Record<string, unknown> | undefined
    if (!base) return undefined
    return {
      ...base,
      title: { visible: false },
      legends: { visible: false },
    }
  }, [chartData.spec_area])

  if (deepSpace) {
    // Render 10-渲染稿-v6-钱包.html lines 325-385: panel with inline title +
    // weekly total and the render's single consumption legend; the VChart
    // stays as the live data slot.
    return (
      <div className='flex min-h-0 flex-col' style={DS_PANEL_STYLE}>
        <div className='flex flex-wrap items-baseline justify-between gap-3'>
          <div className='flex items-baseline gap-3'>
            <span
              style={{
                fontSize: 14.5,
                fontWeight: 600,
                color: 'var(--ds-t1)',
              }}
            >
              {t('Consumption Trend')}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--ds-t3)' }}>
              {t('Last 7 days · daily · total ')}
              <span
                className='tabular-nums'
                style={{
                  color: deepSpaceDark ? '#a5f3fc' : '#0e7490',
                  fontWeight: 600,
                }}
              >
                {formatQuota(weekTotal)}
              </span>
            </span>
          </div>
          <div
            className='flex items-center gap-[14px]'
            style={{ fontSize: 11.5, color: 'var(--ds-t2)' }}
          >
            <span className='flex items-center'>
              <i
                className='mr-1.5 inline-block size-2 rounded-[2px]'
                style={{
                  background: 'var(--ds-accent)',
                  boxShadow: deepSpaceDark
                    ? '0 0 6px rgba(34,211,238,.6)'
                    : '0 0 6px rgba(8,145,178,.6)',
                }}
              />
              {t('Consumption')}
            </span>
          </div>
        </div>
        <div className='mt-3.5 min-h-0 flex-1'>
          <div className='h-[220px]'>
            {themeReady && spec && !query.isLoading && hasData && (
              <VChart
                key={resolvedTheme}
                spec={{
                  ...spec,
                  theme: resolvedTheme === 'dark' ? 'dark' : 'light',
                  background: 'transparent',
                }}
                option={VCHART_OPTION}
              />
            )}
            {(!themeReady || query.isLoading) && (
              <Skeleton className='h-full w-full rounded-xl' />
            )}
            {themeReady && !query.isLoading && !hasData && (
              <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
                {t('No data')}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <TitledCard
      title={t('Consumption Trend')}
      description={t('Daily consumption over the last 7 days')}
      icon={<TrendingDown className='h-4 w-4' />}
      iconTone='info'
      disableHoverEffect
    >
      <div style={{ height: 220 }}>
        {themeReady && spec && !query.isLoading && hasData && (
          <VChart
            key={resolvedTheme}
            spec={{
              ...spec,
              theme: resolvedTheme === 'dark' ? 'dark' : 'light',
              background: 'transparent',
            }}
            option={VCHART_OPTION}
          />
        )}
        {(!themeReady || query.isLoading) && (
          <Skeleton className='h-full w-full rounded-xl' />
        )}
        {themeReady && !query.isLoading && !hasData && (
          <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
            {t('No data')}
          </div>
        )}
      </div>
    </TitledCard>
  )
}
