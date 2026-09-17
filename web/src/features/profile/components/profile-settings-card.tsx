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
import { Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { DS_PANEL_STYLE } from '@/components/deep-space/ds-kit'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { useDeepSpaceDark } from '@/hooks/use-deep-space-dark'

import type { UserProfile } from '../types'
import { NotificationTab } from './tabs/notification-tab'

// ============================================================================
// Profile Settings Card Component
// ============================================================================

interface ProfileSettingsCardProps {
  profile: UserProfile | null
  loading: boolean
  onProfileUpdate: () => void
}

export function ProfileSettingsCard({
  profile,
  loading,
  onProfileUpdate,
}: ProfileSettingsCardProps) {
  const { t } = useTranslation()
  const deepSpaceDark = useDeepSpaceDark()

  if (loading) {
    return (
      <Card data-card-hover='false' className='gap-0 overflow-hidden py-0'>
        <CardHeader className='border-b p-3 !pb-3 sm:p-5 sm:!pb-5'>
          <Skeleton className='h-6 w-32' />
          <Skeleton className='mt-2 h-4 w-48' />
        </CardHeader>
        <CardContent className='space-y-4 p-3 sm:p-5'>
          {['notifications', 'threshold', 'preferences'].map((key) => (
            <Skeleton key={key} className='h-20 w-full' />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (deepSpaceDark) {
    // Render 12-渲染稿-v6-个人资料.html lines 461-514 verbatim: 设置 card
    // head; the notification / preference fields live in NotificationTab.
    return (
      <div className='flex flex-col' style={{ ...DS_PANEL_STYLE, padding: 0 }}>
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
              background: 'rgba(255,255,255,0.03)',
              color: '#7dd3fc',
            }}
          >
            <Settings className='h-4 w-4' />
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>
              {t('Settings')}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ds-t3)', marginTop: 2 }}>
              {t('Settings & Preferences')}
            </div>
          </div>
        </div>
        <div className='px-5 pb-4 pt-3.5'>
          <NotificationTab profile={profile} onUpdate={onProfileUpdate} />
        </div>
      </div>
    )
  }

  return (
    <TitledCard
      title={t('Settings')}
      description={t('Settings & Preferences')}
      icon={<Settings className='h-4 w-4' />}
      iconTone='info'
      disableHoverEffect
    >
      <NotificationTab profile={profile} onUpdate={onProfileUpdate} />
    </TitledCard>
  )
}
