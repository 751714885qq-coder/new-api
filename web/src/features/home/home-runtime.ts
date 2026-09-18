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
import { api } from '@/lib/api'

/**
 * WO-011 handover runtime (target 2/3): binds the landing page fragment's
 * inert `[data-field]` hooks to live data and lights the hidden
 * `#mc-theme-toggle` control. Ported verbatim from the bench-approved
 * `evidence/WO-011-exec/runtime.js` (20/20 assertions); the srcdoc iframe
 * carrier was sealed by rc.36's sanitizer, so the runtime now runs from the
 * app itself against the open shadow root.
 *
 * Degradation discipline (unchanged): any failure exits silently and the
 * WO-008 placeholder state stays untouched.
 */

/** Money rendering: quotaPerUnit default 500000 = $1 (bench-verified against
 * the rc.36 console rendering; keep literal to the approved runtime). */
function money(quota: number | undefined): string {
  const v = (quota || 0) / 500000
  return '$' + (v >= 0.01 ? v.toFixed(2) : v.toFixed(4))
}

function tok(n: number | undefined): string {
  n = n || 0
  return n >= 10000 ? (n / 1000).toFixed(1) + 'K' : String(n)
}

function pad(x: number): string {
  return (x < 10 ? '0' : '') + x
}

function when(ts: number | undefined): string {
  const d = new Date((ts || 0) * 1000)
  return (
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  )
}

interface SelfUser {
  quota?: number
  used_quota?: number
  request_count?: number
}

interface SelfLogEntry {
  type?: number
  model_name?: string
  prompt_tokens?: number
  completion_tokens?: number
  created_at?: number
}

async function getJson(path: string): Promise<any> {
  const res = await api.get(path, { skipErrorHandler: true })
  return res.data
}

/** ① Site stat: usable model count from the public pricing endpoint. */
async function bindStatModels(root: ShadowRoot): Promise<void> {
  const payload = await getJson('/api/pricing').catch(() => null)
  const arr = payload && payload.data
  if (!Array.isArray(arr)) return
  const n = arr.filter(
    (m: { enable?: boolean }) => m && m.enable !== false
  ).length
  const el = root.querySelector('[data-field="stat-models"]')
  if (el && n > 0) el.textContent = String(n)
}

/** ② Authenticated account data: balance, usage, recent log rows. Skipped
 * entirely for anonymous visitors so no refresh chain is triggered. */
async function bindUserRuntime(
  root: ShadowRoot,
  authenticated: boolean
): Promise<void> {
  if (!authenticated) return
  const payload = await getJson('/api/user/self').catch(() => null)
  const u: SelfUser | undefined = payload && payload.data
  if (!u) return

  const bal = root.querySelector('[data-field="user-balance"]')
  if (bal && typeof u.quota === 'number') {
    bal.classList.remove('mc-bal-locked')
    bal.classList.add('mc-bal')
    bal.textContent = money(u.quota)
  }

  const us = root.querySelector('[data-field="user-usage"]')
  if (us) {
    const cnt = (u.request_count || 0).toLocaleString('en-US')
    const zh = document.createElement('span')
    zh.className = 'mc-zh'
    zh.textContent = cnt + ' 次 · ' + money(u.used_quota)
    const en = document.createElement('span')
    en.className = 'mc-en'
    en.textContent = cnt + ' calls · ' + money(u.used_quota)
    us.textContent = ''
    us.appendChild(zh)
    us.appendChild(en)
  }

  const logPayload = await getJson('/api/log/self?p=1&page_size=8').catch(
    () => null
  )
  const d = logPayload && logPayload.data
  const items = d && d.items !== undefined ? d.items : d
  if (!Array.isArray(items)) return
  const box = root.querySelector('[data-field="recent-calls"]')
  if (!box) return
  box.classList.remove('mc-log-locked')
  box.textContent = ''
  items.forEach(function (it: SelfLogEntry) {
    const row = document.createElement('div')
    row.className = 'mc-log-row'
    const m = document.createElement('i')
    m.textContent = it.model_name || '-'
    const s = document.createElement('b')
    const ok = it.type === 2 /* rc.36: type=2 = billed success; others red */
    s.textContent = ok ? '✓' : '✗'
    if (!ok) s.style.color = '#ff7b72'
    const t = document.createElement('span')
    t.textContent =
      tok((it.prompt_tokens || 0) + (it.completion_tokens || 0)) + ' tok'
    const e = document.createElement('em')
    e.textContent = when(it.created_at)
    row.appendChild(m)
    row.appendChild(s)
    row.appendChild(t)
    row.appendChild(e)
    box.appendChild(row)
  })
}

/**
 * Bind the fragment inside an open shadow root. Returns a cleanup that
 * unbinds the theme toggle listener.
 */
export function bindHomePageRuntime(
  root: ShadowRoot,
  onThemeToggle: () => void,
  authenticated: boolean
): () => void {
  const toggle = root.querySelector('#mc-theme-toggle')

  if (toggle) {
    /* ③ Light the hidden control: the theme provider always exists in the
     * app, so unlike the iframe relay there is no native-button probe. */
    toggle.removeAttribute('data-runtime-only')
    toggle.addEventListener('click', onThemeToggle)
  }

  bindStatModels(root).catch(function () {})
  bindUserRuntime(root, authenticated).catch(function () {})

  return function () {
    toggle?.removeEventListener('click', onThemeToggle)
  }
}
