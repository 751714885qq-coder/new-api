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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { bindHomePageRuntime } from '../home-runtime'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

const getMock = vi.mocked(api.get)

function makeShadowRoot(): ShadowRoot {
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = [
    '<button id="mc-theme-toggle" data-runtime-only></button>',
    '<span data-field="stat-models"></span>',
    '<span data-field="user-balance" class="mc-bal-locked">--</span>',
    '<span data-field="user-usage"></span>',
    '<div data-field="recent-calls" class="mc-log-locked"></div>',
  ].join('')
  return root
}

function respond(_path: string, payload: unknown): unknown {
  return { data: payload }
}

beforeEach(() => {
  getMock.mockReset()
})

describe('bindHomePageRuntime', () => {
  it('lights the hidden theme toggle and forwards clicks to the callback', async () => {
    getMock.mockRejectedValue(new Error('offline'))
    const root = makeShadowRoot()
    const onToggle = vi.fn()

    const toggle = root.querySelector('#mc-theme-toggle') as HTMLElement
    expect(toggle.hasAttribute('data-runtime-only')).toBe(true)

    bindHomePageRuntime(root, onToggle, false)
    expect(toggle.hasAttribute('data-runtime-only')).toBe(false)

    toggle.click()
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('unbinds the theme toggle on cleanup', async () => {
    getMock.mockRejectedValue(new Error('offline'))
    const root = makeShadowRoot()
    const onToggle = vi.fn()

    const cleanup = bindHomePageRuntime(root, onToggle, false)
    cleanup()

    ;(root.querySelector('#mc-theme-toggle') as HTMLElement).click()
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('binds the enabled model count from the public pricing endpoint', async () => {
    getMock.mockImplementation(async (path: string) =>
      path === '/api/pricing'
        ? respond(path, {
            data: [{ enable: true }, { enable: false }, { enable: true }],
          })
        : respond(path, { data: null })
    )
    const root = makeShadowRoot()

    bindHomePageRuntime(root, vi.fn(), false)

    await vi.waitFor(() => {
      const el = root.querySelector('[data-field="stat-models"]')
      expect(el?.textContent).toBe('2')
    })
  })

  it('binds balance, usage and recent calls for an authenticated user', async () => {
    getMock.mockImplementation(async (path: string) => {
      if (path === '/api/user/self') {
        return respond(path, {
          data: { quota: 500000, used_quota: 250000, request_count: 12 },
        })
      }
      if (path === '/api/log/self?p=1&page_size=8') {
        return respond(path, {
          data: {
            items: [
              {
                type: 2,
                model_name: 'gpt-test',
                prompt_tokens: 9000,
                completion_tokens: 1000,
                created_at: 0,
              },
              { type: 3, model_name: 'o1', prompt_tokens: 1 },
            ],
          },
        })
      }
      return respond(path, { data: null })
    })
    const root = makeShadowRoot()

    bindHomePageRuntime(root, vi.fn(), true)

    await vi.waitFor(() => {
      const bal = root.querySelector('[data-field="user-balance"]')
      expect(bal?.classList.contains('mc-bal-locked')).toBe(false)
      expect(bal?.classList.contains('mc-bal')).toBe(true)
      expect(bal?.textContent).toBe('$1.00')

      const usage = root.querySelector('[data-field="user-usage"]')
      expect(usage?.querySelector('.mc-zh')?.textContent).toBe(
        '12 次 · $0.50'
      )
      expect(usage?.querySelector('.mc-en')?.textContent).toBe(
        '12 calls · $0.50'
      )

      const rows = root.querySelectorAll('[data-field="recent-calls"] .mc-log-row')
      expect(rows.length).toBe(2)
      expect(rows[0].querySelector('i')?.textContent).toBe('gpt-test')
      expect(rows[0].querySelector('b')?.textContent).toBe('✓')
      expect(rows[0].querySelector('span')?.textContent).toBe('10.0K tok')
      expect(rows[1].querySelector('b')?.textContent).toBe('✗')
      expect(rows[1].querySelector('b')?.getAttribute('style')).toContain(
        'rgb(255, 123, 114)'
      )
      expect(
        root
          .querySelector('[data-field="recent-calls"]')
          ?.classList.contains('mc-log-locked')
      ).toBe(false)
    })
  })

  it('skips account binding entirely for anonymous visitors', async () => {
    getMock.mockImplementation(async (path: string) =>
      path === '/api/pricing'
        ? respond(path, { data: [{ enable: true }] })
        : respond(path, { data: null })
    )
    const root = makeShadowRoot()

    bindHomePageRuntime(root, vi.fn(), false)
    await Promise.resolve()

    const paths = getMock.mock.calls.map((call) => call[0])
    expect(paths).not.toContain('/api/user/self')
    expect(paths).not.toContain('/api/log/self?p=1&page_size=8')
    const bal = root.querySelector('[data-field="user-balance"]')
    expect(bal?.classList.contains('mc-bal-locked')).toBe(true)
    expect(bal?.textContent).toBe('--')
  })
})
