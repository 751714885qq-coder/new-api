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
import { CreditCard, History } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { DS_PANEL_STYLE } from '@/components/deep-space/ds-kit'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { useDeepSpaceDark } from '@/hooks/use-deep-space-dark'
import { formatNumber, formatQuota } from '@/lib/format'

import { useBillingHistory } from '../hooks/use-billing-history'
import {
  formatTimestamp,
  getPaymentMethodName,
  getStatusConfig,
} from '../lib/billing'

// ============================================================================
// Wallet Billing Preview Card (WO-019 rendering baseline: 钱包充值记录 card)
// Surfaces the most recent topup records inline; the full history stays in
// the billing history dialog.
// ============================================================================

interface WalletBillingPreviewCardProps {
  onViewAll: () => void
}

export function WalletBillingPreviewCard(props: WalletBillingPreviewCardProps) {
  const { t } = useTranslation()
  const deepSpaceDark = useDeepSpaceDark()
  const { records, loading } = useBillingHistory({ initialPageSize: 4 })

  if (deepSpaceDark) {
    // Render 10-渲染稿-v6-钱包.html lines 387-430: 充值记录 panel with
    // icon / name / date rows, green amounts and status pill on the right.
    return (
      <div className='flex min-h-0 flex-col' style={DS_PANEL_STYLE}>
        <div className='flex flex-wrap items-baseline justify-between gap-3'>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ds-t1)' }}>
            {t('Topup Records')}
          </span>
          <button
            type='button'
            onClick={props.onViewAll}
            className='cursor-pointer text-[11.5px] hover:underline'
            style={{ color: '#7dd3fc' }}
          >
            {t('View All')}
          </button>
        </div>

        <div className='mt-2 flex min-h-0 flex-1 flex-col'>
          {loading && (
            <div className='space-y-2'>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className='h-10 w-full rounded-lg' />
              ))}
            </div>
          )}

          {!loading && records.length === 0 && (
            <div className='text-muted-foreground py-6 text-center text-sm'>
              {t('No topup records yet')}
            </div>
          )}

          {!loading && records.length > 0 && (
            <div>
              {records.map((record) => {
                const statusConfig = getStatusConfig(record.status)
                return (
                  <div
                    key={record.id}
                    className='flex items-center gap-3 py-[13px] [&:not(:last-child)]:border-b'
                    style={{ borderColor: 'var(--ds-line)' }}
                  >
                    <div
                      className='flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg'
                      style={{
                        border: '1px solid var(--ds-line)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'var(--ds-t2)',
                      }}
                    >
                      <CreditCard className='h-3.5 w-3.5' />
                    </div>
                    <div className='min-w-0'>
                      <div
                        className='truncate text-[13px] font-[550]'
                        style={{ color: 'var(--ds-t1)' }}
                      >
                        {getPaymentMethodName(record.payment_method, t)}
                      </div>
                      <div
                        className='mt-[3px] text-[11px]'
                        style={{ color: 'var(--ds-t3)' }}
                      >
                        {formatTimestamp(record.create_time)}
                      </div>
                    </div>
                    <div
                      className='ml-auto text-[13.5px] font-semibold tabular-nums'
                      style={{ color: 'var(--ds-green)' }}
                    >
                      +{formatNumber(record.money)}
                    </div>
                    <StatusBadge
                      label={statusConfig.label}
                      variant={statusConfig.variant}
                      showDot
                      copyable={false}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <TitledCard
      title={t('Topup Records')}
      description={t('Your recent topup orders')}
      icon={<History className='h-4 w-4' />}
      iconTone='success'
      disableHoverEffect
      action={
        <Button variant='ghost' size='sm' onClick={props.onViewAll}>
          {t('View All')}
        </Button>
      }
    >
      {loading && (
        <div className='space-y-2'>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className='h-10 w-full rounded-lg' />
          ))}
        </div>
      )}

      {!loading && records.length === 0 && (
        <div className='text-muted-foreground py-6 text-center text-sm'>
          {t('No topup records yet')}
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className='divide-border/60 divide-y'>
          {records.map((record) => {
            const statusConfig = getStatusConfig(record.status)
            return (
              <div key={record.id} className='flex items-center gap-3 py-2.5'>
                <div className='min-w-0 flex-1'>
                  <div className='text-foreground truncate font-mono text-sm'>
                    {formatQuota(record.amount)}
                  </div>
                  <div className='text-muted-foreground truncate text-xs'>
                    {formatTimestamp(record.create_time)}
                  </div>
                </div>
                <StatusBadge
                  label={statusConfig.label}
                  variant={statusConfig.variant}
                  showDot
                  copyable={false}
                />
              </div>
            )
          })}
        </div>
      )}
    </TitledCard>
  )
}
