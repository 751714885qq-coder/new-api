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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/context/theme-provider'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { LineSparkline } from '@/features/dashboard/components/ui/stat-card'
import { getDashboardChartColors } from '@/features/dashboard/lib/charts'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { getApiKeys } from '@/features/keys/api'
import { getUserModels } from '@/lib/api'
import { formatNumber, formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { VCHART_OPTION } from '@/lib/vchart'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Deep Space cockpit overview, aligned to the approved v6-01-s1 rendering:
 * time-of-day greeting + tagline with a service status bar, four stat cards
 * (current balance / today's usage / today's requests / active tokens with a
 * progress bar), a 24-hour request trend area chart, and a today usage-share
 * donut with an amount legend. Data comes from /api/data/self, /api/token/
 * and /api/user/models. Values without a real source render as "—" instead
 * of fabricated numbers; the mock's success/failure split has no upstream
 * field, so the trend carries a single request series.
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

function formatPercent(delta: number): string {
  return `${Math.abs(delta).toFixed(1)}%`
}

function formatHourLabel(sec: number): string {
  const hour = new Date(sec * 1000).getHours()
  return `${String(hour).padStart(2, '0')}:00`
}

function deltaToneClass(
  upIsBad: boolean,
  delta: number,
  badTone?: 'destructive' | 'warning' | 'neutral'
): string {
  const good = upIsBad ? delta < 0 : delta > 0
  if (good) return 'text-success'
  if (badTone === 'neutral') return 'text-muted-foreground'
  return badTone === 'warning' ? 'text-warning' : 'text-destructive'
}

function DeltaLine(props: {
  delta: number | null
  upIsBad: boolean
  badTone?: 'destructive' | 'warning' | 'neutral'
}) {
  if (props.delta === null) {
    return <span className='text-muted-foreground text-xs'>--</span>
  }
  if (props.delta === 0) {
    return <span className='text-muted-foreground text-xs'>0.0%</span>
  }
  return (
    <span
      className={cn(
        'text-xs font-medium tabular-nums',
        deltaToneClass(props.upIsBad, props.delta, props.badTone)
      )}
    >
      {props.delta < 0 ? '▼' : '▲'} {formatPercent(props.delta)}
    </span>
  )
}

/** Renders "$42.18" with the currency symbol smaller, as in the v6 mock. */
function QuotaValue(props: { text: string }) {
  const match = props.text.match(/^[^0-9]*/)
  const prefix = match ? match[0] : ''
  if (!prefix) return props.text
  return (
    <>
      <span className='text-muted-foreground mr-0.5 text-sm sm:text-base'>
        {prefix}
      </span>
      {props.text.slice(prefix.length)}
    </>
  )
}

// ---------------------------------------------------------------------------
// Shared 48h quota query (deduped across header / stat cards / trend)
// ---------------------------------------------------------------------------

/** End timestamp quantized to the minute so all cockpit mounts share one
 * react-query cache entry instead of fetching per-second variants. */
function cockpitRange(days: number): {
  start_timestamp: number
  end_timestamp: number
} {
  const end = Math.floor(Date.now() / 1000 / 60) * 60
  return { start_timestamp: end - days * 24 * 3600, end_timestamp: end }
}

function useQuota48h() {
  const range = useMemo(() => cockpitRange(2), [])
  const query = useQuery({
    queryKey: ['cockpit', '48h', range.start_timestamp],
    queryFn: async () => {
      const result = await getUserQuotaDates({
        start_timestamp: range.start_timestamp,
        end_timestamp: range.end_timestamp,
        default_time: 'hour',
      })
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 60 * 1000,
  })
  return { query, range }
}

// ---------------------------------------------------------------------------
// Header: greeting + tagline + service status bar
// ---------------------------------------------------------------------------

function StatusItem(props: { label: string; value: React.ReactNode }) {
  return (
    <div className='flex min-w-14 flex-col gap-0.5'>
      <span className='text-muted-foreground text-xs'>{props.label}</span>
      <span className='text-sm font-semibold tabular-nums'>{props.value}</span>
    </div>
  )
}

/** Time-of-day greeting key, mirroring the v6 mock's greeting. */
function greetingKey(hour: number): string {
  if (hour < 12) return 'Good morning, {{name}}'
  if (hour < 18) return 'Good afternoon, {{name}}'
  return 'Good evening, {{name}}'
}

export function CockpitHeader() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const name = user?.username || user?.display_name || ''

  const { query: quota48, range } = useQuota48h()
  const models = useQuery({
    queryKey: ['cockpit', 'user-models'],
    queryFn: async () => {
      const result = await getUserModels()
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 5 * 60 * 1000,
  })

  let modelCount = '—'
  if (models.isLoading) modelCount = '…'
  else if (models.data) modelCount = String(models.data.length)

  const todayUsage = useMemo(
    () =>
      sumBetween(quota48.data ?? [], toStartOfLocalDay(), range.end_timestamp)
        .quota,
    [quota48.data, range.end_timestamp]
  )

  const greeting = t(greetingKey(new Date().getHours()), { name })

  return (
    <div className='flex flex-wrap items-start justify-between gap-4'>
      <div className='flex min-w-0 flex-col gap-1'>
        <h1 className='text-xl font-bold tracking-tight sm:text-2xl'>
          {greeting}
        </h1>
        <p className='text-muted-foreground text-xs sm:text-sm'>
          {t(
            'One API key for OpenAI, Claude, Gemini, DeepSeek and more leading models.'
          )}
        </p>
      </div>
      <div className='flex flex-wrap items-center gap-x-6 gap-y-2 pt-1'>
        <div className='flex items-center gap-2 text-xs'>
          <span className='bg-success size-2 rounded-full' aria-hidden='true' />
          {t('Service operational')}
        </div>
        <StatusItem label={t('Online models')} value={modelCount} />
        {/* No latency telemetry exists upstream; render an honest placeholder. */}
        <StatusItem label={t('Avg latency')} value='—' />
        <StatusItem
          label={t("Today's spend")}
          value={quota48.isLoading ? '…' : formatQuota(todayUsage)}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat cards row
// ---------------------------------------------------------------------------

function CockpitCard(props: {
  title: string
  value: React.ReactNode
  children?: React.ReactNode
  sparkline?: number[]
  sparklineTone?: 'accent-1' | 'accent-2' | 'accent-3'
}) {
  return (
    <div className='ds-cockpit-stat bg-card flex min-h-36 flex-col justify-between gap-2 rounded-2xl border p-4 shadow-xs transition-[transform,box-shadow] duration-200'>
      <div className='flex items-start justify-between gap-2'>
        <span className='text-muted-foreground text-xs font-medium'>
          {props.title}
        </span>
        {props.sparkline && props.sparkline.some((v) => v > 0) && (
          <LineSparkline
            values={props.sparkline}
            tone={props.sparklineTone ?? 'accent-1'}
          />
        )}
      </div>
      <div className='font-mono text-xl font-semibold tracking-tight tabular-nums sm:text-2xl'>
        {props.value}
      </div>
      <div className='flex items-end justify-between gap-2'>
        <div className='flex flex-col gap-0.5'>{props.children}</div>
      </div>
    </div>
  )
}

export function CockpitStatCards() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const remainQuota = Number(user?.quota ?? 0)

  const { query: quota48, range } = useQuota48h()
  const tokens = useQuery({
    queryKey: ['cockpit', 'tokens'],
    queryFn: async () => {
      const result = await getApiKeys({ p: 1, size: 100 })
      return result.data?.items ?? []
    },
    staleTime: 60 * 1000,
  })

  const stats = useMemo(() => {
    const data48 = quota48.data ?? []
    const startOfToday = toStartOfLocalDay()
    const startOfYesterday = toStartOfLocalDay(-1)
    const elapsedToday = Math.max(1, range.end_timestamp - startOfToday)

    const today = sumBetween(data48, startOfToday, range.end_timestamp)
    const yesterday = sumBetween(
      data48,
      startOfYesterday,
      startOfYesterday + elapsedToday
    )
    const usage24h = sumBetween(
      data48,
      range.end_timestamp - 24 * 3600,
      range.end_timestamp
    ).quota
    const balancePrev = remainQuota + usage24h
    const hourlyBuckets = 12

    return {
      todayUsage: today.quota,
      todayDelta: percentDelta(today.quota, yesterday.quota),
      todaySpark: bucketSeries(
        data48,
        startOfToday,
        range.end_timestamp,
        hourlyBuckets,
        'quota'
      ),
      todayRequests: today.count,
      requestDelta: percentDelta(today.count, yesterday.count),
      balanceDelta:
        balancePrev > 0
          ? ((remainQuota - balancePrev) / balancePrev) * 100
          : null,
    }
  }, [quota48.data, range.end_timestamp, remainQuota])

  const tokenStats = useMemo(() => {
    const items = tokens.data ?? []
    const startOfToday = toStartOfLocalDay()
    const enabled = items.filter((item) => item.status === 1)
    const activeToday = enabled.filter(
      (item) => (Number(item.accessed_time) || 0) >= startOfToday
    ).length
    return {
      active: activeToday,
      enabled: enabled.length,
      unusedToday: enabled.length - activeToday,
    }
  }, [tokens.data])

  const deltaRow = (delta: React.ReactNode, label: string) => (
    <div className='flex items-center gap-1.5'>
      {delta}
      <span className='text-muted-foreground text-xs'>{label}</span>
    </div>
  )

  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
      <CockpitCard
        title={t('Current balance')}
        value={<QuotaValue text={formatQuota(remainQuota)} />}
      >
        {deltaRow(
          <DeltaLine delta={stats.balanceDelta} upIsBad={false} />,
          t('vs yesterday')
        )}
      </CockpitCard>

      <CockpitCard
        title={t("Today's usage")}
        value={<QuotaValue text={formatQuota(stats.todayUsage)} />}
        sparkline={stats.todaySpark}
        sparklineTone='accent-1'
      >
        {deltaRow(
          <DeltaLine delta={stats.todayDelta} upIsBad badTone='warning' />,
          t('vs yesterday')
        )}
      </CockpitCard>

      <CockpitCard
        title={t("Today's requests")}
        value={formatNumber(stats.todayRequests)}
      >
        {deltaRow(
          <DeltaLine
            delta={stats.requestDelta}
            upIsBad={false}
            badTone='neutral'
          />,
          t('vs yesterday')
        )}
      </CockpitCard>

      <CockpitCard
        title={t('Active tokens')}
        value={
          <>
            {tokenStats.active}{' '}
            <span className='text-muted-foreground text-base sm:text-lg'>
              / {tokenStats.enabled}
            </span>
          </>
        }
      >
        <div className='flex w-full flex-col gap-1.5'>
          <div
            className='bg-muted h-1.5 w-full overflow-hidden rounded-full'
            role='progressbar'
            aria-valuemin={0}
            aria-valuemax={tokenStats.enabled}
            aria-valuenow={tokenStats.active}
          >
            <div
              className='bg-primary h-full rounded-full'
              style={{
                width:
                  tokenStats.enabled > 0
                    ? `${(tokenStats.active / tokenStats.enabled) * 100}%`
                    : '0%',
              }}
            />
          </div>
          <span className='text-muted-foreground text-xs'>
            {t('{{count}} tokens unused today', {
              count: tokenStats.unusedToday,
            })}
          </span>
        </div>
      </CockpitCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Insights row: 24h request trend + today usage share
// ---------------------------------------------------------------------------

export function CockpitInsights() {
  const { t } = useTranslation()
  const { query: quota48, range } = useQuota48h()

  const todayStartSec = useMemo(() => toStartOfLocalDay(), [])
  const todayModels = useQuery({
    queryKey: ['cockpit', 'today-models', todayStartSec],
    queryFn: async () => {
      const result = await getUserQuotaDates({
        start_timestamp: todayStartSec,
        end_timestamp: range.end_timestamp,
        default_time: 'day',
      })
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 60 * 1000,
  })

  // 24 hourly buckets aligned to clock hours, as in the approved mock.
  const trend = useMemo(() => {
    const startSec = Math.floor((range.end_timestamp - 24 * 3600) / 3600) * 3600
    const counts = bucketSeries(
      quota48.data ?? [],
      startSec,
      startSec + 24 * 3600,
      24,
      'count'
    )
    return {
      values: counts.map((count, index) => ({
        time: formatHourLabel(startSec + index * 3600),
        count,
        series: 'requests',
      })),
      peak: Math.max(0, ...counts),
    }
  }, [quota48.data, range.end_timestamp])

  const trendColor = useMemo(() => getDashboardChartColors(3)[0], [])
  const trendSpec = useMemo(
    () => ({
      type: 'area',
      data: [{ id: 'trend', values: trend.values }],
      xField: 'time',
      yField: 'count',
      seriesField: 'series',
      stack: false,
      curveType: 'monotone' as const,
      color: trendColor,
      axes: [
        {
          orient: 'bottom',
          label: {
            formatMethod: (value: string | string[]) =>
              typeof value === 'string' && Number(value.slice(0, 2)) % 6 === 0
                ? value
                : '',
          },
        },
        { orient: 'left' },
      ],
      legends: { visible: false },
    }),
    [trend.values, trendColor]
  )

  const donut = useMemo(() => {
    const totals = new Map<string, number>()
    let total = 0
    for (const item of todayModels.data ?? []) {
      const model = item.model_name || 'Unknown'
      const quota = Number(item.quota) || 0
      totals.set(model, (totals.get(model) || 0) + quota)
      total += quota
    }
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1])
    const entries = ranked
      .slice(0, 7)
      .map(([model, quota]) => ({ model, quota }))
    const restQuota = ranked.slice(7).reduce((sum, [, quota]) => sum + quota, 0)
    if (restQuota > 0) entries.push({ model: t('Other'), quota: restQuota })
    const domain = entries.map((entry) => entry.model)
    return {
      entries,
      total,
      domain,
      colors: getDashboardChartColors(domain.length),
    }
  }, [todayModels.data, t])

  const donutSpec = useMemo(
    () => ({
      type: 'pie',
      data: [
        {
          id: 'share',
          values: donut.entries.map((entry) => ({
            model: entry.model,
            value: entry.quota,
          })),
        },
      ],
      categoryField: 'model',
      valueField: 'value',
      outerRadius: 0.92,
      innerRadius: 0.72,
      color: { type: 'ordinal', domain: donut.domain, range: donut.colors },
      label: { visible: false },
      legends: { visible: false },
    }),
    [donut]
  )

  return (
    <div className='grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]'>
      <div className='ds-cockpit-insight bg-card overflow-hidden rounded-2xl border p-4 shadow-xs transition-[transform,box-shadow] duration-200'>
        <div className='mb-2 flex flex-wrap items-baseline gap-3'>
          <span className='text-sm font-semibold'>{t('Request trend')}</span>
          <span className='text-muted-foreground text-xs'>
            {t('Last 24 hours · hourly · peak {{peak}} req/h', {
              peak: formatNumber(trend.peak),
            })}
          </span>
        </div>
        <CockpitChart spec={trendSpec} height={320} />
      </div>

      <div className='ds-cockpit-insight bg-card overflow-hidden rounded-2xl border p-4 shadow-xs transition-[transform,box-shadow] duration-200'>
        <div className='mb-2 flex items-baseline justify-between gap-2'>
          <span className='text-sm font-semibold'>
            {t('Model usage share')}
          </span>
          <span className='text-muted-foreground text-xs'>
            {t('Today · USD')}
          </span>
        </div>
        {donut.total > 0 ? (
          <>
            <div className='relative'>
              <CockpitChart spec={donutSpec} height={210} />
              <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
                <span className='font-mono text-2xl font-semibold tracking-tight tabular-nums'>
                  <QuotaValue text={formatQuota(donut.total)} />
                </span>
                <span className='text-muted-foreground text-xs'>
                  {t("Today's usage")}
                </span>
              </div>
            </div>
            <div className='mt-3 flex flex-col gap-1.5 px-1 pb-1'>
              {donut.entries.map((entry) => (
                <div
                  key={entry.model}
                  className='flex items-center justify-between gap-2 text-xs'
                >
                  <span className='flex min-w-0 items-center gap-2'>
                    <span
                      className='size-2 shrink-0 rounded-full'
                      style={{
                        backgroundColor:
                          donut.colors[donut.domain.indexOf(entry.model)] ??
                          '#808080',
                      }}
                      aria-hidden='true'
                    />
                    <span className='truncate font-medium'>{entry.model}</span>
                  </span>
                  <span className='text-muted-foreground shrink-0 tabular-nums'>
                    {formatQuota(entry.quota)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className='text-muted-foreground flex h-40 items-center justify-center text-sm'>
            {t('No usage recorded today')}
          </div>
        )}
      </div>
    </div>
  )
}
