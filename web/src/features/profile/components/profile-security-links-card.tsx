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

import { DS_PANEL_STYLE } from '@/components/deep-space/ds-kit'
import { Button } from '@/components/ui/button'
import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { TitledCard } from '@/components/ui/titled-card'
import { useDeepSpaceDark } from '@/hooks/use-deep-space-dark'

import { maskEmail } from '../lib'
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
  const deepSpaceDark = useDeepSpaceDark()

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

  if (deepSpaceDark) {
    // Render 12-渲染稿-v6-个人资料.html lines 415-457 verbatim: 安全设置
    // card head (green shield) and four entry rows with ghost manage buttons
    // linking to the Security & Access page.
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
              color: '#a7f3d0',
            }}
          >
            <ShieldCheck className='h-4 w-4' />
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>
              {t('Safety Settings')}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ds-t3)', marginTop: 2 }}>
              {t('Manage security & access')}
            </div>
          </div>
        </div>
        <div className='px-5 pb-2 pt-1.5'>
          {rows.map((row) => {
            const Icon = row.icon
            return (
              <div
                key={row.title}
                className='flex items-center gap-3.5 py-2.5 [&:not(:last-child)]:border-b'
                style={{ borderColor: 'var(--ds-line)' }}
              >
                <div
                  className='flex flex-none items-center justify-center rounded-[9px]'
                  style={{
                    width: 32,
                    height: 32,
                    border: '1px solid var(--ds-line)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--ds-t2)',
                  }}
                >
                  <Icon className='h-3.5 w-3.5' />
                </div>
                <div className='min-w-0'>
                  <div
                    className='truncate font-[550]'
                    style={{ fontSize: 13, color: 'var(--ds-t1)' }}
                  >
                    {row.title}
                  </div>
                  <div
                    className='mt-[3px] truncate'
                    style={{ fontSize: 11, color: 'var(--ds-t3)' }}
                  >
                    {row.icon === Mail && profile?.email
                      ? t(
                          'Bound to {{email}}, can be used for login and account recovery',
                          { email: maskEmail(profile.email) }
                        )
                      : row.description}
                  </div>
                </div>
                <Button
                  variant='outline'
                  render={<Link to='/security' />}
                  className='ds-btn-ghost2 ml-auto flex-none'
                >
                  {t('Manage')}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

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
