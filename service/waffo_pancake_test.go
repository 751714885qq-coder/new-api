package service

import (
	"fmt"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupWaffoPancakeResolveTest(t *testing.T) *gorm.DB {
	t.Helper()

	originalDB := model.DB
	originalStoreID := setting.WaffoPancakeStoreID

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.TopUp{}, &model.SubscriptionOrder{}))
	model.DB = db

	t.Cleanup(func() {
		model.DB = originalDB
		setting.WaffoPancakeStoreID = originalStoreID
		sqlDB, err := db.DB()
		if err == nil {
			require.NoError(t, sqlDB.Close())
		}
	})

	return db
}

func waffoPancakeWebhookEvent(tradeNo, storeID, identity string) *WaffoPancakeWebhookEvent {
	return &WaffoPancakeWebhookEvent{
		EventType: "order.completed",
		StoreID:   storeID,
		Data: WaffoPancakeWebhookData{
			OrderID:                       "ORD_test",
			OrderMerchantExternalID:       tradeNo,
			MerchantProvidedBuyerIdentity: identity,
		},
	}
}

// Regression guard for WO-028: Pancake echoes the checkout form email in
// merchantProvidedBuyerIdentity instead of the session token's BuyerIdentity,
// so identity drift must not block crediting; the store binding still must.
func TestResolveWaffoPancakeTradeNo(t *testing.T) {
	db := setupWaffoPancakeResolveTest(t)
	setting.WaffoPancakeStoreID = "STO_configured"

	topUp := &model.TopUp{
		UserId:          2,
		Amount:          1,
		Money:           1.0,
		TradeNo:         "WAFFO_PANCAKE-2-1-abc",
		PaymentMethod:   model.PaymentMethodWaffoPancake,
		PaymentProvider: model.PaymentProviderWaffoPancake,
		CreateTime:      common.GetTimestamp(),
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, db.Create(topUp).Error)

	t.Run("identity drift resolves by trade_no", func(t *testing.T) {
		event := waffoPancakeWebhookEvent(topUp.TradeNo, "STO_configured", "buyer@example.com")
		tradeNo, err := ResolveWaffoPancakeTradeNo(event)
		require.NoError(t, err)
		require.Equal(t, topUp.TradeNo, tradeNo)
	})

	t.Run("matching identity resolves", func(t *testing.T) {
		event := waffoPancakeWebhookEvent(topUp.TradeNo, "STO_configured", "new-api-user-2")
		tradeNo, err := ResolveWaffoPancakeTradeNo(event)
		require.NoError(t, err)
		require.Equal(t, topUp.TradeNo, tradeNo)
	})

	t.Run("store mismatch is rejected", func(t *testing.T) {
		event := waffoPancakeWebhookEvent(topUp.TradeNo, "STO_other", "new-api-user-2")
		_, err := ResolveWaffoPancakeTradeNo(event)
		require.ErrorContains(t, err, "store mismatch")
	})

	t.Run("empty configured store skips store guard", func(t *testing.T) {
		setting.WaffoPancakeStoreID = ""
		event := waffoPancakeWebhookEvent(topUp.TradeNo, "STO_any", "new-api-user-2")
		tradeNo, err := ResolveWaffoPancakeTradeNo(event)
		require.NoError(t, err)
		require.Equal(t, topUp.TradeNo, tradeNo)
	})

	t.Run("unknown trade_no is rejected", func(t *testing.T) {
		event := waffoPancakeWebhookEvent("WAFFO_PANCAKE-9-9-none", "STO_configured", "new-api-user-2")
		_, err := ResolveWaffoPancakeTradeNo(event)
		require.ErrorContains(t, err, "not found")
	})
}

func TestResolveWaffoPancakeSubscriptionTradeNo(t *testing.T) {
	db := setupWaffoPancakeResolveTest(t)
	setting.WaffoPancakeStoreID = "STO_configured"

	order := &model.SubscriptionOrder{
		UserId:          3,
		TradeNo:         "WAFFO_PANCAKE_SUB-3-1-abc",
		PaymentMethod:   model.PaymentMethodWaffoPancake,
		PaymentProvider: model.PaymentProviderWaffoPancake,
		Status:          "pending",
		CreateTime:      common.GetTimestamp(),
	}
	require.NoError(t, db.Create(order).Error)

	t.Run("identity drift resolves by trade_no", func(t *testing.T) {
		event := waffoPancakeWebhookEvent(order.TradeNo, "STO_configured", "buyer@example.com")
		tradeNo, err := ResolveWaffoPancakeSubscriptionTradeNo(event)
		require.NoError(t, err)
		require.Equal(t, order.TradeNo, tradeNo)
	})

	t.Run("store mismatch is rejected", func(t *testing.T) {
		event := waffoPancakeWebhookEvent(order.TradeNo, "STO_other", "new-api-user-3")
		_, err := ResolveWaffoPancakeSubscriptionTradeNo(event)
		require.ErrorContains(t, err, "store mismatch")
	})
}
