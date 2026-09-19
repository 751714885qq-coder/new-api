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
import { Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { DS_PANEL_STYLE } from '@/components/deep-space/ds-kit'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeepSpace } from '@/hooks/use-deep-space'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface AffiliateRewardsCardProps {
  user: UserWalletData | null
  affiliateLink: string
  onTransfer: () => void
  complianceConfirmed?: boolean
  loading?: boolean
}

export function AffiliateRewardsCard({
  user,
  affiliateLink,
  onTransfer,
  complianceConfirmed = true,
  loading,
}: AffiliateRewardsCardProps) {
  const { t } = useTranslation()
  // Referral card frame is structural (draft 34 keeps it in light); the
  // invite box glass comes from --ds-glass per mode.
  const deepSpace = useDeepSpace()
  if (loading) {
    return (
      <Card data-card-hover='false' className='bg-muted/20 py-0'>
        <CardContent className='grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,0.72fr)_minmax(320px,1.15fr)] lg:items-center'>
          <div>
            <Skeleton className='h-5 w-32' />
            <Skeleton className='mt-2 h-4 w-48' />
          </div>
          <Skeleton className='h-14 rounded-lg' />
          <Skeleton className='h-10 rounded-lg' />
        </CardContent>
      </Card>
    )
  }

  const hasRewards = (user?.aff_quota ?? 0) > 0

  if (deepSpace) {
    // Render 10-渲染稿-v6-钱包.html lines 441-450: 推荐计划 action card with
    // the invite box; the transfer/stats functionality is kept below the
    // render's content as live data slots.
    return (
      <div
        className='flex items-center'
        style={{ ...DS_PANEL_STYLE, padding: '20px 22px' }}
      >
        <div className='min-w-0 flex-1'>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-t1)' }}>
            {t('Referral Program')}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--ds-t2)',
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            {t(
              'Earn rewards when users join through your referral link. Transfer accumulated rewards to your balance anytime.'
            )}
          </div>
          <div
            className='mt-2.5 flex max-w-full w-fit items-center gap-2'
            style={{
              height: 32,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid var(--ds-line)',
              background: 'var(--ds-glass)',
            }}
          >
            <span
              className='overflow-hidden text-[11.5px] whitespace-nowrap text-ellipsis'
              style={{ color: 'var(--ds-t2)' }}
            >
              {affiliateLink}
            </span>
            <CopyButton
              value={affiliateLink}
              variant='ghost'
              className='size-5 shrink-0'
              iconClassName='size-3'
              tooltip={t('Copy referral link')}
              aria-label={t('Copy referral link')}
            />
          </div>
          <div
            className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]'
            style={{ color: 'var(--ds-t3)' }}
          >
            <span>
              {t('Pending')}{' '}
              <span
                className='tabular-nums'
                style={{ color: 'var(--ds-t2)', fontWeight: 600 }}
              >
                {formatQuota(user?.aff_quota ?? 0)}
              </span>
            </span>
            <span>
              {t('Total Earned')}{' '}
              <span
                className='tabular-nums'
                style={{ color: 'var(--ds-t2)', fontWeight: 600 }}
              >
                {formatQuota(user?.aff_history_quota ?? 0)}
              </span>
            </span>
            <span>
              {t('Invites')}{' '}
              <span
                className='tabular-nums'
                style={{ color: 'var(--ds-t2)', fontWeight: 600 }}
              >
                {String(user?.aff_count ?? 0)}
              </span>
            </span>
            {hasRewards && (
              <Button
                onClick={onTransfer}
                disabled={!complianceConfirmed}
                size='sm'
                className='ds-btn-primary h-7 px-3'
              >
                {t('Transfer to Balance')}
              </Button>
            )}
          </div>
          {!complianceConfirmed && (
            <p
              className='mt-1.5 text-[11.5px]'
              style={{ color: 'var(--ds-t3)' }}
            >
              {t(
                'Referral reward transfer is disabled until the administrator confirms compliance terms.'
              )}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card data-card-hover='false' className='bg-muted/20 py-0'>
      <CardContent className='grid gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(200px,1fr)_minmax(180px,0.65fr)_minmax(280px,1fr)] lg:items-center'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <IconBadge tone='chart-3'>
            <Share2 />
          </IconBadge>
          <div className='min-w-0'>
            <h3 className='truncate text-sm font-semibold'>
              {t('Referral Program')}
            </h3>
            <p className='text-muted-foreground line-clamp-1 text-xs'>
              {t(
                'Earn rewards when users join through your referral link. Transfer accumulated rewards to your balance anytime.'
              )}
            </p>
          </div>
        </div>

        <div className='grid grid-cols-3 gap-1.5 text-center'>
          {[
            [t('Pending'), formatQuota(user?.aff_quota ?? 0)],
            [t('Total Earned'), formatQuota(user?.aff_history_quota ?? 0)],
            [t('Invites'), String(user?.aff_count ?? 0)],
          ].map(([label, value]) => (
            <div key={label}>
              <div className='text-muted-foreground truncate text-[10px] font-medium tracking-wider uppercase'>
                {label}
              </div>
              <div className='mt-0.5 truncate text-sm font-semibold tabular-nums'>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className='flex items-center gap-2'>
          <Input
            value={affiliateLink}
            readOnly
            className='border-muted bg-background/70 h-9 min-w-0 flex-1 font-mono text-xs'
          />
          <CopyButton
            value={affiliateLink}
            variant='outline'
            className='bg-background size-9 shrink-0'
            iconClassName='size-4'
            tooltip={t('Copy referral link')}
            aria-label={t('Copy referral link')}
          />
          {hasRewards && (
            <Button
              onClick={onTransfer}
              disabled={!complianceConfirmed}
              className='h-9 shrink-0 px-3'
              size='sm'
            >
              {t('Transfer to Balance')}
            </Button>
          )}
        </div>
        {!complianceConfirmed ? (
          <p className='text-muted-foreground text-xs lg:col-span-3'>
            {t(
              'Referral reward transfer is disabled until the administrator confirms compliance terms.'
            )}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
