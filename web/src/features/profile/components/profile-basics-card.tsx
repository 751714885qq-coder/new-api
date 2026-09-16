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
import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'

import { getDisplayName } from '../lib'
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
