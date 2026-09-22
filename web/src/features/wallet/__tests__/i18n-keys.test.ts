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
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const walletDir = join(here, '..')

const zh = JSON.parse(
  readFileSync(join(walletDir, '../../i18n/locales/zh.json'), 'utf-8')
)

function extractTLiteralKeys(source: string): string[] {
  const keys: string[] = []
  const pattern = /[^a-zA-Z]t\(\s*'((?:[^'\\]|\\.)*)'/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    keys.push(match[1])
  }
  return keys
}

describe('recharge drawer i18n keys', () => {
  it('resolves every drawer and affiliate card t() key inside the zh translation namespace', () => {
    const sources = [
      'components/recharge-drawer.tsx',
      'components/affiliate-rewards-card.tsx',
    ]
      .map((relative) => readFileSync(join(walletDir, relative), 'utf-8'))

    const keys = [
      ...new Set(sources.flatMap((source) => extractTLiteralKeys(source))),
    ].filter((key) => key.length > 3 && key.includes(' '))
    expect(keys.length).toBeGreaterThan(0)

    const missing = keys.filter((key) => !(key in zh.translation))
    expect(missing).toEqual([])
  })

  it('keeps the zh locale free of root-level stray keys', () => {
    // i18next only reads resources.<lang>.translation; keys appended at the
    // JSON root are invisible at runtime and silently fall back to English.
    const strays = Object.keys(zh).filter(
      (key) => typeof zh[key] !== 'object' || zh[key] === null
    )
    expect(strays).toEqual([])
  })
})
