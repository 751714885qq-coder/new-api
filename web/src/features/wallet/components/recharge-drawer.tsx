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
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getPaymentIcon } from '../lib'
import { CLOUD_CAT_DENOMINATIONS, PAYMENT_TYPES } from '../constants'
import type {
  CreemProduct,
  PaymentMethod,
  PresetAmount,
  TopupInfo,
  WaffoPayMethod,
} from '../types'

import { CreemProductsSection } from './creem-products-section'

const USD = 'USD'

function getStandardMethodSubtitle(type: string, t: (key: string) => string) {
  if (type === PAYMENT_TYPES.STRIPE) {
    return t('International credit cards · Apple Pay')
  }
  return ''
}

/**
 * Deep-space recharge drawer (render 11-渲染稿-v6-钱包-充值抽屉.html,
 * hash-locked f4dcc21de8eecde6). Rendered only in the deep-space wallet
 * branch; the stock branch keeps RechargeFormCard.
 *
 * Render deviations declared to the user (see batch-5 report):
 * - the render's mock buy→QR→success wizard has no data source; per the
 *   approved 范围增补二 mechanism it is replaced by the card shop iframe
 *   (fixed denominations, no free amount, no code-issuing endpoint);
 * - the render has no standalone redemption entry, so the redemption code
 *   row (render step-3 .redeem styling) lives in the left column to keep
 *   the existing redemption function reachable (功能不劣化).
 *
 * User visual-review rework (2026-09-17, direct orders overriding the
 * render): the purchase-notice list and the "open full shop" link are
 * removed, and the shop iframe is proportionally scaled to fit the column.
 */
