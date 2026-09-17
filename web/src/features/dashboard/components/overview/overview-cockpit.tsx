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
import { Calendar as CalendarIcon } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { enUS, fr, ja, ru, vi, zhCN } from 'react-day-picker/locale'
import { useTranslation } from 'react-i18next'

import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getUserQuotaDates } from '@/features/dashboard/api'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { getApiKeys } from '@/features/keys/api'
import { getPerfMetricsSummary } from '@/features/performance-metrics/api'
import { getUserLogs } from '@/features/usage-logs/api'
import { getUserModels } from '@/lib/api'
import dayjs from '@/lib/dayjs'
import { formatNumber, formatQuota } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Deep Space cockpit overview, ported 1:1 from the approved v6-01-s1
 * rendering (S-series spec is the authoritative visual baseline): the
 * render's exact DOM structure, CSS recipes and hand-built SVG charts are
 * copied verbatim; only the data slots are wired to live endpoints
 * (/api/data/self, /api/token/, /api/user/models, /api/perf-metrics/summary).
 * Dark-surface values live in the --ds-* tokens (theme-presets.css) with the
 * render's literal values; light mode carries same-family fallbacks.
 */

// ---------------------------------------------------------------------------
// S-series spec constants (07-设计语言-v4规范.md §3, verbatim)
// ---------------------------------------------------------------------------

const DS_PALETTE = [
  '#22d3ee',
  '#818cf8',
  '#a78bfa',
  '#38bdf8',
  '#2dd4bf',
  '#60a5fa',
  '#c084fc',
  'rgba(255,255,255,0.22)',
]

const DONUT_SEGMENT_GLOWS = [
  'rgba(34,211,238,0.5)',
  'rgba(129,140,248,0.45)',
  'rgba(167,139,250,0.45)',
]

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

/** Catmull-Rom smoothing, matching the render's soft bezier curves. The
 * maxY clamp keeps the curve from overshooting below the axis baseline. */
