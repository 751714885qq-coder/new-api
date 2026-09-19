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
import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { Lock, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DS_PANEL_STYLE } from '@/components/deep-space/ds-kit'
import { StatusBadge } from '@/components/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { useDeepSpace } from '@/hooks/use-deep-space'
import { useDeepSpaceDark } from '@/hooks/use-deep-space-dark'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'

import { getDisplayName, maskEmail } from '../lib'
import type { UserProfile } from '../types'

// ============================================================================
// Profile Basics Card Component (WO-019 rendering baseline: 基本信息 card)
// ============================================================================

interface ProfileBasicsCardProps {
  profile: UserProfile | null
  loading: boolean
  updating: boolean
  onUpdateProfile: (data: { display_name?: string }) => Promise<boolean>
}

export function ProfileBasicsCard({
  profile,
  loading,
  updating,
  onUpdateProfile,
}: ProfileBasicsCardProps) {
  const { t } = useTranslation()
  // Card frame and head chrome are structural (drafts 36/36b keep them in
  // light); the field glass, head icon tint and link accent carry dark
  // literals (drafts 36/36b: field bg rgba(255,255,255,0.60), icon #0e7490,
  // links #0e7490).
  const deepSpace = useDeepSpace()
  const deepSpaceDark = useDeepSpaceDark()
  // null = untouched, fall back to the profile value while typing.
  const [editedName, setEditedName] = useState<string | null>(null)

  if (loading || !profile) {
    return (
      <TitledCard
        title={t('Basic Information')}
        description={t('Manage your account identity')}
        icon={<UserRound className='h-4 w-4' />}
        iconTone='info'
        disableHoverEffect
      >
        <div className='flex gap-4'>
          <Skeleton className='h-20 w-20 rounded-full' />
          <div className='flex-1 space-y-3'>
            <Skeleton className='h-6 w-40' />
            <Skeleton className='h-4 w-52' />
            <Skeleton className='h-4 w-36' />
          </div>
        </div>
        <Skeleton className='mt-4 h-10 w-full' />
      </TitledCard>
    )
  }

  const avatarFallback = getUserAvatarFallback(profile.username)
  const avatarFallbackStyle = getUserAvatarStyle(profile.username)
  const registeredAt = profile.created_time
    ? new Date(profile.created_time * 1000).toLocaleDateString()
    : ''
  const currentName = getDisplayName(profile)
  const displayName = editedName ?? currentName
  const dirty = editedName !== null && editedName !== currentName

  if (deepSpace) {
    // Render 12-渲染稿-v6-个人资料.html lines 377-413 verbatim: 基本信息
    // card head (icon / title / sub) and body (identity row, display-name
    // field, locked username field, email-binding and registered-time rows).
    const finStyle = {
      height: 38,
      borderRadius: 9,
      border: '1px solid var(--ds-line)',
      background: deepSpaceDark
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(255,255,255,0.60)',
      color: 'var(--ds-t1)',
      fontSize: 13,
    } as const
    const fldLabel = (text: string) => (
      <div
        className='mb-[7px] flex items-center gap-1.5'
        style={{
          fontSize: 11,
          color: 'var(--ds-t3)',
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}
      >
        {text}
      </div>
    )
    return (
      <div
        className='flex flex-col'
        style={{ ...DS_PANEL_STYLE, padding: 0 }}
      >
        <div
          className='flex items-center gap-3 border-b px-5 py-3'
          style={{ borderColor: 'var(--ds-line)' }}
        >
          <div
            className='flex flex-none items-center justify-center'
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              border: '1px solid var(--ds-line)',
              background: deepSpaceDark
                ? 'rgba(255,255,255,0.03)'
                : 'var(--ds-glass)',
              color: deepSpaceDark ? '#7dd3fc' : '#0e7490',
            }}
          >
            <UserRound className='h-4 w-4' />
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>
              {t('Basic Information')}
            </div>
            <div
              style={{ fontSize: 11.5, color: 'var(--ds-t3)', marginTop: 2 }}
            >
              {t('Manage your account identity')}
            </div>
          </div>
        </div>
        <div className='px-5 pb-4 pt-3.5'>
        {/* 用户裁决 2026-09-18：hero 横幅已带头像与身份，卡内识别行重复，整行移除
            （角色信息移至 hero 标签行）；display-name 字段成为卡体首块。 */}
        <div className='mt-2.5'>
          {fldLabel(t('Display name'))}
          <div className='flex items-center gap-2.5'>
            <Input
              value={displayName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder={t('Display name')}
              className='min-w-0 flex-1'
              style={finStyle}
            />
            <Button
              onClick={() => onUpdateProfile({ display_name: displayName })}
              disabled={updating || !dirty}
              className='ds-btn-primary flex-none'
              style={{ height: 38, padding: '0 16px', fontSize: 12.5 }}
            >
              {t('Save')}
            </Button>
          </div>
        </div>
        <div className='mt-2.5'>
          {fldLabel(`${t('Username')} · ${t('Cannot be changed')}`)}
          <div
            className='flex items-center gap-2'
            style={{
              ...finStyle,
              color: 'var(--ds-t2)',
              padding: '0 12px',
            }}
          >
            <span className='min-w-0 flex-1 truncate'>@{profile.username}</span>
            <Lock className='h-3 w-3 flex-none' style={{ color: 'var(--ds-t3)' }} />
          </div>
        </div>
        <div
          className='mt-2.5 flex items-center justify-between'
        >
          <div
            className='flex items-center gap-2'
            style={{ fontSize: 12.5, color: 'var(--ds-t3)' }}
          >
            {t('Email Binding')}
          </div>
          <div className='flex items-center gap-2' style={{ fontSize: 12.5 }}>
            {profile.email ? (
              <>
                <span style={{ color: 'var(--ds-t1)' }}>
                  {maskEmail(profile.email)}
                </span>
                <Button
                  variant='ghost'
                  render={<Link to='/security' />}
                  className='h-auto p-0 text-[11.5px] font-normal'
                  style={{ color: deepSpaceDark ? '#7dd3fc' : '#0e7490' }}
                >
                  {t('Change')} →
                </Button>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--ds-amber)', fontSize: 11.5 }}>
                  {t('Not bound')}
                </span>
                <Button
                  variant='ghost'
                  render={<Link to='/security' />}
                  className='h-auto p-0 text-[11.5px] font-normal'
                  style={{ color: deepSpaceDark ? '#7dd3fc' : '#0e7490' }}
                >
                  {t('Bind now')} →
                </Button>
              </>
            )}
          </div>
        </div>
        <div className='mt-2.5 flex items-center justify-between'>
          <div
            className='flex items-center gap-2'
            style={{ fontSize: 12.5, color: 'var(--ds-t3)' }}
          >
            {t('Registered on')}
          </div>
          <div
            className='tabular-nums'
            style={{ fontSize: 12.5, color: 'var(--ds-t2)' }}
          >
            {profile.created_time
              ? dayjs(profile.created_time * 1000).format('YYYY-MM-DD HH:mm')
              : '--'}
          </div>
        </div>
        </div>
      </div>
    )
  }

  return (
    <TitledCard
      title={t('Basic Information')}
      description={t('Manage your account identity')}
      icon={<UserRound className='h-4 w-4' />}
      iconTone='info'
      disableHoverEffect
    >
      <div className='flex items-center gap-4'>
        <Avatar className='ring-primary/30 h-20 w-20 rounded-full text-xl ring-2'>
          <AvatarFallback
            className='rounded-full font-semibold text-white'
            style={avatarFallbackStyle}
          >
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1 space-y-1.5'>
          <div className='text-foreground truncate text-lg font-semibold'>
            {getDisplayName(profile)}
          </div>
          <div className='text-muted-foreground truncate text-sm'>
            @{profile.username}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <StatusBadge
              label={`${t('User ID')} ${profile.id}`}
              variant='info'
              copyText={String(profile.id)}
            />
            {registeredAt && (
              <StatusBadge
                label={`${t('Registered on')} ${registeredAt}`}
                variant='neutral'
                copyable={false}
              />
            )}
          </div>
        </div>
      </div>

      <div className='mt-4 flex flex-col gap-2 sm:flex-row'>
        <Input
          value={displayName}
          onChange={(e) => setEditedName(e.target.value)}
          placeholder={t('Display name')}
          className='flex-1'
        />
        <Button
          onClick={() => onUpdateProfile({ display_name: displayName })}
          disabled={updating || !dirty}
        >
          {t('Save')}
        </Button>
      </div>
    </TitledCard>
  )
}
