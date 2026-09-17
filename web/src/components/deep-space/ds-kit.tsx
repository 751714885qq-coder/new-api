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
// oxlint-disable react/only-export-components -- shared render primitives:
// constants, formulas and helpers alongside the DsDeltaLine/DsKpiCard
// components; fast refresh does not apply to this module.
import type { CSSProperties, ReactNode } from 'react'

/**
 * Deep Space page primitives shared by the cockpit overview and the wallet
 * screen: the render-verbatim KPI card, delta line, unit span and panel
 * recipe from the approved v6 renders. Values are the renders' literal
 * CSS; dark-surface tokens live in theme-presets.css (--ds-*).
 */

export const DS_PANEL_STYLE: CSSProperties = {
  border: '1px solid var(--ds-line)',
  borderRadius: 14,
  background: 'var(--ds-card)',
  backdropFilter: 'blur(16px)',
  boxShadow:
    '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.045)',
  padding: '22px 24px 18px',
}

/** Delta tone: green when favorable, amber for cost warnings, dim otherwise. */
function deltaColor(good: boolean, badTone: 'warning' | 'neutral'): string {
  if (good) return 'var(--ds-green)'
  return badTone === 'warning' ? 'var(--ds-amber)' : 'var(--ds-delta-bad)'
}

export function DsDeltaLine(props: {
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
      {props.delta < 0 ? '▼' : '▲'} {formatDsPercent(props.delta)}
    </span>
  )
}

/** KPI card, render-verbatim (v6-01-s1 .kpis / v6-钱包 .kpi card recipe). */
export function DsKpiCard(props: {
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

export function formatDsPercent(delta: number): string {
  return `${Math.abs(delta).toFixed(1)}%`
}

/** Catmull-Rom smoothing, matching the render's soft bezier curves. The
 * maxY clamp keeps the curve from overshooting below the axis baseline. */
export function smoothPath(
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

export function sparkPath(values: number[]): string {
  const n = values.length
  if (n < 2) return ''
  const max = Math.max(...values, 1)
  const points = values.map(
    (v, i) => [1 + (i * 70) / (n - 1), 24 - (v / max) * 20] as const
  )
  return smoothPath(points)
}

/** Splits a formatted quota string into its currency prefix and the number,
 * so the render's small unit + large number KPI typography is preserved. */
export function dsUnitSpan(text: string): ReactNode {
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

/** Quota sums for the given [start, end) timestamp window. */
export function sumQuotaBetween(
  data: {
    created_at: number | string
    quota?: number | string
    count?: number | string
  }[],
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

export function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

export function toStartOfLocalDay(offsetDays = 0): number {
  const day = new Date()
  day.setHours(0, 0, 0, 0)
  day.setDate(day.getDate() + offsetDays)
  return Math.floor(day.getTime() / 1000)
}
