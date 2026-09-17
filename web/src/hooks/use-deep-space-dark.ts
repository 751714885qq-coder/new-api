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
import { useEffect, useState } from 'react'

import { useThemeCustomization } from '@/context/theme-customization-provider'

/**
 * True while the deep-space preset is active in dark mode. The S-series
 * console chrome (render-verbatim shell: topbar, sidebar brand, layout
 * frame) is gated on this, matching the DeepSpaceBackdrop gate.
 */
export function useDeepSpaceDark() {
  const { customization } = useThemeCustomization()
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  // Track the app's dark class so the chrome follows light/dark flips
  // without a remount.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return customization.preset === 'deep-space' && isDark
}
