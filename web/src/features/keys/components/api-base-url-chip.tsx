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
import { Copy, Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { useChatPresets } from '@/features/chat/hooks/use-chat-presets'

/**
 * Copyable API base URL chip shown at the front of the keys toolbar.
 * High-contrast primary tint so the endpoint reads at a glance (user
 * ruling 2026-09-20: the muted first version was too easy to miss).
 */
export function ApiBaseUrlChip() {
  const { t } = useTranslation()
  const { serverAddress } = useChatPresets()
  const baseUrl = `${serverAddress.replace(/\/+$/, '')}/v1`

  const handleCopy = async () => {
    const ok = await copyToClipboard(baseUrl)
    if (ok) toast.success(t('Copied'))
  }

  return (
    <button
      type='button'
      onClick={handleCopy}
      aria-label={t('Copy API base URL')}
      title={t('Copy API base URL')}
      className='text-primary hover:bg-primary/20 hidden items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium transition-colors sm:flex'
    >
      <Link2 className='size-3.5 shrink-0' />
      <span className='max-w-56 truncate font-mono lg:max-w-72'>{baseUrl}</span>
      <Copy className='size-3.5 shrink-0' />
    </button>
  )
}
