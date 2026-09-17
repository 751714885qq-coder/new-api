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
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'

/**
 * Standalone card-code redemption dialog (deep-space wallet). User rework
 * 2026-09-17: the "Redeem Card Code" entry opens this dialog instead of the
 * recharge drawer (whose right column is the card shop embed).
 */
export function RedeemDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  code: string
  onCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
}) {
  const { t } = useTranslation()

  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent className='max-sm:w-[calc(100vw-1.5rem)] sm:max-w-md'>
        <AlertDialogHeader>
          <AlertDialogTitle className='text-xl font-semibold'>
            {t('Redeem Card Code')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'Enter a card code to credit its face value to your balance.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={props.code}
          onChange={(e) => props.onCodeChange(e.target.value)}
          placeholder={t('Enter your redemption code')}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.redeeming}>
            {t('Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={props.onRedeem}
            disabled={props.redeeming || !props.code}
          >
            {props.redeeming && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {t('Redeem')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
