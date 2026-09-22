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
import { ExternalLink, Plus } from 'lucide-react'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useDeepSpace } from '@/hooks/use-deep-space'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { getSelf } from '@/lib/api'

import { AffiliateRewardsCard } from './components/affiliate-rewards-card'
import { BillingHistoryDialog } from './components/dialogs/billing-history-dialog'
import { CreemConfirmDialog } from './components/dialogs/creem-confirm-dialog'
import { PaymentConfirmDialog } from './components/dialogs/payment-confirm-dialog'
import { RedeemDialog } from './components/dialogs/redeem-dialog'
import { TransferDialog } from './components/dialogs/transfer-dialog'
import { RechargeFormCard } from './components/recharge-form-card'
import { RechargeDrawer } from './components/recharge-drawer'
import { SubscriptionPlansCard } from './components/subscription-plans-card'
import { WalletBillingPreviewCard } from './components/wallet-billing-preview-card'
import { WalletConsumptionTrendCard } from './components/wallet-consumption-trend-card'
import { WalletStatsCard } from './components/wallet-stats-card'
import {
  CARD_SHOP_URL,
  DEFAULT_DISCOUNT_RATE,
  PAYMENT_TYPES,
} from './constants'
import {
  useTopupInfo,
  usePayment,
  useAffiliate,
  useRedemption,
  useCreemPayment,
  useWaffoPayment,
  useWaffoPancakePayment,
} from './hooks'
import {
  getDefaultPaymentType,
  getMinTopupAmount,
  dispatchSelectedPayment,
} from './lib'
import type {
  UserWalletData,
  PaymentMethod,
  PresetAmount,
  CreemProduct,
  WaffoPayMethod,
} from './types'

interface WalletProps {
  initialShowHistory?: boolean
}

