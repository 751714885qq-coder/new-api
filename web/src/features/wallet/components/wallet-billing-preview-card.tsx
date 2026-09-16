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
import { History } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { formatQuota } from '@/lib/format'

import { useBillingHistory } from '../hooks/use-billing-history'
import { formatTimestamp, getStatusConfig } from '../lib/billing'

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
  const { records, loading } = useBillingHistory({ initialPageSize: 4 })

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
