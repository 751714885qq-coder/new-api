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
import { BarChart3, Activity, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  DsDeltaLine,
  DsKpiCard,
  dsUnitSpan,
} from '@/components/deep-space/ds-kit'
import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeepSpace } from '@/hooks/use-deep-space'
import { formatNumber, formatQuota } from '@/lib/format'

import { useWalletUsage } from '../hooks/use-wallet-usage'
import type { UserWalletData } from '../types'

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const { t } = useTranslation()
  // Render 10 KPI row is structural (draft 34 keeps it in light).
  const deepSpace = useDeepSpace()
  const usage = useWalletUsage()

  if (props.loading) {
    return (
      <div className='grid grid-cols-3 divide-x rounded-lg border'>
        {['balance', 'usage', 'requests'].map((key) => (
          <div key={key} className='min-w-0 px-2.5 py-2.5 sm:px-5 sm:py-4'>
            <Skeleton className='h-3.5 w-full' />
            <Skeleton className='mt-2 h-6 w-full sm:h-7' />
            <Skeleton className='mt-1.5 hidden h-3.5 w-24 md:block' />
          </div>
        ))}
      </div>
    )
  }

  if (deepSpace) {
    // Render 10-渲染稿-v6-钱包.html lines 305-322: three KPI cards with the
    // render's label / value / delta rhythm; only the data slots are live.
    return (
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <DsKpiCard
          title={t('Wallet Balance')}
          value={dsUnitSpan(formatQuota(props.user?.quota ?? 0))}
          delta={
            <>
              <DsDeltaLine delta={null} upIsBad={false} badTone='neutral' />
              {t('vs last week')}
            </>
          }
        />
        <DsKpiCard
          title={t('Total Usage')}
          value={dsUnitSpan(formatQuota(props.user?.used_quota ?? 0))}
          delta={null}
          deltaChildren={
            <>
              {t('Month to date')}{' '}
              <span
                className='tabular-nums'
                style={{ color: 'var(--ds-t2)', fontWeight: 600 }}
              >
                {formatQuota(usage.monthToDate)}
              </span>{' '}
              · {t('Cumulative {{count}} requests', {
                count: formatNumber(props.user?.request_count ?? 0),
              })}
            </>
          }
        />
        <DsKpiCard
          title={t("Today's API Billing")}
          value={dsUnitSpan(formatQuota(usage.today))}
          spark={usage.last7}
          delta={
            <>
              <DsDeltaLine delta={usage.todayDelta} upIsBad badTone='warning' />
              {t('vs yesterday')}
            </>
          }
        />
      </div>
    )
  }

  const stats: {
    label: string
    value: string
    description: string
    icon: typeof WalletCards
    tone: IconBadgeTone
  }[] = [
    {
      label: t('Current Balance'),
      value: formatQuota(props.user?.quota ?? 0),
      description: t('Remaining quota'),
      icon: WalletCards,
      tone: 'success',
    },
    {
      label: t('Total Usage'),
      value: formatQuota(props.user?.used_quota ?? 0),
      description: t('Total consumed quota'),
      icon: BarChart3,
      tone: 'info',
    },
    {
      label: t('API Requests'),
      value: (props.user?.request_count ?? 0).toLocaleString(),
      description: t('Total requests made'),
      icon: Activity,
      tone: 'chart-4',
    },
  ]

  return (
    <div className='grid grid-cols-3 divide-x rounded-lg border'>
      {stats.map((item, index) => (
        <div
          key={item.label}
          data-wallet-stat={index === 0 ? 'balance' : undefined}
          className='min-w-0 px-2.5 py-2.5 sm:px-5 sm:py-4'
        >
          <div className='flex items-center gap-1.5 sm:gap-2.5'>
            <IconBadge tone={item.tone} size='stat'>
              <item.icon />
            </IconBadge>
            <div className='text-muted-foreground truncate text-[11px] font-medium tracking-wider uppercase sm:text-xs'>
              {item.label}
            </div>
          </div>

          <div className='text-foreground mt-1.5 font-mono text-sm font-bold tracking-tight break-all tabular-nums sm:mt-2.5 sm:text-2xl'>
            {item.value}
          </div>
          <div className='text-muted-foreground/60 mt-1 hidden text-xs md:block'>
            {item.description}
          </div>
        </div>
      ))}
    </div>
  )
}