export function Wallet(props: WalletProps) {
  const { t } = useTranslation()
  // Deep-space wallet chrome (renders 10/11) is structural: the light pass
  // drafts 34-35 keep the same hero/drawer frame with light values in CSS.
  const deepSpace = useDeepSpace()
  const [user, setUser] = useState<UserWalletData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [topupAmount, setTopupAmount] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>()
  const [selectedWaffoMethodIndex, setSelectedWaffoMethodIndex] = useState<
    number | null
  >(null)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [redemptionCode, setRedemptionCode] = useState('')
  const [creemDialogOpen, setCreemDialogOpen] = useState(false)
  const [selectedCreemProduct, setSelectedCreemProduct] =
    useState<CreemProduct | null>(null)
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(true)
  const [rechargeDrawerOpen, setRechargeDrawerOpen] = useState(false)
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false)

  const { status } = useStatus()
  const { currency } = useSystemConfig()
  const { topupInfo, presetAmounts, loading: topupLoading } = useTopupInfo()

  // Calculate effective exchange rate - when display type is USD, use rate of 1
  const effectiveUsdExchangeRate = useMemo(() => {
    return currency?.quotaDisplayType === 'USD'
      ? 1
      : currency?.usdExchangeRate || 1
  }, [currency?.quotaDisplayType, currency?.usdExchangeRate])
  const {
    amount: paymentAmount,
    calculating,
    processing,
    calculatePaymentAmount,
    processPayment,
  } = usePayment()
  const {
    affiliateLink,
    loading: affiliateLoading,
    transferQuota,
    transferring,
  } = useAffiliate()
  const { redeeming, redeemCode } = useRedemption()
  const { processing: creemProcessing, processCreemPayment } = useCreemPayment()
  const { processing: waffoProcessing, processWaffoPayment } = useWaffoPayment()
  const { processing: pancakeProcessing, processWaffoPancakePayment } =
    useWaffoPancakePayment()

  // Fetch and refresh user data
  const fetchUser = useCallback(async () => {
    try {
      setUserLoading(true)
      const response = await getSelf()
      if (response.success && response.data) {
        setUser(response.data as UserWalletData)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch user data:', error)
    } finally {
      setUserLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (props.initialShowHistory) {
      setBillingDialogOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [props.initialShowHistory])

  // Initialize topup amount when topup info is loaded
  const topupAmountInitializedRef = useRef(false)
  useEffect(() => {
    if (topupInfo && !topupAmountInitializedRef.current) {
      topupAmountInitializedRef.current = true
      const minTopup = getMinTopupAmount(topupInfo)
      setTopupAmount(minTopup)

      // Calculate initial payment amount with default payment type
      const defaultPaymentType = getDefaultPaymentType(topupInfo)
      calculatePaymentAmount(minTopup, defaultPaymentType)
    }
  }, [topupInfo, calculatePaymentAmount])

  // Get current payment type (selected or default)
  const getCurrentPaymentType = useCallback(() => {
    return selectedPaymentMethod?.type || getDefaultPaymentType(topupInfo)
  }, [selectedPaymentMethod, topupInfo])

  // Handle preset selection
  const handleSelectPreset = (preset: PresetAmount) => {
    setTopupAmount(preset.value)
    setSelectedPreset(preset.value)
    calculatePaymentAmount(preset.value, getCurrentPaymentType())
  }

  // Handle topup amount change
  const handleTopupAmountChange = (amount: number) => {
    setTopupAmount(amount)
    setSelectedPreset(null)
    calculatePaymentAmount(amount, getCurrentPaymentType())
  }

  // Handle payment method selection
  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    setSelectedPaymentMethod(method)
    setSelectedWaffoMethodIndex(null)
    setPaymentLoading(method.type)

    try {
      // Validate minimum topup
      const minTopup = getMinTopupAmount(topupInfo)
      if (topupAmount < minTopup) {
        return
      }

      // Calculate payment amount and show confirmation dialog
      await calculatePaymentAmount(topupAmount, method.type)
      setConfirmDialogOpen(true)
    } finally {
      setPaymentLoading(null)
    }
  }

  // Handle payment confirmation
  const handlePaymentConfirm = async () => {
    if (!selectedPaymentMethod) return

    const success = await dispatchSelectedPayment(
      selectedPaymentMethod,
      topupAmount,
      selectedWaffoMethodIndex,
      {
        regular: processPayment,
        waffo: processWaffoPayment,
        waffoPancake: processWaffoPancakePayment,
      }
    )

    if (success) {
      setConfirmDialogOpen(false)
      await fetchUser()
    }
  }

  // Handle redemption
  const handleRedeem = async () => {
    if (!redemptionCode) return

    const success = await redeemCode(redemptionCode)
    if (success) {
      setRedemptionCode('')
      await fetchUser()
    }
  }

  // Handle transfer
  const handleTransfer = async (amount: number) => {
    const success = await transferQuota(amount)
    if (success) {
      await fetchUser()
    }
    return success
  }

  // Handle Creem product selection
  const handleCreemProductSelect = (product: CreemProduct) => {
    setSelectedCreemProduct(product)
    setCreemDialogOpen(true)
  }

  // Handle Creem payment confirmation
  const handleCreemConfirm = async () => {
    if (!selectedCreemProduct) return

    const success = await processCreemPayment(selectedCreemProduct.productId)
    if (success) {
      setCreemDialogOpen(false)
      setSelectedCreemProduct(null)
      await fetchUser()
    }
  }

  const handleWaffoMethodSelect = async (
    method: WaffoPayMethod,
    index: number
  ) => {
    const loadingKey = `waffo-${index}`
    setSelectedPaymentMethod({
      name: method.name,
      type: PAYMENT_TYPES.WAFFO,
      icon: method.icon,
    })
    setSelectedWaffoMethodIndex(index)
    setPaymentLoading(loadingKey)

    try {
      await calculatePaymentAmount(topupAmount, PAYMENT_TYPES.WAFFO)
      setConfirmDialogOpen(true)
    } finally {
      setPaymentLoading(null)
    }
  }

  // Deep-space recharge drawer (render 11): rows only select a method; the
  // pay button opens the shared confirmation dialog. Creem pays through its
  // own product list instead of the pay button.
  const handleDrawerMethodSelect = async (method: PaymentMethod) => {
    setSelectedPaymentMethod(method)
    setSelectedWaffoMethodIndex(null)
    await calculatePaymentAmount(topupAmount, method.type)
  }

  const handleDrawerWaffoSelect = async (
    method: WaffoPayMethod,
    index: number
  ) => {
    setSelectedPaymentMethod({
      name: method.name,
      type: PAYMENT_TYPES.WAFFO,
      icon: method.icon,
    })
    setSelectedWaffoMethodIndex(index)
    await calculatePaymentAmount(topupAmount, PAYMENT_TYPES.WAFFO)
  }

  const handleDrawerPancakeSelect = async () => {
    setSelectedPaymentMethod({
      name: 'Waffo Pancake',
      type: PAYMENT_TYPES.WAFFO_PANCAKE,
    })
    setSelectedWaffoMethodIndex(null)
    await calculatePaymentAmount(topupAmount, PAYMENT_TYPES.WAFFO_PANCAKE)
  }

  const handleDrawerCreemSelect = () => {
    setSelectedPaymentMethod({ name: 'Creem', type: PAYMENT_TYPES.CREEM })
    setSelectedWaffoMethodIndex(null)
  }

  const handleDrawerPay = async () => {
    const method = selectedPaymentMethod
    if (!method || method.type === PAYMENT_TYPES.CREEM) return
    if (
      method.type === PAYMENT_TYPES.ALIPAY_CLOUDCAT ||
      method.type === PAYMENT_TYPES.WECHAT_CLOUDCAT
    ) {
      window.open(CARD_SHOP_URL, '_blank', 'noopener')
      return
    }
    await calculatePaymentAmount(topupAmount, method.type)
    setConfirmDialogOpen(true)
  }

  const handleDrawerCloudcatPay = (channel: 'alipay' | 'wechat') => {
    setSelectedPaymentMethod({
      name: channel === 'alipay' ? 'Alipay' : 'WeChat Pay',
      type:
        channel === 'alipay'
          ? PAYMENT_TYPES.ALIPAY_CLOUDCAT
          : PAYMENT_TYPES.WECHAT_CLOUDCAT,
    })
    window.open(CARD_SHOP_URL, '_blank', 'noopener')
  }

  // Get discount rate for current topup amount
  const getDiscountRate = useCallback(() => {
    return topupInfo?.discount?.[topupAmount] || DEFAULT_DISCOUNT_RATE
  }, [topupInfo, topupAmount])

  const handleSubscriptionAvailabilityChange = useCallback(
    (available: boolean) => {
      setShowSubscriptionPanel(available)
    },
    []
  )

  const scrollToAddFunds = () => {
    // Deep-space branch: render 11 moves the recharge form into a drawer
    // (recharge-drawer.tsx), so the entry buttons open it instead.
    setRechargeDrawerOpen(true)
  }

  return (
    <>
      <SectionPageLayout>
        {!deepSpace && (
          <SectionPageLayout.Title>{t('Wallet')}</SectionPageLayout.Title>
        )}
        <SectionPageLayout.Content>
          <div className='mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-5'>
            {deepSpace && (
              // Render 10-渲染稿-v6-钱包.html lines 294-302 verbatim: hero row
              // (title + sub + actions). User rework 2026-09-17: "Add Funds"
              // opens the recharge drawer (render 11); "Redeem Card Code"
              // opens the dedicated redemption dialog instead of the drawer.
              <div className='flex flex-wrap items-start justify-between gap-4'>
                <div className='min-w-0'>
                  <div
                    style={{
                      fontSize: 29,
                      fontWeight: 650,
                      letterSpacing: '-0.02em',
                      color: 'var(--ds-t1)',
                    }}
                  >
                    {t('Wallet')}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      color: 'var(--ds-t2)',
                      maxWidth: 660,
                    }}
                  >
                    {t(
                      'Balance, usage, and topup records sync in real time — '
                    )}
                    <span style={{ color: 'var(--ds-t1)' }}>
                      {t('pay as you go')}
                    </span>
                    {t(
                      ', deducted per use; tokens are throttled automatically when the balance runs low.'
                    )}
                  </div>
                </div>
                <div className='flex shrink-0 gap-2.5'>
                  <Button className='ds-btn-primary' onClick={scrollToAddFunds}>
                    <Plus data-icon='inline-start' />
                    {t('Add Funds')}
                  </Button>
                  <Button
                    variant='outline'
                    className='ds-btn-ghost'
                    onClick={() => setRedeemDialogOpen(true)}
                  >
                    <ExternalLink data-icon='inline-start' />
                    {t('Redeem Card Code')}
                  </Button>
                </div>
              </div>
            )}

            <div className={deepSpace ? 'mt-3' : undefined}>
              <WalletStatsCard user={user} loading={userLoading} />
            </div>

            <div
              className={
                deepSpace
                  ? 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-stretch'
                  : 'grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start'
              }
            >
              <WalletConsumptionTrendCard />
              <WalletBillingPreviewCard
                onViewAll={() => setBillingDialogOpen(true)}
              />
            </div>

            {deepSpace && (
              // User rework 2026-09-17: the bottom "Add Funds" action card is
              // removed (single recharge entry, top-right hero button only);
              // the referral card keeps its live transfer functionality.
              <AffiliateRewardsCard
                user={user}
                affiliateLink={affiliateLink}
                onTransfer={() => setTransferDialogOpen(true)}
                complianceConfirmed={
                  topupInfo?.payment_compliance_confirmed !== false
                }
                commission={topupInfo?.recharge_commission}
                loading={affiliateLoading}
              />
            )}

            {deepSpace ? (
              // Render 11-渲染稿-v6-钱包-充值抽屉 moves the recharge form into
              // the drawer (recharge-drawer.tsx); render 10 has no inline
              // recharge form, so the page keeps only the plans block.
              <SubscriptionPlansCard
                topupInfo={topupInfo}
                onAvailabilityChange={handleSubscriptionAvailabilityChange}
                userQuota={user?.quota}
                onPurchaseSuccess={fetchUser}
              />
            ) : (
              <div
                className={
                  showSubscriptionPanel
                    ? 'grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] xl:items-start'
                    : 'grid gap-4'
                }
              >
              <div id='wallet-add-funds' className='scroll-mt-4'>
                <RechargeFormCard
                  topupInfo={topupInfo}
                  presetAmounts={presetAmounts}
                  selectedPreset={selectedPreset}
                  onSelectPreset={handleSelectPreset}
                  topupAmount={topupAmount}
                  onTopupAmountChange={handleTopupAmountChange}
                  paymentAmount={paymentAmount}
                  calculating={calculating}
                  onPaymentMethodSelect={handlePaymentMethodSelect}
                  paymentLoading={paymentLoading}
                  redemptionCode={redemptionCode}
                  onRedemptionCodeChange={setRedemptionCode}
                  onRedeem={handleRedeem}
                  redeeming={redeeming}
                  topupLink={topupInfo?.topup_link}
                  loading={topupLoading}
                  priceRatio={(status?.price as number) || 1}
                  usdExchangeRate={effectiveUsdExchangeRate}
                  onOpenBilling={() => setBillingDialogOpen(true)}
                  creemProducts={topupInfo?.creem_products}
                  enableCreemTopup={topupInfo?.enable_creem_topup}
                  onCreemProductSelect={handleCreemProductSelect}
                  enableWaffoTopup={topupInfo?.enable_waffo_topup}
                  waffoPayMethods={topupInfo?.waffo_pay_methods}
                  waffoMinTopup={topupInfo?.waffo_min_topup}
                  onWaffoMethodSelect={handleWaffoMethodSelect}
                  enableWaffoPancakeTopup={
                    topupInfo?.enable_waffo_pancake_topup
                  }
                />
              </div>

              <SubscriptionPlansCard
                topupInfo={topupInfo}
                onAvailabilityChange={handleSubscriptionAvailabilityChange}
                userQuota={user?.quota}
                onPurchaseSuccess={fetchUser}
              />
              </div>
            )}

            {!deepSpace && (
              <AffiliateRewardsCard
                user={user}
                affiliateLink={affiliateLink}
                onTransfer={() => setTransferDialogOpen(true)}
                complianceConfirmed={
                  topupInfo?.payment_compliance_confirmed !== false
                }
                commission={topupInfo?.recharge_commission}
                loading={affiliateLoading}
              />
            )}
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      {deepSpace && (
        // Render 11-渲染稿-v6-钱包-充值抽屉 (hash-locked f4dcc21de8eecde6):
        // deep-space topup drawer with the card shop iframe (WO-019 增补二).
        <RechargeDrawer
          open={rechargeDrawerOpen}
          onOpenChange={setRechargeDrawerOpen}
          topupInfo={topupInfo}
          presetAmounts={presetAmounts}
          selectedPreset={selectedPreset}
          onSelectPreset={handleSelectPreset}
          topupAmount={topupAmount}
          paymentAmount={paymentAmount}
          calculating={calculating}
          selectedPaymentMethod={selectedPaymentMethod}
          selectedWaffoMethodIndex={selectedWaffoMethodIndex}
          onTopupAmountChange={handleTopupAmountChange}
          onMethodSelect={handleDrawerMethodSelect}
          onWaffoMethodSelect={handleDrawerWaffoSelect}
          onPancakeMethodSelect={handleDrawerPancakeSelect}
          onCreemMethodSelect={handleDrawerCreemSelect}
          onCreemProductSelect={handleCreemProductSelect}
          onPay={handleDrawerPay}
          onCloudcatPay={handleDrawerCloudcatPay}
          redemptionCode={redemptionCode}
          onRedemptionCodeChange={setRedemptionCode}
          onRedeem={handleRedeem}
          redeeming={redeeming}
        />
      )}

      <RedeemDialog
        open={redeemDialogOpen}
        onOpenChange={setRedeemDialogOpen}
        code={redemptionCode}
        onCodeChange={setRedemptionCode}
        onRedeem={handleRedeem}
        redeeming={redeeming}
      />

      <PaymentConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handlePaymentConfirm}
        topupAmount={topupAmount}
        paymentAmount={paymentAmount}
        paymentMethod={selectedPaymentMethod}
        calculating={calculating}
        processing={processing || waffoProcessing || pancakeProcessing}
        discountRate={getDiscountRate()}
        usdExchangeRate={effectiveUsdExchangeRate}
      />

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onConfirm={handleTransfer}
        availableQuota={user?.aff_quota ?? 0}
        transferring={transferring}
      />

      <BillingHistoryDialog
        open={billingDialogOpen}
        onOpenChange={setBillingDialogOpen}
      />

      <CreemConfirmDialog
        open={creemDialogOpen}
        onOpenChange={setCreemDialogOpen}
        onConfirm={handleCreemConfirm}
        product={selectedCreemProduct}
        processing={creemProcessing}
      />
    </>
  )
}
