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
import {
  KeyRound,
  Mail,
  MonitorSmartphone,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { TitledCard } from '@/components/ui/titled-card'

import type { UserProfile } from '../types'

// ============================================================================
// Profile Security Links Card (WO-019 rendering baseline: 安全设置 card)
// Entry rows mirror the rendering's list style; the actual flows live on the
// Security & Access page, so rows navigate there instead of duplicating them.
// ============================================================================

interface ProfileSecurityLinksCardProps {
  profile: UserProfile | null
}

export function ProfileSecurityLinksCard({
  profile,
}: ProfileSecurityLinksCardProps) {
  const { t } = useTranslation()

  const rows: {
    icon: LucideIcon
    tone: IconBadgeTone
    title: string
    description: string
  }[] = [
    {
      icon: KeyRound,
      tone: 'info',
      title: t('Change Password'),
      description: t('Update your password to keep your account secure'),
    },
    {
      icon: Mail,
      tone: 'success',
      title: t('Email Binding'),
      description: profile?.email ? profile.email : t('No email bound yet'),
    },
    {
      icon: ShieldCheck,
      tone: 'chart-4',
      title: t('Two-Step Verification'),
      description: t('Passkey and two-factor authentication'),
    },
    {
      icon: MonitorSmartphone,
      tone: 'warning',
      title: t('Login sessions'),
      description: t('View and sign out of your active devices'),
    },
  ]

  return (
    <TitledCard
      title={t('Safety Settings')}
      description={t('Manage security & access')}
      icon={<ShieldCheck className='h-4 w-4' />}
      iconTone='success'
      disableHoverEffect
    >
      <div className='divide-border/60 divide-y'>
        {rows.map((row) => {
          const Icon = row.icon
          return (
            <div key={row.title} className='flex items-center gap-3 py-3'>
              <IconBadge tone={row.tone} size='stat'>
                <Icon />
              </IconBadge>
              <div className='min-w-0 flex-1'>
                <div className='text-foreground truncate text-sm font-medium'>
                  {row.title}
                </div>
                <div className='text-muted-foreground truncate text-xs'>
                  {row.description}
                </div>
              </div>
              <Button
                variant='outline'
                size='sm'
                render={<Link to='/security' />}
              >
                {t('Manage')}
              </Button>
            </div>
          )
        })}
      </div>
    </TitledCard>
  )
}
