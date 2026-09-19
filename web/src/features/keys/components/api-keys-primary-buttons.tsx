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
import { Copy, Link2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/copy-to-clipboard'

import { useApiKeys } from './api-keys-provider'
import { useChatPresets } from '@/features/chat/hooks/use-chat-presets'

export function ApiKeysPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen } = useApiKeys()
  const { serverAddress } = useChatPresets()
  const baseUrl = `${serverAddress.replace(/\/+$/, '')}/v1`

  const handleCopyBaseUrl = async () => {
    const ok = await copyToClipboard(baseUrl)
    if (ok) toast.success(t('Copied'))
  }

  return (
    <div className='flex items-center gap-2'>
      <button
        type='button'
        onClick={handleCopyBaseUrl}
        aria-label={t('Copy API base URL')}
        title={t('Copy API base URL')}
        className='text-muted-foreground hover:bg-accent hover:text-foreground hidden items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors sm:flex'
      >
        <Link2 className='size-3.5 shrink-0' />
        <span className='max-w-56 truncate font-mono lg:max-w-72'>
          {baseUrl}
        </span>
        <Copy className='size-3.5 shrink-0' />
      </button>
      <Button size='sm' onClick={() => setOpen('create')}>
        <Plus className='h-4 w-4' />
        {t('Create API Key')}
      </Button>
    </div>
  )
}
