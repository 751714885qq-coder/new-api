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
import { useThemeCustomization } from '@/context/theme-customization-provider'

/**
 * True while the deep-space preset is active in either mode. The v6 light
 * renders (WO-019 light pass, drafts 32–42) share the dark chrome's
 * structure — the mode only swaps values, which live in CSS scoped by
 * `.dark` / `html:not(.dark)`. Gate structural deep-space chrome on this;
 * gate dark-specific inline values on {@link useDeepSpaceDark}.
 */
export function useDeepSpace() {
  const { customization } = useThemeCustomization()
  return customization.preset === 'deep-space'
}
