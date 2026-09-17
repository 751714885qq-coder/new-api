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
import { AnimatedOutlet } from '@/components/page-transition'
import { SkipToMain } from '@/components/skip-to-main'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { useDeepSpaceDark } from '@/hooks/use-deep-space-dark'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'

import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'
import { DeepSpaceBackdrop } from './deep-space-backdrop'
import { DeepSpaceTopbar } from './deep-space-topbar'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout(props: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  const deepSpaceDark = useDeepSpaceDark()

  // Deep Space (dark): the approved render's frame — full-height sidebar on
  // the left, main column with the 56px breadcrumb topbar on top. Any other
  // theme keeps the stock shell (top bar spanning both columns).
  const inset = (
    <SidebarInset
      className={cn(
        '@container/content',
        deepSpaceDark
          ? 'min-h-0 flex-1 overflow-hidden'
          : 'h-[calc(100svh-var(--app-header-height,0px))]',
        !deepSpaceDark && 'min-h-0 overflow-hidden',
        !deepSpaceDark &&
          'peer-data-[variant=inset]:h-[calc(100svh-var(--app-header-height,0px)-(var(--spacing)*4))]'
      )}
    >
      {props.children ?? <AnimatedOutlet />}
    </SidebarInset>
  )

  return (
    <LayoutProvider>
      <SearchProvider>
        <SidebarProvider
          defaultOpen={defaultOpen}
          className={deepSpaceDark ? 'h-svh flex-row' : 'flex-col'}
        >
          <DeepSpaceBackdrop />
          <SkipToMain />
          {deepSpaceDark ? (
            <>
              <AppSidebar />
              <div className='flex h-svh min-w-0 flex-1 flex-col'>
                <DeepSpaceTopbar />
                {inset}
              </div>
            </>
          ) : (
            <>
              <AppHeader />
              <div className='flex min-h-0 w-full flex-1'>
                <AppSidebar />
                {inset}
              </div>
            </>
          )}
        </SidebarProvider>
      </SearchProvider>
    </LayoutProvider>
  )
}