export function RechargeDrawer(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topupInfo: TopupInfo | null
  presetAmounts: PresetAmount[]
  selectedPreset: number | null
  onSelectPreset: (preset: PresetAmount) => void
  onTopupAmountChange: (amount: number) => void
  topupAmount: number
  paymentAmount: number
  calculating: boolean
  selectedPaymentMethod?: PaymentMethod
  selectedWaffoMethodIndex: number | null
  onMethodSelect: (method: PaymentMethod) => void
  onWaffoMethodSelect: (method: WaffoPayMethod, index: number) => void
  onPancakeMethodSelect: () => void
  onCreemMethodSelect: () => void
  onCreemProductSelect?: (product: CreemProduct) => void
  onPay: () => void
  onCloudcatPay: (channel: 'alipay' | 'wechat') => void
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
}) {
  const { t } = useTranslation()
  const { topupInfo } = props

  // Cloud-cat (card shop) channel: Alipay/WeChat pay at the shop, which
  // only stocks fixed credit denominations — selectable only when the
  // chosen credit amount matches one.
  const cloudcatEnabled = true
  const cloudcatAvailable =
    CLOUD_CAT_DENOMINATIONS.includes(props.topupAmount)
  const [cloudcatSelected, setSelectedCloudcat] = useState<
    'alipay' | 'wechat' | null
  >(null)
  useEffect(() => {
    if (!cloudcatAvailable) {
      setSelectedCloudcat(null)
    }
  }, [cloudcatAvailable])

  if (!props.open) {
    return null
  }

  const hasConfigurableTopup =
    topupInfo?.enable_online_topup ||
    topupInfo?.enable_stripe_topup ||
    topupInfo?.enable_waffo_topup ||
    topupInfo?.enable_waffo_pancake_topup
  const hasAnyTopup = hasConfigurableTopup || topupInfo?.enable_creem_topup
  const hasStandardMethods =
    Array.isArray(topupInfo?.pay_methods) && topupInfo.pay_methods.length > 0
  const hasWaffoMethods =
    (topupInfo?.enable_waffo_topup &&
      Array.isArray(topupInfo?.waffo_pay_methods) &&
      (topupInfo?.waffo_pay_methods?.length ?? 0) > 0) ||
    false
  const redemptionEnabled = topupInfo?.enable_redemption !== false
  const creemProducts = topupInfo?.creem_products
  const creemSelected = props.selectedPaymentMethod?.type === PAYMENT_TYPES.CREEM

  const close = () => props.onOpenChange(false)

  return (
    <div className='ds-rd-root'>
      <div className='ds-rd-scrim' onClick={close} />
      <aside className='ds-rd-drawer'>
        <div className='ds-rd-head'>
          <div className='ds-rd-title'>{t('Add Funds')}</div>
          <button
            type='button'
            className='ds-rd-x'
            onClick={close}
            aria-label={t('Close')}
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>
        <div className='ds-rd-cols'>
          {/* left column: direct online payment (render lines 585-626) */}
          <div className='ds-rd-col'>
            <div className='ds-rd-label'>
              {t('Online Payment · Direct Balance Topup')}
            </div>
            {hasAnyTopup ? (
              <>
                <div className='ds-rd-label'>{t('Topup Credit')}</div>
                {props.presetAmounts.length > 0 && (
                  <div className='ds-rd-chips'>
                    {props.presetAmounts.map((preset) => (
                      <button
                        key={preset.value}
                        type='button'
                        className={
                          props.selectedPreset === preset.value
                            ? 'ds-rd-chip on'
                            : 'ds-rd-chip'
                        }
                        onClick={() => props.onSelectPreset(preset)}
                      >
                        {preset.value}
                      </button>
                    ))}
                  </div>
                )}
                <label
                  className='ds-rd-label'
                  htmlFor='ds-rd-custom-amount'
                  style={{ marginTop: 12 }}
                >
                  {t('Custom Credit Amount')}
                </label>
                <input
                  id='ds-rd-custom-amount'
                  className='ds-rd-amount-input'
                  type='number'
                  min={1}
                  step={0.01}
                  placeholder={t('Enter credit amount, minimum 1')}
                  value={
                    props.selectedPreset === null && props.topupAmount > 0
                      ? String(props.topupAmount)
                      : ''
                  }
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n) && n > 0) {
                      props.onTopupAmountChange(n)
                    }
                  }}
                />
                <div style={{ height: 12 }} />
                <div className='ds-rd-amount-box'>
                  <span className='cny'>$</span>
                  <span className='amt num'>
                    {props.paymentAmount.toFixed(2)}
                  </span>
                  <span className='cur'>{USD}</span>
                </div>
                <div className='ds-rd-label'>{t('Payment Method')}</div>
                {hasStandardMethods &&
                  topupInfo?.pay_methods?.map((method) => {
                    const selected =
                      props.selectedPaymentMethod?.type === method.type &&
                      props.selectedWaffoMethodIndex === null
                    const subtitle = getStandardMethodSubtitle(method.type, t)
                    return (
                      <button
                        key={method.type}
                        type='button'
                        className={selected ? 'ds-rd-pay on' : 'ds-rd-pay'}
                        onClick={() => props.onMethodSelect(method)}
                      >
                        {getPaymentIcon(method.type, 'h-[17px] w-[17px] shrink-0', method.icon, method.name)}
                        <div>
                          <div className='p-name'>{method.name}</div>
                          {subtitle && <div className='p-sub'>{subtitle}</div>}
                        </div>
                        <span className='radio' aria-hidden='true' />
                      </button>
                    )
                  })}
                {hasWaffoMethods &&
                  topupInfo?.waffo_pay_methods?.map((method, index) => {
                    const selected =
                      props.selectedPaymentMethod?.type === PAYMENT_TYPES.WAFFO &&
                      props.selectedWaffoMethodIndex === index
                    return (
                      <button
                        key={`waffo-${method.payMethodType ?? 'unknown'}-${method.payMethodName ?? method.name}`}
                        type='button'
                        className={selected ? 'ds-rd-pay on' : 'ds-rd-pay'}
                        onClick={() => props.onWaffoMethodSelect(method, index)}
                      >
                        {getPaymentIcon(PAYMENT_TYPES.WAFFO, 'h-[17px] w-[17px] shrink-0', method.icon, method.name)}
                        <div>
                          <div className='p-name'>{method.name}</div>
                          <div className='p-sub'>
                            {t('Aggregated payment · channels configured in admin')}
                          </div>
                        </div>
                        <span className='radio' aria-hidden='true' />
                      </button>
                    )
                  })}
                {topupInfo?.enable_waffo_pancake_topup && (
                  <button
                    type='button'
                    className={
                      props.selectedPaymentMethod?.type ===
                        PAYMENT_TYPES.WAFFO_PANCAKE &&
                      !cloudcatSelected
                        ? 'ds-rd-pay on'
                        : 'ds-rd-pay'
                    }
                    onClick={() => {
                      setSelectedCloudcat(null)
                      props.onPancakeMethodSelect()
                    }}
                  >
                    {getPaymentIcon(PAYMENT_TYPES.WAFFO_PANCAKE, 'h-[17px] w-[17px] shrink-0')}
                    <div>
                      <div className='p-name'>Waffo Pancake</div>
                      <div className='p-sub'>{t('Redirect to checkout page payment')}</div>
                    </div>
                    <span className='radio' aria-hidden='true' />
                  </button>
                )}
                {cloudcatEnabled && (
                  <>
                    <button
                      type='button'
                      className={
                        cloudcatSelected === 'alipay' ? 'ds-rd-pay on' : 'ds-rd-pay'
                      }
                      disabled={!cloudcatAvailable}
                      onClick={() => setSelectedCloudcat('alipay')}
                    >
                      {getPaymentIcon(PAYMENT_TYPES.ALIPAY, 'h-[17px] w-[17px] shrink-0')}
                      <div>
                        <div className='p-name'>{t('Alipay')}</div>
                        <div className='p-sub'>
                          {cloudcatAvailable
                            ? t('via card shop · opens in new tab')
                            : t('credit amount must match a stocked denomination')}
                        </div>
                      </div>
                      <span className='radio' aria-hidden='true' />
                    </button>
                    <button
                      type='button'
                      className={
                        cloudcatSelected === 'wechat' ? 'ds-rd-pay on' : 'ds-rd-pay'
                      }
                      disabled={!cloudcatAvailable}
                      onClick={() => setSelectedCloudcat('wechat')}
                    >
                      {getPaymentIcon(PAYMENT_TYPES.WECHAT, 'h-[17px] w-[17px] shrink-0')}
                      <div>
                        <div className='p-name'>{t('WeChat Pay')}</div>
                        <div className='p-sub'>
                          {cloudcatAvailable
                            ? t('via card shop · opens in new tab')
                            : t('credit amount must match a stocked denomination')}
                        </div>
                      </div>
                      <span className='radio' aria-hidden='true' />
                    </button>
                  </>
                )}
                {topupInfo?.enable_creem_topup && (
                  <button
                    type='button'
                    className={creemSelected ? 'ds-rd-pay on' : 'ds-rd-pay'}
                    onClick={props.onCreemMethodSelect}
                  >
                    {getPaymentIcon(PAYMENT_TYPES.CREEM, 'h-[17px] w-[17px] shrink-0')}
                    <div>
                      <div className='p-name'>Creem</div>
                      <div className='p-sub'>
                        {t('Fixed-denomination products · international payment')}
                      </div>
                    </div>
                    <span className='radio' aria-hidden='true' />
                  </button>
                )}
                {!hasStandardMethods &&
                  !hasWaffoMethods &&
                  !topupInfo?.enable_waffo_pancake_topup &&
                  !topupInfo?.enable_creem_topup && (
                    <div className='ds-rd-note' style={{ textAlign: 'left' }}>
                      {t('No payment methods available. Please contact administrator.')}
                    </div>
                )}
                {creemSelected &&
                  Array.isArray(creemProducts) &&
                  creemProducts.length > 0 &&
                  props.onCreemProductSelect && (
                    <CreemProductsSection
                      products={creemProducts}
                      onProductSelect={props.onCreemProductSelect}
                    />
                  )}
                {redemptionEnabled && (
                  <>
                    <div className='ds-rd-label'>{t('Redeem Card Code')}</div>
                    <div className='ds-rd-redeem'>
                      <input
                        value={props.redemptionCode}
                        onChange={(e) => props.onRedemptionCodeChange(e.target.value)}
                        placeholder={t('Enter your redemption code')}
                      />
                      <button
                        type='button'
                        onClick={props.onRedeem}
                        disabled={props.redeeming}
                      >
                        {t('Redeem')}
                      </button>
                    </div>
                  </>
                )}
                <div className='ds-rd-foot'>
                  <button
                    type='button'
                    className='ds-rd-pay-btn'
                    onClick={() => {
                      if (cloudcatSelected) {
                        props.onCloudcatPay(cloudcatSelected)
                        return
                      }
                      props.onPay()
                    }}
                    disabled={
                      creemSelected ||
                      props.calculating ||
                      (cloudcatSelected !== null && !cloudcatAvailable) ||
                      (cloudcatSelected === null && !props.selectedPaymentMethod)
                    }
                  >
                    {cloudcatSelected
                      ? t('Pay Now')
                      : `${t('Pay Now')} $${props.paymentAmount.toFixed(2)}`}
                  </button>
                  <div className='ds-rd-note'>
                    {cloudcatSelected
                      ? t(
                          'You will be redirected to the card shop: buy the matching credit code, then redeem it here.'
                        )
                      : t(
                          'You will be redirected to the payment page; the balance arrives in real time after payment.'
                        )}
                  </div>
                </div>
              </>
            ) : (
              <div className='ds-rd-note' style={{ textAlign: 'left' }}>
                {t(
                  'Online topup is not enabled. Please use redemption code or contact administrator.'
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
