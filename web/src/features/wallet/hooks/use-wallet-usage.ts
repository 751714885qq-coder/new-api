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
import { useMemo } from 'react'

import { getUserQuotaDates } from '@/features/dashboard/api'
import type { QuotaDataItem } from '@/features/dashboard/types'
import {
  percentDelta,
  sumQuotaBetween,
  toStartOfLocalDay,
} from '@/components/deep-space/ds-kit'

// ============================================================================
// Wallet daily usage (deep-space KPI cards, render 10-渲染稿-v6-钱包.html):
// one month-to-date query feeding today / yesterday / last-7-days aggregates.
// ============================================================================

function startOfToday(offsetDays = 0): number {
  return toStartOfLocalDay(offsetDays)
}

export function useWalletUsage() {
  const start = useMemo(() => toStartOfLocalDay(new Date().getDate() - 1), [])
  const end = useMemo(() => toStartOfLocalDay(1), [])

  const query = useQuery({
    queryKey: ['wallet', 'usage-mtd', start],
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

  return useMemo(() => {
    const data = query.isLoading ? [] : (query.data ?? [])
    const todayStart = startOfToday()
    const yesterdayStart = startOfToday(-1)
    const today = sumQuotaBetween(data, todayStart, end).quota
    const yesterday = sumQuotaBetween(data, yesterdayStart, todayStart).quota
    const monthToDate = sumQuotaBetween(data, start, end).quota
    const last7: number[] = []
    for (let i = -6; i <= 0; i++) {
      const dayStart = startOfToday(i)
      last7.push(sumQuotaBetween(data, dayStart, dayStart + 24 * 3600).quota)
    }
    return {
      loading: query.isLoading,
      today,
      yesterday,
      todayDelta: percentDelta(today, yesterday),
      monthToDate,
      last7,
    }
  }, [query.data, query.isLoading, start, end])
}
