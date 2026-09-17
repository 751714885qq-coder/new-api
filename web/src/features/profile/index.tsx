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
import { useTranslation } from 'react-i18next'

import { Main } from '@/components/layout'
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { useDeepSpaceDark } from '@/hooks/use-deep-space-dark'
import { useStatus } from '@/hooks/use-status'
import { useAuthStore } from '@/stores/auth-store'

import { CheckinCalendarCard } from './components/checkin-calendar-card'
import { LanguagePreferencesCard } from './components/language-preferences-card'
import { ProfileBasicsCard } from './components/profile-basics-card'
import { ProfileHeader } from './components/profile-header'
import { ProfileSecurityLinksCard } from './components/profile-security-links-card'
import { ProfileSettingsCard } from './components/profile-settings-card'
import { SidebarModulesCard } from './components/sidebar-modules-card'
import { useProfile } from './hooks'

export function Profile() {
  const { t } = useTranslation()
  const { profile, loading, updating, refreshProfile, updateProfile } =
    useProfile()
  const { status } = useStatus()
  const deepSpaceDark = useDeepSpaceDark()
  const permissions = useAuthStore((s) => s.auth.user?.permissions)

  const checkinEnabled = status?.checkin_enabled === true
  const turnstileEnabled = !!(
    status?.turnstile_check && status?.turnstile_site_key
  )
  const turnstileSiteKey = status?.turnstile_site_key || ''
  const canConfigureSidebar = permissions?.sidebar_settings !== false

  if (deepSpaceDark) {
    // Render 12-渲染稿-v6-个人资料.html: hero → user banner → identity /
    // security two-col → settings card; language / checkin / sidebar-module
    // cards are outside the render and stay below as the functional zone.
    return (
      <Main>
        <div className='min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4 sm:py-6'>
          <div className='mx-auto flex w-full max-w-7xl flex-col'>
            <div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 650,
                  letterSpacing: '-0.02em',
                  color: 'var(--ds-t1)',
                }}
              >
                {t('Profile')}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: 'var(--ds-t2)',
                  maxWidth: 660,
                }}
              >
                {t(
                  'Manage your account identity, security settings, and notification preferences — '
                )}
                <span style={{ color: 'var(--ds-t1)' }}>
                  {t('sensitive actions require security verification')}
                </span>
                {t(', changes take effect immediately.')}
              </div>
            </div>

            <div className='mt-4'>
              <ProfileHeader profile={profile} loading={loading} />
            </div>

            <div className='mt-3.5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_460px] xl:items-start'>
              <ProfileBasicsCard
                profile={profile}
                loading={loading}
                updating={updating}
                onUpdateProfile={updateProfile}
              />
              <ProfileSecurityLinksCard profile={profile} />
            </div>

            <div className='mt-3.5'>
              <ProfileSettingsCard
                profile={profile}
                loading={loading}
                onProfileUpdate={refreshProfile}
              />
            </div>

            <div className='mt-4 grid gap-4 xl:grid-cols-2 xl:items-start'>
              <LanguagePreferencesCard
                profile={profile}
                onProfileUpdate={refreshProfile}
              />
              <div className='space-y-4'>
                {checkinEnabled && (
                  <CheckinCalendarCard
                    checkinEnabled={checkinEnabled}
                    turnstileEnabled={turnstileEnabled}
                    turnstileSiteKey={turnstileSiteKey}
                  />
                )}
                {canConfigureSidebar && <SidebarModulesCard />}
              </div>
            </div>
          </div>
        </div>
      </Main>
    )
  }

  return (
    <Main>
      <div className='min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4 sm:py-6'>
        <CardStaggerContainer className='mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6'>
          <CardStaggerItem>
            <ProfileHeader profile={profile} loading={loading} />
          </CardStaggerItem>

          <CardStaggerItem>
            <div className='grid gap-4 sm:gap-5 xl:grid-cols-2 xl:items-start'>
              <ProfileBasicsCard
                profile={profile}
                loading={loading}
                updating={updating}
                onUpdateProfile={updateProfile}
              />
              <ProfileSecurityLinksCard profile={profile} />
            </div>
          </CardStaggerItem>

          <CardStaggerItem>
            <div className='grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.46fr)] xl:items-start'>
              <div className='space-y-4 sm:space-y-6'>
                <ProfileSettingsCard
                  profile={profile}
                  loading={loading}
                  onProfileUpdate={refreshProfile}
                />
                <LanguagePreferencesCard
                  profile={profile}
                  onProfileUpdate={refreshProfile}
                />
              </div>

              <div className='space-y-4 sm:space-y-6 xl:sticky xl:top-6'>
                {checkinEnabled && (
                  <CheckinCalendarCard
                    checkinEnabled={checkinEnabled}
                    turnstileEnabled={turnstileEnabled}
                    turnstileSiteKey={turnstileSiteKey}
                  />
                )}
                {canConfigureSidebar && <SidebarModulesCard />}
              </div>
            </div>
          </CardStaggerItem>
        </CardStaggerContainer>
      </div>
    </Main>
  )
}
