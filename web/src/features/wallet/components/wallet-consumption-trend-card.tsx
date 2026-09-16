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

import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { useThemeCustomization } from '@/context/theme-customization-provider'
import { useTheme } from '@/context/theme-provider'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { processChartData } from '@/features/dashboard/lib'
import type { QuotaDataItem } from '@/features/dashboard/types'
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

  const spec = useMemo(() => {
    const base = chartData.spec_area as Record<string, unknown> | undefined
    if (!base) return undefined
    return {
      ...base,
      title: { visible: false },
      legends: { visible: false },
    }
  }, [chartData.spec_area])

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
