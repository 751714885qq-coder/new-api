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
import { Link } from '@tanstack/react-router'
import {
  Activity,
  CalendarDays,
  FileText,
  Flame,
  KeyRound,
  Orbit,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { VChart } from '@visactor/react-vchart'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/ui/icon-badge'
import { LineSparkline } from '@/features/dashboard/components/ui/stat-card'
import { useTheme } from '@/context/theme-provider'
import { useThemeCustomization } from '@/context/theme-customization-provider'
import { getUserQuotaDates } from '@/features/dashboard/api'
import {
  getDashboardChartColors,
  processChartData,
} from '@/features/dashboard/lib/charts'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { formatNumber, formatQuota } from '@/lib/format'
import { useThemeRadiusPx } from '@/lib/theme-radius'
import { computeTimeRange } from '@/lib/time'
import { VCHART_OPTION } from '@/lib/vchart'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Deep Space cockpit overview (WO-019 rendering baseline, strictly aligned):
 * greeting header + planet, four stat cards with deltas and sparklines
 * (balance card carries the recharge action), model call trend, model usage
 * donut with a top-model legend, and a quick-access column. Data comes from
 * the existing /api/data/self quota endpoints; charts reuse processChartData.
 */

// ---------------------------------------------------------------------------
// Shared VChart plumbing (theme manager init follows model-charts.tsx)
// ---------------------------------------------------------------------------

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

function CockpitChart(props: {
  spec: Record<string, unknown> | undefined
  height: number
}) {
  const { themeReady, resolvedTheme } = useVChartTheme()

  return (
    <div style={{ height: props.height }}>
      {themeReady && props.spec && (
        <VChart
          key={resolvedTheme}
          spec={{
            ...props.spec,
            theme: resolvedTheme === 'dark' ? 'dark' : 'light',
            background: 'transparent',
          }}
          option={VCHART_OPTION}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStartOfLocalDay(offsetDays = 0): number {
  const day = new Date()
  day.setHours(0, 0, 0, 0)
  day.setDate(day.getDate() + offsetDays)
  return Math.floor(day.getTime() / 1000)
}

function startOfCurrentMonth(monthOffset = 0): number {
  const now = new Date()
  return Math.floor(
    new Date(now.getFullYear(), now.getMonth() + monthOffset, 1).getTime() /
      1000
  )
}

function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

function sumBetween(
  data: QuotaDataItem[],
  startSec: number,
  endSec: number
): { quota: number; count: number } {
  let quota = 0
  let count = 0
  for (const item of data) {
    const ts = Number(item.created_at) || 0
    if (ts >= startSec && ts < endSec) {
      quota += Number(item.quota) || 0
      count += Number(item.count) || 0
    }
  }
  return { quota, count }
}

function bucketSeries(
  data: QuotaDataItem[],
  startSec: number,
  endSec: number,
  bucketCount: number,
  field: 'quota' | 'count'
): number[] {
  const buckets = Array.from({ length: bucketCount }, () => 0)
  const span = Math.max(1, endSec - startSec)
  for (const item of data) {
    const ts = Number(item.created_at) || 0
    if (ts < startSec || ts >= endSec) continue
    const index = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor(((ts - startSec) / span) * bucketCount))
    )
    buckets[index] += Number(item[field]) || 0
  }
  return buckets
}

/** Back-computed balance trend: current balance minus past usage, walking
 * backwards over daily buckets. */
function balanceSeries(
  dailyData: QuotaDataItem[],
  startSec: number,
  endSec: number,
  currentBalance: number
): number[] {
  const daily = bucketSeries(dailyData, startSec, endSec, 31, 'quota')
  const series: number[] = []
  let balance = currentBalance
  for (let i = daily.length - 1; i >= 0; i--) {
    series[i] = Math.max(0, balance)
    balance += daily[i]
  }
  return series
}

function formatPercent(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`
}

function DeltaLine(props: { delta: number | null; upIsBad: boolean }) {
  if (props.delta === null) {
    return <span className='text-muted-foreground text-xs'>--</span>
  }
  const good = props.upIsBad ? props.delta < 0 : props.delta > 0
  return (
    <span
      className={cn(
        'text-xs font-medium tabular-nums',
        good ? 'text-success' : 'text-destructive'
      )}
    >
      {props.delta < 0 ? '↓' : '↑'} {formatPercent(props.delta)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Header: greeting + planet decor
// ---------------------------------------------------------------------------

export function CockpitHeader() {
  const { t } = useTranslation()
  const { customization } = useThemeCustomization()
  const user = useAuthStore((state) => state.auth.user)
  const name = user?.username || user?.display_name || ''

  return (
    <div className='flex flex-wrap items-center justify-between gap-4'>
      <div className='flex min-w-0 flex-col gap-1'>
        <h1 className='text-xl font-bold tracking-tight sm:text-2xl'>
          {t('AI Connects the World · Making Models Work for You')}
        </h1>
        <p className='text-muted-foreground text-xs sm:text-sm'>
          {t('Welcome back, {{name}}', { name })}
        </p>
      </div>
      {customization.preset === 'deep-space' && (
        <div className='ds-cockpit-planet-wrap' aria-hidden='true'>
          <div className='ds-cockpit-planet' />
          <div className='ds-cockpit-orbit'>
            <span className='ds-cockpit-node' />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat cards row
// ---------------------------------------------------------------------------

function CockpitCard(props: {
  title: string
  value: string
  icon: LucideIcon
  children?: React.ReactNode
  action?: React.ReactNode
  sparkline?: number[]
  sparklineTone?: 'accent-1' | 'accent-2' | 'accent-3'
}) {
  const Icon = props.icon
  return (
    <div className='ds-cockpit-stat bg-card flex min-h-36 flex-col justify-between gap-2 rounded-2xl border p-4 shadow-xs transition-[transform,box-shadow] duration-200'>
      <div className='flex items-start justify-between gap-2'>
        <span className='text-muted-foreground flex items-center gap-2 text-xs font-medium'>
          <IconBadge tone='chart-1' size='stat'>
            <Icon />
          </IconBadge>
          {props.title}
        </span>
        {props.action}
      </div>
      <div className='font-mono text-xl font-semibold tracking-tight tabular-nums sm:text-2xl'>
        {props.value}
      </div>
      <div className='flex items-end justify-between gap-2'>
        <div className='flex flex-col gap-0.5'>{props.children}</div>
        {props.sparkline && (
          <LineSparkline
            values={props.sparkline}
            tone={props.sparklineTone ?? 'accent-1'}
          />
        )}
      </div>
    </div>
  )
}

export function CockpitStatCards() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const remainQuota = Number(user?.quota ?? 0)

  const range48h = useMemo(() => computeTimeRange(2), [])
  const monthStartSec = useMemo(() => startOfCurrentMonth(), [])
  const lastMonthStartSec = useMemo(() => startOfCurrentMonth(-1), [])

  const q48 = useQuery({
    queryKey: ['cockpit', '48h', range48h.start_timestamp],
    queryFn: async () => {
      const result = await getUserQuotaDates({
        start_timestamp: range48h.start_timestamp,
        end_timestamp: range48h.end_timestamp,
        default_time: 'hour',
      })
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 60 * 1000,
  })

  const qMonth = useQuery({
    queryKey: ['cockpit', 'months', lastMonthStartSec],
    queryFn: async () => {
      const result = await getUserQuotaDates({
        start_timestamp: lastMonthStartSec,
        end_timestamp: range48h.end_timestamp,
        default_time: 'day',
      })
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 60 * 1000,
  })

  const stats = useMemo(() => {
    const data48 = q48.data ?? []
    const dataMonth = qMonth.data ?? []
    const startOfToday = toStartOfLocalDay()
    const startOfYesterday = toStartOfLocalDay(-1)
    const elapsedToday = Math.max(1, range48h.end_timestamp - startOfToday)

    const today = sumBetween(data48, startOfToday, range48h.end_timestamp)
    const yesterday = sumBetween(
      data48,
      startOfYesterday,
      startOfYesterday + elapsedToday
    )
    const thisMonth = sumBetween(dataMonth, monthStartSec, Number.MAX_SAFE_INTEGER)
    const lastMonthSame = sumBetween(
      dataMonth,
      lastMonthStartSec,
      lastMonthStartSec + elapsedToday
    )

    const hourlyBuckets = 12
    return {
      todayUsage: today.quota,
      todayDelta: percentDelta(today.quota, yesterday.quota),
      todaySpark: bucketSeries(
        data48,
        startOfToday,
        range48h.end_timestamp,
        hourlyBuckets,
        'quota'
      ),
      monthUsage: thisMonth.quota,
      monthDelta: percentDelta(thisMonth.quota, lastMonthSame.quota),
      monthSpark: bucketSeries(
        dataMonth,
        monthStartSec,
        range48h.end_timestamp,
        hourlyBuckets,
        'quota'
      ),
      todayRequests: today.count,
      requestDelta: percentDelta(today.count, yesterday.count),
      requestSpark: bucketSeries(
        data48,
        startOfToday,
        range48h.end_timestamp,
        hourlyBuckets,
        'count'
      ),
      balanceSpark: balanceSeries(
        dataMonth,
        monthStartSec,
        range48h.end_timestamp,
        remainQuota
      ),
    }
  }, [q48.data, qMonth.data, monthStartSec, lastMonthStartSec, range48h.end_timestamp, remainQuota])

  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
      <CockpitCard
        title={t("Today's usage")}
        value={formatQuota(stats.todayUsage)}
        icon={Flame}
        sparkline={stats.todaySpark}
        sparklineTone='accent-1'
      >
        <span className='text-muted-foreground text-xs'>
          {t('vs yesterday')}
        </span>
        <DeltaLine delta={stats.todayDelta} upIsBad />
      </CockpitCard>

      <CockpitCard
        title={t('Month-to-date usage')}
        value={formatQuota(stats.monthUsage)}
        icon={CalendarDays}
        sparkline={stats.monthSpark}
        sparklineTone='accent-2'
      >
        <span className='text-muted-foreground text-xs'>
          {t('vs same period last month')}
        </span>
        <DeltaLine delta={stats.monthDelta} upIsBad />
      </CockpitCard>

      <CockpitCard
        title={t('Requests')}
        value={formatNumber(stats.todayRequests)}
        icon={Activity}
        sparkline={stats.requestSpark}
        sparklineTone='accent-3'
      >
        <span className='text-muted-foreground text-xs'>
          {t('vs yesterday')}
        </span>
        <DeltaLine delta={stats.requestDelta} upIsBad={false} />
      </CockpitCard>

      <CockpitCard
        title={t('Credit remaining')}
        value={formatQuota(remainQuota)}
        icon={Wallet}
        sparkline={stats.balanceSpark}
        sparklineTone='accent-1'
        action={
          <Button size='sm' render={<Link to='/wallet' />}>
            {t('Recharge')}
          </Button>
        }
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Insights row: call trend + usage share + quick access
// ---------------------------------------------------------------------------

const QUICK_ACTIONS: Array<{
  labelKey: string
  to: string
  icon: LucideIcon
}> = [
  { labelKey: 'Model Square', to: '/pricing', icon: Orbit },
  { labelKey: 'API Keys', to: '/keys', icon: KeyRound },
  { labelKey: 'Usage Logs', to: '/usage-logs', icon: FileText },
  { labelKey: 'Wallet', to: '/wallet', icon: Wallet },
]

function ModelLegend(props: { data: QuotaDataItem[] }) {
  const { t } = useTranslation()
  const otherLabel = t('Other')

  const entries = useMemo(() => {
    const totals = new Map<string, number>()
    let total = 0
    for (const item of props.data) {
      const model = item.model_name || 'Unknown'
      const count = Number(item.count) || 0
      totals.set(model, (totals.get(model) || 0) + count)
      total += count
    }
    if (total <= 0) return []

    // Mirror the color domain used by processChartData: sorted model names
    // plus the "Other" bucket, colored by the shared ordinal scheme.
    const sortedModels = [...totals.keys()].sort()
    const domain = [...new Set([...sortedModels, otherLabel])]
    const range = getDashboardChartColors(domain.length)
    const otherColor = range[domain.indexOf(otherLabel)] ?? '#808080'

    const ranked = [...totals.entries()]
      .map(([model, count]) => ({
        model,
        count,
        share: (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count)

    return ranked.slice(0, 5).map((entry) => ({
      ...entry,
      color: domain.includes(entry.model)
        ? range[domain.indexOf(entry.model)]
        : otherColor,
    }))
  }, [props.data, otherLabel])

  if (!entries.length) return null

  return (
    <div className='flex flex-col gap-1.5 px-1 pb-1'>
      {entries.map((entry) => (
        <div
          key={entry.model}
          className='flex items-center justify-between gap-2 text-xs'
        >
          <span className='flex min-w-0 items-center gap-2'>
            <span
              className='size-2 shrink-0 rounded-full'
              style={{ backgroundColor: entry.color }}
              aria-hidden='true'
            />
            <span className='truncate font-medium'>{entry.model}</span>
          </span>
          <span className='text-muted-foreground shrink-0 tabular-nums'>
            {entry.share.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

export function CockpitInsights() {
  const { t } = useTranslation()
  const { customization } = useThemeCustomization()
  const chartRadius = useThemeRadiusPx(
    '--radius-md',
    `${customization.preset}:${customization.radius}`
  )

  const range = useMemo(() => computeTimeRange(7), [])
  const query = useQuery({
    queryKey: ['cockpit', 'trend-7d', range.start_timestamp],
    queryFn: async () => {
      const result = await getUserQuotaDates({
        start_timestamp: range.start_timestamp,
        end_timestamp: range.end_timestamp,
        default_time: 'day',
      })
      return result.success ? (result.data ?? []) : []
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

  return (
    <div className='grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1fr)]'>
      <div className='ds-cockpit-insight bg-card overflow-hidden rounded-2xl border p-4 shadow-xs transition-[transform,box-shadow] duration-200'>
        <div className='mb-2 text-sm font-semibold'>
          {t('Model call trend')}
        </div>
        <CockpitChart
          spec={{
            ...chartData.spec_area,
            title: { visible: false },
            legends: { visible: false },
          }}
          height={280}
        />
      </div>

      <div className='ds-cockpit-insight bg-card overflow-hidden rounded-2xl border p-4 shadow-xs transition-[transform,box-shadow] duration-200'>
        <div className='mb-2 text-sm font-semibold'>
          {t('Model usage share')}
        </div>
        <CockpitChart
          spec={{
            ...chartData.spec_pie,
            title: { visible: false },
            legends: { visible: false },
            label: { visible: false },
          }}
          height={180}
        />
        <ModelLegend data={query.isLoading ? [] : (query.data ?? [])} />
      </div>

      <div className='bg-card flex flex-col gap-2 rounded-2xl border p-4 shadow-xs'>
        <div className='text-sm font-semibold'>{t('Quick access')}</div>
        <div className='grid gap-2'>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.to}
                variant='outline'
                className='justify-start'
                render={<Link to={action.to} />}
              >
                <Icon data-icon='inline-start' />
                {t(action.labelKey)}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
