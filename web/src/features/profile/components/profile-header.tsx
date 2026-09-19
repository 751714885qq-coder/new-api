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
import dayjs from 'dayjs'
import { Activity, BarChart3, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { dsUnitSpan } from '@/components/deep-space/ds-kit'
import { StatusBadge } from '@/components/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeepSpace } from '@/hooks/use-deep-space'
import { useDeepSpaceDark } from '@/hooks/use-deep-space-dark'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import { formatCompactNumber, formatQuota } from '@/lib/format'
import { getRoleLabel } from '@/lib/roles'

import { getDisplayName } from '../lib'
import type { UserProfile } from '../types'

// ============================================================================
// Profile Header Component
// ============================================================================

interface ProfileHeaderProps {
  profile: UserProfile | null
  loading: boolean
}

export function ProfileHeader({ profile, loading }: ProfileHeaderProps) {
  const { t } = useTranslation()
  // Banner frame is structural (drafts 36/36b keep it in light); the tag
  // colors, id-chip glass and avatar ring carry dark literals (drafts 36/
  // 36b: teal group tag #0e7490, green bound tag #047857, amber warn tag
  // #b45309, light ring rgba(8,145,178,...)).
  const deepSpace = useDeepSpace()
  const deepSpaceDark = useDeepSpaceDark()

  if (loading) {
    return (
      <Card data-card-hover='false' className='gap-0 overflow-hidden py-0'>
        <CardContent className='p-4 sm:p-5'>
          <div className='flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left'>
            <Skeleton className='h-16 w-16 rounded-2xl' />
            <div className='space-y-3'>
              <div className='flex flex-col items-center gap-2 sm:flex-row sm:justify-start'>
                <Skeleton className='h-8 w-48' />
                <Skeleton className='h-5 w-16' />
              </div>
              <div className='flex flex-col items-center gap-1 sm:flex-row sm:justify-start sm:gap-4'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-4 w-40' />
                <Skeleton className='h-4 w-20' />
              </div>
            </div>
          </div>
        </CardContent>
        <div className='border-t'>
          <div className='divide-border/60 grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0'>
            {['balance', 'usage', 'requests'].map((key) => (
              <div key={key} className='px-4 py-3.5 sm:px-5 sm:py-4'>
                <Skeleton className='h-3.5 w-20' />
                <Skeleton className='mt-2 h-7 w-28' />
                <Skeleton className='mt-1.5 h-3.5 w-24' />
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (!profile) return null

  const displayName = getDisplayName(profile)
  const avatarName = profile.username || displayName
  const avatarFallback = getUserAvatarFallback(avatarName)
  const avatarFallbackStyle = getUserAvatarStyle(avatarName)
  const roleLabel = getRoleLabel(profile.role)
  if (deepSpace) {
    // Render 12-渲染稿-v6-个人资料.html lines 346-373 verbatim: user banner
    // with avatar, name + group / email-bound tags, meta row (username,
    // copyable user-id chip, registered date) and three live stat columns.
    const tagBaseStyle = {
      fontSize: 10.5,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 6,
      flex: 'none',
    } as const
    return (
      <div
        className='flex items-center gap-[18px]'
        style={{
          border: '1px solid var(--ds-line)',
          borderRadius: 14,
          background: 'var(--ds-card)',
          backdropFilter: 'blur(16px)',
          boxShadow: 'var(--ds-panel-shadow)',
          padding: '14px 22px',
        }}
      >
        <div
          className='flex flex-none items-center justify-center'
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: '1px solid var(--ds-line-strong)',
            fontSize: 23,
            fontWeight: 600,
            color: deepSpaceDark ? '#cdefff' : '#0c4a6e',
            boxShadow: deepSpaceDark
              ? '0 0 0 3px rgba(34,211,238,0.08), 0 6px 22px -6px rgba(56,189,248,0.35)'
              : '0 0 0 3px rgba(8,145,178,0.08), 0 6px 22px -6px rgba(8,145,178,0.35)',
          }}
        >
          <Avatar className='h-full w-full rounded-full'>
            <AvatarFallback
              className='rounded-full font-semibold'
              style={avatarFallbackStyle}
            >
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className='min-w-0'>
          <div
            className='flex flex-wrap items-center gap-2.5'
            style={{ fontSize: 20, fontWeight: 650 }}
          >
            <span>{displayName}</span>
            <span
              style={{
                ...tagBaseStyle,
                color: 'var(--ds-t2)',
                background: deepSpaceDark
                  ? 'rgba(255,255,255,0.03)'
                  : 'var(--ds-glass)',
                border: '1px solid var(--ds-line)',
              }}
            >
              {roleLabel}
            </span>
            {profile.group && (
              <span
                style={{
                  ...tagBaseStyle,
                  color: deepSpaceDark ? '#a5f3fc' : '#0e7490',
                  background: deepSpaceDark
                    ? 'rgba(34,211,238,0.08)'
                    : 'rgba(8,145,178,0.08)',
                  border: deepSpaceDark
                    ? '1px solid rgba(34,211,238,0.30)'
                    : '1px solid rgba(8,145,178,0.30)',
                }}
              >
                {t('Group {{name}}', { name: profile.group })}
              </span>
            )}
            {profile.email ? (
              <span
                style={{
                  ...tagBaseStyle,
                  color: deepSpaceDark ? '#6ee7b7' : '#047857',
                  background: deepSpaceDark
                    ? 'rgba(52,211,153,0.08)'
                    : 'rgba(5,150,105,0.08)',
                  border: deepSpaceDark
                    ? '1px solid rgba(52,211,153,0.30)'
                    : '1px solid rgba(5,150,105,0.30)',
                }}
              >
                {t('Email bound')}
              </span>
            ) : (
              <span
                style={{
                  ...tagBaseStyle,
                  color: deepSpaceDark ? '#fcd34d' : '#b45309',
                  background: deepSpaceDark
                    ? 'rgba(251,191,36,0.08)'
                    : 'rgba(217,119,6,0.08)',
                  border: deepSpaceDark
                    ? '1px solid rgba(251,191,36,0.30)'
                    : '1px solid rgba(217,119,6,0.30)',
                }}
              >
                {t('Email not bound')}
              </span>
            )}
          </div>
          <div
            className='mt-2 flex flex-wrap items-center gap-2.5'
            style={{ fontSize: 12.5, color: 'var(--ds-t3)' }}
          >
            <span>@{profile.username}</span>
            <span
              className='rounded-full'
              style={{
                width: 3,
                height: 3,
                background: 'var(--ds-t3)',
                opacity: 0.6,
              }}
            />
            <span
              className='inline-flex items-center gap-1.5'
              style={{
                height: 22,
                padding: '0 9px',
                border: '1px solid var(--ds-line)',
                borderRadius: 6,
                background: deepSpaceDark
                  ? 'rgba(255,255,255,0.03)'
                  : 'var(--ds-glass)',
                fontSize: 11,
              }}
            >
              {t('User ID')} {profile.id}
              <CopyButton
                value={String(profile.id)}
                variant='ghost'
                className='h-4 w-4'
                iconClassName={
                  deepSpaceDark ? 'size-3 text-[#7dd3fc]' : 'size-3 text-[#0e7490]'
                }
                aria-label={t('Copy to clipboard')}
              />
            </span>
            <span
              className='rounded-full'
              style={{
                width: 3,
                height: 3,
                background: 'var(--ds-t3)',
                opacity: 0.6,
              }}
            />
            <span>
              {t('Registered on')}{' '}
              {profile.created_time
                ? dayjs(profile.created_time * 1000).format('YYYY-MM-DD')
                : '--'}
            </span>
          </div>
        </div>
        <div className='ml-auto hidden lg:flex'>
          {[
            {
              label: t('Current Balance'),
              desc: t('Remaining quota'),
              icon: WalletCards,
              value: formatQuota(profile.quota),
            },
            {
              label: t('Total Usage'),
              desc: t('Total consumed quota'),
              icon: BarChart3,
              value: formatQuota(profile.used_quota),
            },
            {
              label: t('API Requests'),
              desc: t('Total requests made'),
              icon: Activity,
              value: profile.request_count.toLocaleString(),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className='[&:not(:first-child)]:border-l'
              style={{ padding: '2px 26px', borderColor: 'var(--ds-line)' }}
            >
              <div
                className='flex items-center gap-1.5'
                style={{ fontSize: 11, color: 'var(--ds-t3)', height: 15 }}
              >
                <stat.icon
                  className='h-3 w-3 flex-none'
                  style={{ color: 'var(--ds-accent)', opacity: 0.85 }}
                />
                {stat.label}
              </div>
              <div
                className='tracking-[-0.01em] tabular-nums'
                style={{
                  marginTop: 5,
                  fontSize: 20,
                  fontWeight: 650,
                  lineHeight: 1.15,
                }}
              >
                {dsUnitSpan(stat.value)}
              </div>
              <div
                style={{ marginTop: 5, fontSize: 10.5, color: 'var(--ds-t3)' }}
              >
                {stat.desc}
              </div>
            </div>
          ))}
        </div>
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
      value: formatQuota(profile.quota),
      description: t('Remaining quota'),
      icon: WalletCards,
      tone: 'success',
    },
    {
      label: t('Total Usage'),
      value: formatQuota(profile.used_quota),
      description: t('Total consumed quota'),
      icon: BarChart3,
      tone: 'info',
    },
    {
      label: t('API Requests'),
      value: formatCompactNumber(profile.request_count),
      description: t('Total requests made'),
      icon: Activity,
      tone: 'chart-4',
    },
  ]

  return (
    <Card data-card-hover='false' className='gap-0 overflow-hidden py-0'>
      <CardContent className='p-3 sm:p-5'>
        <div className='flex items-center gap-3 text-left sm:gap-4'>
          <Avatar className='ring-background h-12 w-12 rounded-xl text-sm ring-2 sm:h-16 sm:w-16 sm:rounded-2xl sm:text-lg sm:ring-4'>
            <AvatarFallback
              className='rounded-xl font-semibold text-white sm:rounded-2xl'
              style={avatarFallbackStyle}
            >
              {avatarFallback}
            </AvatarFallback>
          </Avatar>

          <div className='min-w-0 flex-1 space-y-1.5 sm:space-y-3'>
            <div className='flex min-w-0 items-center gap-2'>
              <h1 className='truncate text-xl font-semibold tracking-tight sm:text-2xl'>
                {displayName}
              </h1>
              <StatusBadge
                label={roleLabel}
                variant='neutral'
                copyable={false}
              />
              <StatusBadge
                label={`${t('User ID')} ${profile.id}`}
                variant='info'
                copyText={String(profile.id)}
              />
            </div>

            <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:gap-x-4 sm:text-sm'>
              <span className='truncate'>@{profile.username}</span>
              {profile.email && (
                <>
                  <span>•</span>
                  <span className='truncate'>{profile.email}</span>
                </>
              )}
              {profile.group && (
                <>
                  <span>•</span>
                  <span className='truncate'>{profile.group}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <div className='border-t'>
        <div className='divide-border/60 grid grid-cols-3 divide-x'>
          {stats.map((item) => (
            <div key={item.label} className='min-w-0 px-3 py-3 sm:px-5 sm:py-4'>
              <div className='flex items-center gap-2'>
                <IconBadge tone={item.tone} size='stat'>
                  <item.icon />
                </IconBadge>
                <div className='text-muted-foreground truncate text-xs font-medium tracking-wider uppercase'>
                  {item.label}
                </div>
              </div>

              <div className='text-foreground mt-1.5 truncate font-mono text-lg font-bold tracking-tight tabular-nums sm:mt-2 sm:text-2xl'>
                {item.value}
              </div>
              <div className='text-muted-foreground/60 mt-1 hidden text-xs md:block'>
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
