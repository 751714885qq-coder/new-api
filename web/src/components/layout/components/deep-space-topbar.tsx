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
import { useLocation } from '@tanstack/react-router'
import { Search as SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { useSearch } from '@/context/search-provider'
import { useNotifications } from '@/hooks/use-notifications'
import { useSidebarView } from '@/hooks/use-sidebar-view'

/**
 * Deep Space console topbar (WO-019): ported 1:1 from the approved render
 * (09-渲染稿-v6-s1.html lines 138-150 + 260-268) — 56px bar with breadcrumb,
 * 230px glass search box (Ctrl K), bell and avatar. The functional slots
 * reuse the app's real search dialog, notification popover and profile
 * menu; only the chrome is render-styled.
 */
export function DeepSpaceTopbar() {
  const { t } = useTranslation()
  const { setOpen } = useSearch()
  const notifications = useNotifications()
  const { navGroups } = useSidebarView()
  const pathname = useLocation({ select: (location) => location.pathname })

  // Crumb title: the visible sidebar item matching the current route.
  const current = navGroups
    .flatMap((group) => group.items)
    .find(
      (item) =>
        item.url &&
        (pathname === item.url || pathname.startsWith(`${item.url}/`))
    )

  return (
    <header
      className='flex h-14 shrink-0 items-center gap-4 border-b'
      style={{ borderColor: 'var(--ds-line)', padding: '0 28px' }}
    >
      <div style={{ fontSize: 12.5, color: 'var(--ds-t3)' }}>
        {t('Console')}{' '}
        {current ? (
          <>
            {' / '}
            <b style={{ color: 'var(--ds-t2)', fontWeight: 500 }}>
              {current.title}
            </b>
          </>
        ) : null}
      </div>
      <button
        type='button'
        className='ds-topbar-search'
        onClick={() => setOpen(true)}
        aria-label={t('Search')}
      >
        <SearchIcon aria-hidden='true' />
        <span>{t('Search models, keys…')}</span>
        <span className='ds-topbar-kbd'>Ctrl K</span>
      </button>
      <NotificationPopover
        className='ds-topbar-bell'
        open={notifications.popoverOpen}
        onOpenChange={notifications.setPopoverOpen}
        unreadCount={notifications.unreadCount}
        activeTab={notifications.activeTab}
        onTabChange={notifications.setActiveTab}
        notice={notifications.notice}
        announcements={notifications.announcements}
        loading={notifications.loading}
      />
      <div className='ds-topbar-icon'>
        <LanguageSwitcher />
      </div>
      <div className='ds-topbar-icon'>
        <ConfigDrawer />
      </div>
      <div className='ds-topbar-avatar'>
        <ProfileDropdown />
      </div>
    </header>
  )
}
