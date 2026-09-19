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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { Profile } from '../index'

vi.mock('@/hooks/use-deep-space', () => ({
  useDeepSpace: () => true,
}))

vi.mock('@/hooks/use-deep-space-dark', () => ({
  useDeepSpaceDark: () => true,
}))

vi.mock('../hooks', () => ({
  useProfile: () => ({
    profile: null,
    loading: true,
    updating: false,
    refreshProfile: vi.fn(),
    updateProfile: vi.fn().mockResolvedValue(true),
  }),
}))

// 用户裁决 2026-09-18（WO-019）：独占一行的卡片须撑满整行 —— 右列（签到/
// 侧栏模块）为空时语言偏好卡不再锁在半宽网格列里。
async function renderProfile(
  status: Record<string, unknown>,
  canConfigure: boolean
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(['status'], status)
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'alice',
    role: 1,
    permissions: { sidebar_settings: canConfigure },
    sidebar_modules: '',
  })
  const root = createRootRoute()
  const profileRoute = createRoute({
    getParentRoute: () => root,
    path: '/profile',
    component: Profile,
  })
  const router = createRouter({
    routeTree: root.addChildren([profileRoute]),
    history: createMemoryHistory({ initialEntries: ['/profile'] }),
  })
  await router.load()
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  useAuthStore.getState().auth.reset()
})

function languageCard() {
  const heading = screen.getByText('Language Preferences')
  return heading.closest('div[data-slot="card"]') as HTMLElement
}

describe('profile deep-space layout', () => {
  it('renders the language card full-width when checkin and sidebar cards are absent', async () => {
    await renderProfile({ checkin_enabled: false }, false)
    expect(languageCard()).not.toBeNull()
    expect(
      languageCard().closest('[class*="xl:grid-cols-2"]')
    ).toBeNull()
  })

  it('keeps the two-column grid when the checkin card occupies the right column', async () => {
    await renderProfile({ checkin_enabled: true }, false)
    expect(languageCard()).not.toBeNull()
    expect(
      languageCard().closest('[class*="xl:grid-cols-2"]')
    ).not.toBeNull()
  })
})
