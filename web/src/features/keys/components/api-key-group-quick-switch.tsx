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
import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  dotColorMap,
  textColorMap,
  type StatusVariant,
} from '@/components/status-badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useDeepSpace } from '@/hooks/use-deep-space'
import { stringToColor } from '@/lib/colors'
import { cn } from '@/lib/utils'

import { updateApiKey } from '../api'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants'
import { useApiKeys } from './api-keys-provider'
import type { ApiKey, ApiKeyFormData } from '../types'

type ApiKeyGroupQuickSwitchProps = {
  apiKey: ApiKey
  ratio?: number | string
  groups: QuickSwitchGroup[]
}

export type QuickSwitchGroup = {
  value: string
  ratio?: number | string
}

export function ApiKeyGroupQuickSwitch(
  props: ApiKeyGroupQuickSwitchProps
) {
  const { t } = useTranslation()
  // The ds-gqs classes are structural (draft 33 keeps the capsule trigger and
  // menu in light); their light values live in the html:not(.dark) section of
  // theme-presets.css (draft 33 .gsw/.gmenu verbatim).
  const deepSpace = useDeepSpace()
  const { triggerRefresh } = useApiKeys()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const groups = props.groups
  const currentGroup = props.apiKey.group?.trim() || ''
  const ratioText =
    props.ratio === undefined ? undefined : `${props.ratio}x`

  const handleSelect = async (group: string) => {
    if (pending || group === currentGroup) return
    setPending(true)
    try {
      // PUT /api/token/ replaces every editable field, so the payload must be
      // built from the row as-is — the form round-trip re-parses quota through
      // dollars and would lose precision.
      const payload: ApiKeyFormData & { id: number } = {
        id: props.apiKey.id,
        name: props.apiKey.name,
        remain_quota: props.apiKey.remain_quota,
        expired_time: props.apiKey.expired_time,
        unlimited_quota: props.apiKey.unlimited_quota,
        model_limits_enabled: props.apiKey.model_limits_enabled,
        model_limits: props.apiKey.model_limits || '',
        allow_ips: props.apiKey.allow_ips || '',
        group,
        auto_groups:
          group === 'auto' ? (props.apiKey.auto_groups ?? []) : [],
        cross_group_retry:
          group === 'auto' ? !!props.apiKey.cross_group_retry : false,
      }
      const result = await updateApiKey(payload)
      if (result.success) {
        toast.success(t(SUCCESS_MESSAGES.API_KEY_UPDATED))
        setOpen(false)
        triggerRefresh()
      } else {
        toast.error(result.message || t(ERROR_MESSAGES.UPDATE_FAILED))
      }
    } catch {
      toast.error(t(ERROR_MESSAGES.UNEXPECTED))
    } finally {
      setPending(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type='button'
            disabled={pending}
            aria-expanded={open}
            aria-label={t('Switch group')}
            data-slot='api-key-group-quick-switch'
            className={cn(
              deepSpace
                ? 'ds-gqs-trigger'
                : 'inline-flex h-5 max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-2 text-xs font-medium transition-colors hover:bg-muted/60',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          />
        }
      >
        <span
          aria-hidden
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            dotColorMap[stringToColor(currentGroup) as StatusVariant],
            textColorMap[stringToColor(currentGroup) as StatusVariant],
            deepSpace && 'ds-gqs-dot'
          )}
        />
        <span className='min-w-0 truncate'>{currentGroup}</span>
        {ratioText !== undefined && (
          <span
            className={cn(
              'shrink-0 tabular-nums',
              deepSpace
                ? 'ds-gqs-ratio'
                : 'text-[10px] text-muted-foreground'
            )}
          >
            {ratioText}
          </span>
        )}
        <ChevronDown aria-hidden='true' className='size-3 shrink-0 opacity-60' />
      </PopoverTrigger>
      <PopoverContent
        align='start'
        sideOffset={4}
        className={cn(
          'gap-0.5',
          deepSpace ? 'ds-gqs-menu' : 'w-52 min-w-52 rounded-lg p-1'
        )}
      >
        <div
          className={cn(
            deepSpace
              ? 'ds-gqs-title'
              : 'px-2 pb-0.5 pt-1 text-[10px] tracking-[0.08em] text-muted-foreground'
          )}
        >
          {t('Switch group')}
        </div>
        {groups.map((group) => {
          const selected = group.value === currentGroup
          const isAuto = group.value === 'auto'
          const dotClassName = (() => {
            if (isAuto) {
              return deepSpace
                ? 'ds-gqs-dot ds-gqs-dot-auto'
                : 'bg-info text-info'
            }
            return cn(
              dotColorMap[stringToColor(group.value) as StatusVariant],
              textColorMap[stringToColor(group.value) as StatusVariant],
              deepSpace && 'ds-gqs-dot'
            )
          })()
          return (
            <button
              key={group.value}
              type='button'
              data-selected={selected}
              disabled={pending}
              onClick={() => handleSelect(group.value)}
              className={cn(
                deepSpace
                  ? 'ds-gqs-item'
                  : 'flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs transition-colors hover:bg-muted',
                selected && !deepSpace && 'bg-muted'
              )}
            >
              {selected ? (
                <Check
                  aria-hidden='true'
                  className={cn(
                    'shrink-0',
                    deepSpace ? 'ds-gqs-check' : 'size-3 text-muted-foreground'
                  )}
                />
              ) : (
                <span
                  aria-hidden
                  className={cn('size-1.5 shrink-0 rounded-full', dotClassName)}
                />
              )}
              <span className='min-w-0 truncate'>
                {isAuto ? t('Cross-group') : group.value}
              </span>
              {group.ratio !== undefined && (
                <span
                  className={cn(
                    'ml-auto shrink-0 tabular-nums',
                    deepSpace
                      ? 'ds-gqs-chip'
                      : 'rounded-sm border border-border px-1 text-[10.5px] text-muted-foreground'
                  )}
                >
                  {group.ratio}x
                </span>
              )}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
