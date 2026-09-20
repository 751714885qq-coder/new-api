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
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet } from 'lucide-react'

import { getSelf } from '@/lib/api'
import { formatQuotaWithCurrency } from '@/lib/currency'
import { useAuthStore } from '@/stores/auth-store'

const BALANCE_POLL_MS = 30_000

/**
 * Console-topbar balance chip (user ruling 2026-09-20): shows the signed-in
 * user's quota on every console page, re-fetched from /api/user/self on
 * mount and every 30s so it tracks consumption; clicking opens the wallet.
 */
export function BalanceChip() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const setUser = useAuthStore((state) => state.auth.setUser)

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      try {
        const res = await getSelf()
        if (!cancelled && res?.success && res.data) {
          setUser(res.data)
        }
      } catch {
        // Transient failures (proxies, rate limits) just keep the last value.
      }
    }
    refresh()
    const timer = setInterval(refresh, BALANCE_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [setUser])

  if (!user) return null

  return (
    <Link
      to='/wallet'
      className='ds-topbar-balance'
      aria-label={t('Balance')}
      title={t('Balance')}
    >
      <Wallet aria-hidden='true' />
      <span>{formatQuotaWithCurrency(user.quota)}</span>
    </Link>
  )
}