function smoothPath(
  points: readonly (readonly [number, number])[],
  maxY?: number
): string {
  if (points.length === 0) return ''
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
  for (let i = 1; i < points.length; i++) {
    const p0 = points[Math.max(0, i - 2)]
    const p1 = points[i - 1]
    const p2 = points[i]
    const p3 = points[Math.min(points.length - 1, i + 1)]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = Math.min(p1[1] + (p2[1] - p0[1]) / 6, maxY ?? Infinity)
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = Math.min(p2[1] - (p3[1] - p1[1]) / 6, maxY ?? Infinity)
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

function formatHour(sec: number): string {
  const hour = new Date(sec * 1000).getHours()
  return `${String(hour).padStart(2, '0')}:00`
}

/** X-axis label placement: pinned to the edges, centered elsewhere. */
function axisLabelStyle(pct: number): CSSProperties {
  if (pct === 0) return { left: 0, bottom: 0 }
  if (pct === 100) return { right: 0, bottom: 0 }
  return {
    left: `${pct}%`,
    bottom: 0,
    transform: 'translateX(-50%)',
  }
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

interface PerfSummary {
  uptimePct: number | null
  latencyMs: number | null
}

function usePerfSummary(): PerfSummary {
  const query = useQuery({
    queryKey: ['cockpit', 'perf-summary'],
    queryFn: async () => {
      const result = await getPerfMetricsSummary(24)
      return result.data?.models ?? []
    },
    staleTime: 60 * 1000,
    retry: false,
  })
  return useMemo(() => {
    const models = query.data
    if (!models || models.length === 0) {
      return { uptimePct: null, latencyMs: null }
    }
    let rate = 0
    let latency = 0
    let n = 0
    for (const model of models) {
      if (Number.isFinite(model.success_rate)) {
        rate += model.success_rate
        n += 1
      }
      if (Number.isFinite(model.avg_latency_ms)) {
        latency += model.avg_latency_ms
      }
    }
    return {
      uptimePct: n > 0 ? rate / n : null,
      latencyMs: models.length > 0 ? latency / models.length : null,
    }
  }, [query.data])
}

// ---------------------------------------------------------------------------
// Delta indicator (render's .delta classes: green up / white down / amber warn)
// ---------------------------------------------------------------------------

/** Delta tone: green when favorable, amber for cost warnings, dim otherwise. */
function deltaColor(good: boolean, badTone: 'warning' | 'neutral'): string {
  if (good) return 'var(--ds-green)'
  return badTone === 'warning' ? 'var(--ds-amber)' : 'var(--ds-delta-bad)'
}

function DeltaLine(props: {
  delta: number | null
  upIsBad: boolean
  badTone: 'warning' | 'neutral'
}) {
  if (props.delta === null) {
    return <span style={{ color: 'var(--ds-t3)' }}>--</span>
  }
  if (props.delta === 0) {
    return <span style={{ color: 'var(--ds-t3)' }}>0.0%</span>
  }
  const good = props.upIsBad ? props.delta < 0 : props.delta > 0
  const color = deltaColor(good, props.badTone)
  return (
    <span style={{ color }} className='text-[11.5px] font-medium tabular-nums'>
      {props.delta < 0 ? '▼' : '▲'} {formatPercent(props.delta)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Header: greeting + tagline + service status bar (v6-01-s1 .hero)
// ---------------------------------------------------------------------------

function greetingKey(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function CockpitHeader() {
  const { t, i18n } = useTranslation()
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
  const perf = usePerfSummary()

  const todayUsage = useMemo(
    () =>
      sumBetween(quota48.data ?? [], toStartOfLocalDay(), range.end_timestamp)
        .quota,
    [quota48.data, range.end_timestamp]
  )

  const separator = i18n.language.startsWith('zh') ? '，' : ', '
  const statStyle = {
    padding: '0 18px',
    borderLeft: '1px solid var(--ds-line)',
  }

  return (
    <div className='flex flex-wrap items-start justify-between gap-4'>
      <div className='min-w-0'>
        <h1
          className='tracking-[-0.02em]'
          style={{ fontSize: 29, fontWeight: 650, color: 'var(--ds-t1)' }}
        >
          {t(greetingKey(new Date().getHours()))}
          <span style={{ color: 'var(--ds-t2)', fontWeight: 550 }}>
            {separator}
            {name}
          </span>
        </h1>
        <p
          className='mt-2 max-w-[820px]'
          style={{
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'var(--ds-t2)',
          }}
        >
          {t('Your relay to frontier AI models — ')}
          <span style={{ color: 'var(--ds-t1)' }}>{t('one API key')}</span>
          {t(' calling OpenAI, Claude, Gemini, DeepSeek and more.')}
        </p>
      </div>
      <div className='mt-1.5 flex flex-wrap items-center pt-1.5'>
        <div style={{ ...statStyle, borderLeft: 'none' }}>
          <div
            className='flex items-center gap-1.5 whitespace-nowrap'
            style={{ fontSize: 11, color: 'var(--ds-t3)' }}
          >
            <span
              aria-hidden='true'
              className='inline-block size-1.5 rounded-full'
              style={{
                background: 'var(--ds-green)',
                boxShadow: '0 0 6px rgba(52,211,153,.8)',
              }}
            />
            {t('System operational')}
          </div>
          <div
            className='mt-1 font-semibold whitespace-nowrap tabular-nums'
            style={{ fontSize: 17, color: 'var(--ds-t1)' }}
          >
            {perf.uptimePct === null ? '—' : `${perf.uptimePct.toFixed(2)}%`}
            <span
              style={{ fontSize: 11, color: 'var(--ds-t3)', fontWeight: 500 }}
            >
              {' '}
              {t('available')}
            </span>
          </div>
        </div>
        <div style={statStyle}>
          <div
            className='whitespace-nowrap'
            style={{ fontSize: 11, color: 'var(--ds-t3)' }}
          >
            {t('Online models')}
          </div>
          <div
            className='mt-1 font-semibold tabular-nums'
            style={{ fontSize: 17, color: 'var(--ds-t1)' }}
          >
            {models.isLoading ? '…' : String(models.data?.length ?? 0)}
          </div>
        </div>
        <div style={statStyle}>
          <div
            className='whitespace-nowrap'
            style={{ fontSize: 11, color: 'var(--ds-t3)' }}
          >
            {t('Avg latency')}
          </div>
          <div
            className='mt-1 font-mono font-semibold tabular-nums'
            style={{ fontSize: 17, color: 'var(--ds-t1)' }}
          >
            {perf.latencyMs === null ? '—' : Math.round(perf.latencyMs)}
            <span
              style={{ fontSize: 11, color: 'var(--ds-t3)', fontWeight: 500 }}
            >
              {' '}
              ms
            </span>
          </div>
        </div>
        <div style={statStyle}>
          <div
            className='whitespace-nowrap'
            style={{ fontSize: 11, color: 'var(--ds-t3)' }}
          >
            {t("Today's spend")}
          </div>
          <div
            className='mt-1 font-mono font-semibold tabular-nums'
            style={{ fontSize: 17, color: 'var(--ds-t1)' }}
          >
            {quota48.isLoading ? '…' : formatQuota(todayUsage)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat cards row (v6-01-s1 .kpis, verbatim card recipe)
// ---------------------------------------------------------------------------

function CockpitCard(props: {
  title: string
  value: ReactNode
  children?: ReactNode
  spark?: number[]
  delta?: ReactNode
  deltaChildren?: ReactNode
  deltaStyle?: CSSProperties
}) {
  return (
    <div
      className='relative'
      style={{
        border: '1px solid var(--ds-line)',
        borderRadius: 14,
        background: 'var(--ds-card)',
        backdropFilter: 'blur(16px)',
        boxShadow:
          '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.045)',
        padding: '20px 22px 18px',
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          letterSpacing: '0.08em',
          color: 'var(--ds-t3)',
          fontWeight: 600,
        }}
      >
        {props.title}
      </div>
      {props.spark && props.spark.some((v) => v > 0) && (
        <svg
          width='72'
          height='26'
          viewBox='0 0 72 26'
          fill='none'
          className='absolute top-[20px] right-[18px]'
          style={{ color: 'var(--ds-accent)', opacity: 0.85 }}
          aria-hidden='true'
        >
          <path
            d={sparkPath(props.spark)}
            stroke='currentColor'
            strokeWidth='1.6'
            strokeLinecap='round'
            opacity='0.9'
          />
        </svg>
      )}
      <div
        className='tracking-[-0.01em]'
        style={{
          marginTop: 12,
          fontSize: 30,
          fontWeight: 650,
          color: 'var(--ds-t1)',
        }}
      >
        {props.value}
      </div>
      {props.children}
      {props.delta !== undefined && (
        <div
          className='flex items-center gap-1.5'
          style={{
            marginTop: props.deltaStyle?.marginTop ?? 10,
            fontSize: 11.5,
            color: 'var(--ds-t3)',
          }}
        >
          {props.delta}
          {props.deltaChildren}
        </div>
      )}
    </div>
  )
}

function sparkPath(values: number[]): string {
  const n = values.length
  if (n < 2) return ''
  const max = Math.max(...values, 1)
  const points = values.map(
    (v, i) => [1 + (i * 70) / (n - 1), 24 - (v / max) * 20] as const
  )
  return smoothPath(points)
}

function unitSpan(text: string): ReactNode {
  const match = text.match(/^[^0-9]*/)
  const prefix = match ? match[0] : ''
  if (!prefix) return text
  return (
    <>
      <span
        style={{
          fontSize: 16,
          color: 'var(--ds-t2)',
          fontWeight: 500,
          marginRight: 2,
        }}
      >
        {prefix}
      </span>
      {text.slice(prefix.length)}
    </>
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

  const vsYesterday = (
    <span style={{ color: 'var(--ds-t3)', fontSize: 11.5 }}>
      {t('vs yesterday')}
    </span>
  )

  return (
    <div className='mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      <CockpitCard
        title={t('Current balance')}
        value={unitSpan(formatQuota(remainQuota))}
        delta={
          <DeltaLine
            delta={stats.balanceDelta}
            upIsBad={false}
            badTone='neutral'
          />
        }
        deltaChildren={vsYesterday}
      />

      <CockpitCard
        title={t("Today's usage")}
        value={unitSpan(formatQuota(stats.todayUsage))}
        spark={stats.todaySpark}
        delta={<DeltaLine delta={stats.todayDelta} upIsBad badTone='warning' />}
        deltaChildren={vsYesterday}
      />

      <CockpitCard
        title={t("Today's requests")}
        value={formatNumber(stats.todayRequests)}
        delta={
          <DeltaLine
            delta={stats.requestDelta}
            upIsBad={false}
            badTone='neutral'
          />
        }
        deltaChildren={vsYesterday}
      />

      <CockpitCard
        title={t('Active tokens')}
        value={
          <>
            {tokenStats.active}
            <span
              style={{
                fontSize: 16,
                color: 'var(--ds-t2)',
                fontWeight: 500,
              }}
            >
              {' '}
              / {tokenStats.enabled}
            </span>
          </>
        }
      >
        <div
          className='overflow-hidden rounded-full'
          style={{
            marginTop: 12,
            height: 3,
            background: 'rgba(255,255,255,0.08)',
          }}
          role='progressbar'
          aria-valuemin={0}
          aria-valuemax={tokenStats.enabled}
          aria-valuenow={tokenStats.active}
        >
          <div
            className='h-full rounded-full'
            style={{
              width:
                tokenStats.enabled > 0
                  ? `${(tokenStats.active / tokenStats.enabled) * 100}%`
                  : '0%',
              background:
                'linear-gradient(90deg, rgba(34,211,238,0.5), var(--ds-accent))',
              boxShadow: '0 0 8px rgba(34,211,238,0.5)',
            }}
          />
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11.5,
            color: 'var(--ds-t3)',
          }}
        >
          {t('{{count}} tokens unused today', {
            count: tokenStats.unusedToday,
          })}
        </div>
      </CockpitCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Insights row (v6-01-s1 .charts): hand-built SVG trend + donut
// ---------------------------------------------------------------------------

const calendarLocales = {
  en: enUS,
  zh: zhCN,
  fr,
  ru,
  ja,
  vi,
} as const

/** Natural-day selector for the trend panel: glass button + calendar
 * popover, reusing the app's Calendar; future dates disabled. */
function TrendDayPicker(props: { day: Date; onSelect: (day: Date) => void }) {
  const { t, i18n } = useTranslation()
  const locale =
    calendarLocales[i18n.language as keyof typeof calendarLocales] ?? enUS
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type='button'
            className='flex items-center gap-1.5'
            style={{
              height: 28,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid var(--ds-line)',
              background: 'rgba(255,255,255,0.03)',
              fontSize: 12,
              color: 'var(--ds-t2)',
            }}
            aria-label={t('Pick a date')}
          />
        }
      >
        <CalendarIcon size={13} aria-hidden='true' />
        {dayjs(props.day).format('YYYY-MM-DD')}
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='end'>
        <Calendar
          mode='single'
          captionLayout='dropdown'
          selected={props.day}
          onSelect={(date) => {
            if (!date) return
            const picked = new Date(date)
            picked.setHours(0, 0, 0, 0)
            props.onSelect(picked)
          }}
          locale={locale}
          disabled={(date: Date) => date > new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}

function TrendChart(props: {
  counts: number[]
  errorCounts: number[]
  startSec: number
}) {
  const maxV = Math.max(...props.counts, 1)
  const points = props.counts.map(
    (v, i) => [i * (796 / 23), 400 - (v / maxV) * 255] as const
  )
  const linePath = smoothPath(points, 400)
  const areaPath = `${linePath} L796,400 L0,400 Z`
  // Fail line shares the success y-scale so the two curves are directly
  // comparable — the render draws it thin, white and unlit (line 348).
  const failPoints = props.errorCounts.map(
    (v, i) => [i * (796 / 23), 400 - (v / maxV) * 255] as const
  )
  const failPath = smoothPath(failPoints, 400)
  const last = points.at(-1) ?? ([0, 400] as const)
  // Natural-day axis: 00:00 → 24:00 of the selected day, ticks pinned to
  // the axis dots (0/25/50/75/100% ↔ cx 0/200/400/600/800).
  const labels = [0, 6, 12, 18, 24].map((h) =>
    h === 24 ? '24:00' : formatHour(props.startSec + h * 3600)
  )

  return (
    <div className='relative mt-3.5 min-h-0 flex-1'>
      <svg
        width='100%'
        height='100%'
        viewBox='0 0 800 420'
        preserveAspectRatio='none'
        className='absolute'
        style={{
          inset: '14px 0 22px',
          width: 'calc(100% - 0px)',
          height: 'calc(100% - 36px)',
          overflow: 'visible',
        }}
        aria-hidden='true'
      >
        <defs>
          <linearGradient id='ds-area' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor='#22d3ee' stopOpacity='0.18' />
            <stop offset='1' stopColor='#22d3ee' stopOpacity='0' />
          </linearGradient>
          <linearGradient id='ds-stroke' x1='0' y1='0' x2='1' y2='0'>
            <stop offset='0' stopColor='#38bdf8' />
            <stop offset='1' stopColor='#22d3ee' />
          </linearGradient>
          <filter id='ds-glow' x='-40%' y='-40%' width='180%' height='180%'>
            <feGaussianBlur stdDeviation='0.7' result='b' />
            <feMerge>
              <feMergeNode in='b' />
              <feMergeNode in='SourceGraphic' />
            </feMerge>
          </filter>
        </defs>
        <g stroke='rgba(255,255,255,0.055)' strokeWidth='1'>
          <line x1='0' y1='50' x2='800' y2='50' />
          <line x1='0' y1='167' x2='800' y2='167' />
          <line x1='0' y1='283' x2='800' y2='283' />
          <line x1='0' y1='400' x2='800' y2='400' />
        </g>
        <path d={areaPath} fill='url(#ds-area)' />
        <path
          d={linePath}
          fill='none'
          stroke='url(#ds-stroke)'
          strokeWidth='1'
          strokeLinecap='round'
          filter='url(#ds-glow)'
        />
        {/* render line 348 verbatim: fail line, thin white, no glow */}
        <path
          d={failPath}
          fill='none'
          stroke='rgba(255,255,255,0.28)'
          strokeWidth='0.9'
          strokeLinecap='round'
        />
        <g fill='rgba(255,255,255,0.45)'>
          {[0, 200, 400, 600, 800].map((x) => (
            <g key={x}>
              {/* dark halo: keeps the dot readable where the success line
                  runs flat along the baseline */}
              <circle cx={x} cy='400' r='3.4' fill='rgba(2,6,17,0.75)' />
              <circle cx={x} cy='400' r='1.6' />
            </g>
          ))}
        </g>
        <circle cx={last[0]} cy={last[1]} r='4.5' fill='rgba(34,211,238,0.2)' />
        <circle cx={last[0]} cy={last[1]} r='2.2' fill='#a5f3fc' />
      </svg>
      <div
        className='absolute right-0 left-0'
        style={{
          bottom: -4,
          height: 16,
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--ds-axis)',
          letterSpacing: '0.04em',
        }}
      >
        {[0, 25, 50, 75, 100].map((pct, i) => (
          <span key={pct} className='absolute' style={axisLabelStyle(pct)}>
            {labels[i]}
          </span>
        ))}
      </div>
    </div>
  )
}

function DonutChart(props: {
  entries: { model: string; quota: number }[]
  total: number
  centerLabel: string
}) {
  const C = 2 * Math.PI * 80
  const GAP = 7.8
  const n = props.entries.length
  const lens = props.entries.map((entry) =>
    props.total > 0 ? (entry.quota / props.total) * (C - GAP * n) : 0
  )
  const segments = props.entries.map((entry, index) => ({
    entry,
    color: DS_PALETTE.at(index) ?? DS_PALETTE[7],
    len: lens[index],
    offset: lens.slice(0, index).reduce((sum, len) => sum + len + GAP, 0),
  }))
  const cometFills = ['#a5f3fc', '#c7d2fe', '#ddd6fe']
  const cometGlows = [
    'rgba(34,211,238,0.95)',
    'rgba(129,140,248,0.9)',
    'rgba(167,139,250,0.9)',
  ]

  return (
    <div className='relative mt-4 shrink-0' style={{ width: 196, height: 196 }}>
      <svg
        width='196'
        height='196'
        viewBox='0 0 196 196'
        style={{
          transform: 'rotate(-90deg)',
          filter:
            'drop-shadow(0 0 20px rgba(56,189,248,0.16)) drop-shadow(0 0 46px rgba(99,102,241,0.12))',
        }}
        aria-hidden='true'
      >
        <circle
          cx='98'
          cy='98'
          r='92'
          fill='none'
          stroke='rgba(255,255,255,0.07)'
          strokeWidth='1'
        />
        <circle
          cx='98'
          cy='6'
          r='2'
          fill='#a5f3fc'
          opacity='0.9'
          style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.9))' }}
        />
        <circle
          cx='14.1'
          cy='143'
          r='1.6'
          fill='#c4b5fd'
          opacity='0.8'
          style={{ filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.8))' }}
        />
        <circle
          cx='98'
          cy='98'
          r='80'
          fill='none'
          stroke='rgba(255,255,255,0.055)'
          strokeWidth='13'
        />
        {props.total > 0 && (
          <g style={{ filter: 'blur(8px)' }} opacity='0.45'>
            {segments.slice(0, 7).map((seg) => (
              <circle
                key={`aurora-${seg.entry.model}`}
                cx='98'
                cy='98'
                r='80'
                fill='none'
                stroke={seg.color}
                strokeWidth='27'
                strokeLinecap='round'
                strokeDasharray={`${seg.len.toFixed(1)} 510`}
                strokeDashoffset={(-seg.offset).toFixed(1)}
              />
            ))}
          </g>
        )}
        {segments.map((seg, index) =>
          seg.len > 0 ? (
            <circle
              key={seg.entry.model}
              cx='98'
              cy='98'
              r='80'
              fill='none'
              stroke={seg.color}
              strokeWidth='13'
              strokeLinecap='round'
              strokeDasharray={`${seg.len.toFixed(1)} 510`}
              strokeDashoffset={(-seg.offset).toFixed(1)}
              filter={
                index < 3
                  ? `drop-shadow(0 0 7px ${DONUT_SEGMENT_GLOWS[index]})`
                  : undefined
              }
            />
          ) : null
        )}
        {props.total > 0 &&
          segments.slice(0, 3).map((seg, index) => {
            const theta = ((seg.offset + seg.len) / C) * Math.PI * 2
            return (
              <circle
                key={`comet-${seg.entry.model}`}
                cx={(98 + 80 * Math.sin(theta)).toFixed(1)}
                cy={(98 - 80 * Math.cos(theta)).toFixed(1)}
                r={index === 0 ? 2 : 1.7}
                fill={cometFills[index]}
                style={{ filter: `drop-shadow(0 0 5px ${cometGlows[index]})` }}
              />
            )
          })}
      </svg>
      <div
        className='pointer-events-none absolute inset-0 rounded-full'
        style={{
          background:
            'radial-gradient(circle, rgba(90,130,255,0.17) 0%, transparent 72%)',
        }}
      />
      <i
        aria-hidden='true'
        className='absolute rounded-full'
        style={{
          left: '36%',
          top: '28%',
          width: 1,
          height: 1,
          background: 'rgba(255,255,255,0.75)',
        }}
      />
      <i
        aria-hidden='true'
        className='absolute rounded-full'
        style={{
          left: '60%',
          top: '35%',
          width: 1.5,
          height: 1.5,
          background: 'rgba(255,255,255,0.5)',
        }}
      />
      <i
        aria-hidden='true'
        className='absolute rounded-full'
        style={{
          left: '42%',
          top: '64%',
          width: 1,
          height: 1,
          background: 'rgba(255,255,255,0.6)',
        }}
      />
      <i
        aria-hidden='true'
        className='absolute rounded-full'
        style={{
          left: '30%',
          top: '56%',
          width: 1,
          height: 1,
          background: 'rgba(255,255,255,0.4)',
        }}
      />
      <i
        aria-hidden='true'
        className='absolute rounded-full'
        style={{
          left: '56%',
          top: '26%',
          width: 1,
          height: 1,
          background: 'rgba(160,220,255,0.8)',
          boxShadow: '0 0 4px 1px rgba(120,200,255,0.5)',
        }}
      />
      <div className='absolute inset-0 flex flex-col items-center justify-center'>
        <div
          className='font-mono tabular-nums'
          style={{ fontSize: 30, fontWeight: 650, color: 'var(--ds-t1)' }}
        >
          {formatQuota(props.total)}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: 'var(--ds-t3)',
            letterSpacing: '0.06em',
          }}
        >
          {props.centerLabel}
        </div>
      </div>
    </div>
  )
}

export function CockpitInsights() {
  const { t } = useTranslation()
  const { range } = useQuota48h()

  // Trend window: the selected natural day, 00:00 → 24:00 (calendar above).
  const [trendDay, setTrendDay] = useState(() => {
    const day = new Date()
    day.setHours(0, 0, 0, 0)
    return day
  })
  const dayStartSec = useMemo(
    () => Math.floor(trendDay.getTime() / 1000),
    [trendDay]
  )

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

  // 24 hourly buckets over the selected day, aligned to clock hours.
  const quotaDay = useQuery({
    queryKey: ['cockpit', 'trend-day', dayStartSec],
    queryFn: async () => {
      const result = await getUserQuotaDates({
        start_timestamp: dayStartSec,
        end_timestamp: dayStartSec + 24 * 3600,
        default_time: 'hour',
      })
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 60 * 1000,
  })

  const trend = useMemo(() => {
    const startSec = dayStartSec
    const counts = bucketSeries(
      quotaDay.data ?? [],
      startSec,
      startSec + 24 * 3600,
      24,
      'count'
    )
    return { counts, startSec, peak: Math.max(0, ...counts) }
  }, [quotaDay.data, dayStartSec])

  // Fail-line calculator: real per-hour error counts, aggregated from the
  // user's own error logs (log type=5) over the same 24h window. Paged
  // fetch capped at 500 entries — a day of errors beyond that would swamp
  // the chart anyway.
  const errorTrend = useQuery({
    queryKey: ['cockpit', 'errors-day', dayStartSec],
    queryFn: async () => {
      const errors: { created_at?: number }[] = []
      const pageSize = 100
      for (let page = 1; page <= 5; page++) {
        const result = await getUserLogs({
          type: 5,
          start_timestamp: trend.startSec,
          end_timestamp: trend.startSec + 24 * 3600,
          p: page,
          page_size: pageSize,
        })
        if (!result.success) break
        const items = (result.data?.items ?? []) as { created_at?: number }[]
        errors.push(...items)
        const total = result.data?.total ?? 0
        if (items.length < pageSize || errors.length >= total) break
      }
      return errors
    },
    staleTime: 60 * 1000,
  })

  const errorCounts = useMemo(
    () =>
      bucketSeries(
        (errorTrend.data ?? []).map((item) => ({
          created_at: item.created_at ?? 0,
          count: 1,
        })),
        trend.startSec,
        trend.startSec + 24 * 3600,
        24,
        'count'
      ),
    [errorTrend.data, trend.startSec]
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
    return { entries, total }
  }, [todayModels.data, t])

  const panelStyle: CSSProperties = {
    border: '1px solid var(--ds-line)',
    borderRadius: 14,
    background: 'var(--ds-card)',
    backdropFilter: 'blur(16px)',
    boxShadow:
      '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.045)',
    padding: '22px 24px 18px',
  }

  return (
    <div className='grid grid-cols-1 gap-4 xl:h-[clamp(480px,calc(100vh-470px),640px)] xl:grid-cols-[minmax(0,1fr)_380px]'>
      <div className='flex min-h-0 flex-col' style={panelStyle}>
        <div className='flex flex-wrap items-baseline justify-between gap-3'>
          <div className='flex items-baseline gap-3'>
            <span
              style={{
                fontSize: 14.5,
                fontWeight: 600,
                color: 'var(--ds-t1)',
              }}
            >
              {t('Request trend')}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--ds-t3)' }}>
              {t('Selected day · hourly · peak ')}
              <span
                className='tabular-nums'
                style={{ color: '#a5f3fc', fontWeight: 600 }}
              >
                {formatNumber(trend.peak)}
              </span>
              {t(' req/h')}
            </span>
          </div>
          <div className='flex items-center gap-3'>
            <TrendDayPicker day={trendDay} onSelect={setTrendDay} />
            <div
              className='flex items-center gap-[14px]'
              style={{ fontSize: 11.5, color: 'var(--ds-t2)' }}
            >
              <span className='flex items-center'>
                <i
                  aria-hidden='true'
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    marginRight: 6,
                    background: 'var(--ds-accent)',
                    boxShadow: '0 0 6px rgba(34,211,238,0.6)',
                  }}
                />
                {t('Success')}
              </span>
              <span className='flex items-center'>
                <i
                  aria-hidden='true'
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    marginRight: 6,
                    background: 'rgba(255,255,255,0.28)',
                  }}
                />
                {t('Failed')}
              </span>
            </div>
          </div>
        </div>
        <TrendChart
          counts={trend.counts}
          errorCounts={errorCounts}
          startSec={trend.startSec}
        />
      </div>

      <div
        className='flex min-h-0 flex-col items-center overflow-hidden'
        style={panelStyle}
      >
        <div className='flex w-full flex-wrap items-baseline justify-between gap-3'>
          <span
            style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ds-t1)' }}
          >
            {t('Model usage share')}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--ds-t3)' }}>
            {t('Today · USD')}
          </span>
        </div>
        <DonutChart
          entries={donut.entries}
          total={donut.total}
          centerLabel={t("Today's usage")}
        />
        <div className='mt-[18px] flex w-full flex-col gap-[9px]'>
          {donut.entries.map((entry, index) => (
            <div
              key={entry.model}
              className='flex items-center gap-2'
              style={{ fontSize: 12, color: 'var(--ds-t2)' }}
            >
              <span
                className='shrink-0'
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: DS_PALETTE[index] ?? DS_PALETTE[7],
                }}
                aria-hidden='true'
              />
              <span className='min-w-0 truncate'>{entry.model}</span>
              <span
                className='ml-auto shrink-0 font-mono tabular-nums'
                style={{ color: 'var(--ds-t1)' }}
              >
                {formatQuota(entry.quota)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
