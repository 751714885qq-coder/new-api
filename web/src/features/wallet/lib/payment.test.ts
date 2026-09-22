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
import { describe, expect, test } from 'vitest'

import { PAYMENT_TYPES } from '../constants'
import {
  dispatchSelectedPayment,
  formatChannelPaymentAmount,
  getChannelPaymentDisplay,
  isStripePayment,
  isUsdtPayment,
  isWaffoPayment,
  isWaffoPancakePayment,
} from './payment'

describe('payment type classification', () => {
  test('keeps Waffo and Waffo Pancake on their dedicated flows', () => {
    expect(isWaffoPayment(PAYMENT_TYPES.WAFFO)).toBe(true)
    expect(isWaffoPayment(PAYMENT_TYPES.WAFFO_PANCAKE)).toBe(false)
    expect(isWaffoPancakePayment(PAYMENT_TYPES.WAFFO_PANCAKE)).toBe(true)
    expect(isWaffoPancakePayment(PAYMENT_TYPES.WAFFO)).toBe(false)
    expect(isStripePayment(PAYMENT_TYPES.STRIPE)).toBe(true)
  })

  test('classifies custom crypto epay entries as USDT payments', () => {
    expect(isUsdtPayment('usdt.trc20')).toBe(true)
    expect(isUsdtPayment('usdt.erc20')).toBe(true)
    expect(isUsdtPayment(PAYMENT_TYPES.ALIPAY)).toBe(false)
    expect(isUsdtPayment(undefined)).toBe(false)
  })
})

describe('channel payment display', () => {
  test('shows the USDT estimate from the configured gateway rate', () => {
    const display = getChannelPaymentDisplay({
      paymentType: 'usdt.trc20',
      money: 1.0,
      topupAmount: 1,
      usdtRate: '6.7',
    })

    expect(display.approximate).toBe(true)
    expect(display.amount).toBeCloseTo(0.15, 2)
    expect(formatChannelPaymentAmount(display)).toBe('≈0.15 USDT')
  })

  test('falls back to the CNY order money when no USDT rate is configured', () => {
    const display = getChannelPaymentDisplay({
      paymentType: 'usdt.trc20',
      money: 1.0,
      topupAmount: 1,
    })

    expect(display).toEqual({
      approximate: false,
      symbol: '¥',
      amount: 1.0,
      unit: 'CNY',
    })
    expect(formatChannelPaymentAmount(display)).toBe('¥1.00')
  })

  test('shows the card face value for the cloudcat channel', () => {
    const display = getChannelPaymentDisplay({
      paymentType: PAYMENT_TYPES.ALIPAY_CLOUDCAT,
      money: 1.0,
      topupAmount: 5,
    })

    expect(formatChannelPaymentAmount(display)).toBe('¥5.00')
  })

  test('keeps the nominal USD order money for fiat epay channels', () => {
    const display = getChannelPaymentDisplay({
      paymentType: PAYMENT_TYPES.ALIPAY,
      money: 1.0,
      topupAmount: 1,
    })

    expect(formatChannelPaymentAmount(display)).toBe('$1.00')
  })

  test('ignores an unparsable USDT rate', () => {
    const display = getChannelPaymentDisplay({
      paymentType: 'usdt.trc20',
      money: 1.0,
      topupAmount: 1,
      usdtRate: 'not-a-number',
    })

    expect(display.unit).toBe('CNY')
  })
})

describe('payment dispatch', () => {
  test('keeps the selected Waffo method index through confirmation', async () => {
    const calls: string[] = []
    const success = await dispatchSelectedPayment(
      { name: 'Waffo Card', type: PAYMENT_TYPES.WAFFO },
      120,
      3,
      {
        regular: async () => {
          calls.push('regular')
          return false
        },
        waffo: async (amount, index) => {
          calls.push(`waffo:${amount}:${index}`)
          return true
        },
        waffoPancake: async () => {
          calls.push('pancake')
          return false
        },
      }
    )

    expect(success).toBe(true)
    expect(calls).toEqual(['waffo:120:3'])
  })

  test('does not create a Waffo order without a selected method index', async () => {
    let called = false
    const success = await dispatchSelectedPayment(
      { name: 'Waffo Card', type: PAYMENT_TYPES.WAFFO },
      120,
      null,
      {
        regular: async () => false,
        waffo: async () => {
          called = true
          return true
        },
        waffoPancake: async () => false,
      }
    )

    expect(success).toBe(false)
    expect(called).toBe(false)
  })
})
