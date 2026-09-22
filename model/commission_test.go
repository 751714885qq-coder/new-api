package model

import (
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func openCommissionSQLiteDB(dsn string) (*gorm.DB, error) {
	return gorm.Open(sqlite.Open(dsn), &gorm.Config{})
}

// setupCommissionTestDB swaps the package globals onto an in-memory SQLite
// database with only the tables the commission path touches.
func setupCommissionTestDB(t *testing.T) {
	t.Helper()
	previousDB, previousLogDB := DB, LOG_DB
	previousMainDatabaseType, previousLogDatabaseType := common.MainDatabaseType(), common.LogDatabaseType()
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	DB, LOG_DB = db, db
	require.NoError(t, db.AutoMigrate(&User{}, &RechargeCommission{}, &Log{}))
	t.Cleanup(func() {
		DB, LOG_DB = previousDB, previousLogDB
		common.SetDatabaseTypes(previousMainDatabaseType, previousLogDatabaseType)
		_ = db.Exec("SELECT 1").Error
		sqlDB, err := db.DB()
		require.NoError(t, err)
		_ = sqlDB.Close()
	})
}

func createCommissionUsers(t *testing.T) (inviterId, inviteeId int) {
	t.Helper()
	inviter := User{Username: "commission-inviter", Password: "x", Role: common.RoleCommonUser, Status: common.UserStatusEnabled, AffCode: "CINV"}
	invitee := User{Username: "commission-invitee", Password: "x", Role: common.RoleCommonUser, Status: common.UserStatusEnabled, AffCode: "CINV-INVITEE"}
	require.NoError(t, DB.Create(&inviter).Error)
	require.NoError(t, DB.Create(&invitee).Error)
	require.NoError(t, DB.Model(&User{}).Where("id = ?", invitee.Id).Update("inviter_id", inviter.Id).Error)
	return inviter.Id, invitee.Id
}

func resetCommissionSettings(t *testing.T) {
	t.Helper()
	previousRate, previousCount, previousCap := common.RechargeCommissionRate, common.RechargeCommissionTopupCount, common.RechargeCommissionCap
	t.Cleanup(func() {
		common.RechargeCommissionRate = previousRate
		common.RechargeCommissionTopupCount = previousCount
		common.RechargeCommissionCap = previousCap
	})
}

func TestGrantRechargeCommissionDisabled(t *testing.T) {
	setupCommissionTestDB(t)
	resetCommissionSettings(t)
	common.RechargeCommissionRate = 0
	inviterId, inviteeId := createCommissionUsers(t)

	GrantRechargeCommission(inviteeId, "TRADE-OFF", 1, 500000)

	var count int64
	require.NoError(t, DB.Model(&RechargeCommission{}).Count(&count).Error)
	assert.Zero(t, count)
	var inviter User
	require.NoError(t, DB.First(&inviter, inviterId).Error)
	assert.Zero(t, inviter.AffQuota)
}

func TestGrantRechargeCommissionExactRate(t *testing.T) {
	setupCommissionTestDB(t)
	resetCommissionSettings(t)
	common.RechargeCommissionRate = 0.12
	common.RechargeCommissionTopupCount = 3
	common.RechargeCommissionCap = 0
	inviterId, inviteeId := createCommissionUsers(t)

	GrantRechargeCommission(inviteeId, "TRADE-1", 11, 500000)

	var record RechargeCommission
	require.NoError(t, DB.First(&record, "trade_no = ?", "TRADE-1").Error)
	assert.Equal(t, inviterId, record.InviterId)
	assert.Equal(t, inviteeId, record.InviteeId)
	assert.EqualValues(t, 11, record.TopUpId)
	assert.EqualValues(t, 500000, record.CreditedQuota)
	assert.EqualValues(t, 60000, record.CommissionQuota)
	assert.InDelta(t, 0.12, record.Rate, 1e-9)
	var inviter User
	require.NoError(t, DB.First(&inviter, inviterId).Error)
	assert.EqualValues(t, 60000, inviter.AffQuota)
	assert.EqualValues(t, 60000, inviter.AffHistoryQuota)
}

func TestGrantRechargeCommissionTradeNoIdempotent(t *testing.T) {
	setupCommissionTestDB(t)
	resetCommissionSettings(t)
	common.RechargeCommissionRate = 0.12
	inviterId, inviteeId := createCommissionUsers(t)

	GrantRechargeCommission(inviteeId, "TRADE-REPLAY", 12, 500000)
	GrantRechargeCommission(inviteeId, "TRADE-REPLAY", 12, 500000)

	var count int64
	require.NoError(t, DB.Model(&RechargeCommission{}).Where("trade_no = ?", "TRADE-REPLAY").Count(&count).Error)
	assert.EqualValues(t, 1, count)
	var inviter User
	require.NoError(t, DB.First(&inviter, inviterId).Error)
	assert.EqualValues(t, 60000, inviter.AffQuota)
}

func TestGrantRechargeCommissionTopupCountLimit(t *testing.T) {
	setupCommissionTestDB(t)
	resetCommissionSettings(t)
	common.RechargeCommissionRate = 0.12
	common.RechargeCommissionTopupCount = 2
	inviterId, inviteeId := createCommissionUsers(t)

	GrantRechargeCommission(inviteeId, "TRADE-N1", 1, 500000)
	GrantRechargeCommission(inviteeId, "TRADE-N2", 2, 500000)
	GrantRechargeCommission(inviteeId, "TRADE-N3", 3, 500000)

	var count int64
	require.NoError(t, DB.Model(&RechargeCommission{}).Where("invitee_id = ?", inviteeId).Count(&count).Error)
	assert.EqualValues(t, 2, count)
	var inviter User
	require.NoError(t, DB.First(&inviter, inviterId).Error)
	assert.EqualValues(t, 120000, inviter.AffQuota)
}

func TestGrantRechargeCommissionCapTruncatesAndStops(t *testing.T) {
	setupCommissionTestDB(t)
	resetCommissionSettings(t)
	common.RechargeCommissionRate = 0.12
	common.RechargeCommissionTopupCount = 10
	common.RechargeCommissionCap = 100000
	inviterId, inviteeId := createCommissionUsers(t)

	// First grant 60000; second truncated to the remaining 40000; third hits
	// the cap and is skipped entirely (no row, no aff change).
	GrantRechargeCommission(inviteeId, "TRADE-C1", 1, 500000)
	GrantRechargeCommission(inviteeId, "TRADE-C2", 2, 500000)
	GrantRechargeCommission(inviteeId, "TRADE-C3", 3, 500000)

	var count int64
	require.NoError(t, DB.Model(&RechargeCommission{}).Count(&count).Error)
	assert.EqualValues(t, 2, count)
	var second RechargeCommission
	require.NoError(t, DB.First(&second, "trade_no = ?", "TRADE-C2").Error)
	assert.EqualValues(t, 40000, second.CommissionQuota)
	var inviter User
	require.NoError(t, DB.First(&inviter, inviterId).Error)
	assert.EqualValues(t, 100000, inviter.AffQuota)
	assert.EqualValues(t, 100000, inviter.AffHistoryQuota)
}

func TestGrantRechargeCommissionWithoutInviter(t *testing.T) {
	setupCommissionTestDB(t)
	resetCommissionSettings(t)
	common.RechargeCommissionRate = 0.12
	orphan := User{Username: "commission-orphan", Password: "x", Role: common.RoleCommonUser, Status: common.UserStatusEnabled, AffCode: "CORPH"}
	require.NoError(t, DB.Create(&orphan).Error)

	GrantRechargeCommission(orphan.Id, "TRADE-ORPHAN", 1, 500000)

	var count int64
	require.NoError(t, DB.Model(&RechargeCommission{}).Count(&count).Error)
	assert.Zero(t, count)
}

// TestGrantRechargeCommissionMatrix runs the core grant/idempotency/count/cap
// scenario and a double-AutoMigrate idempotency check against real database
// engines. MySQL and PostgreSQL require TEST_MYSQL_DSN / TEST_POSTGRES_DSN
// (same convention as migration_dialector_test.go) and are skipped otherwise.
func TestGrantRechargeCommissionMatrix(t *testing.T) {
	type dialectDB struct {
		name string
		dsn  string
		open func(string) (*gorm.DB, error)
	}
	dialects := []dialectDB{
		{name: "sqlite", dsn: "local", open: openCommissionSQLiteDB},
	}
	if dsn := os.Getenv("TEST_MYSQL_DSN"); dsn != "" {
		dialects = append(dialects, dialectDB{name: "mysql", dsn: dsn, open: func(dsn string) (*gorm.DB, error) {
			return gorm.Open(mysql.Open(dsn), &gorm.Config{})
		}})
	}
	if dsn := os.Getenv("TEST_POSTGRES_DSN"); dsn != "" {
		dialects = append(dialects, dialectDB{name: "postgres", dsn: dsn, open: func(dsn string) (*gorm.DB, error) {
			return gorm.Open(postgres.Open(dsn), &gorm.Config{})
		}})
	}

	for _, dialect := range dialects {
		t.Run(dialect.name, func(t *testing.T) {
			previousDB, previousLogDB := DB, LOG_DB
			previousMainDatabaseType, previousLogDatabaseType := common.MainDatabaseType(), common.LogDatabaseType()
			switch dialect.name {
			case "mysql":
				common.SetDatabaseTypes(common.DatabaseTypeMySQL, common.DatabaseTypeMySQL)
			case "postgres":
				common.SetDatabaseTypes(common.DatabaseTypePostgreSQL, common.DatabaseTypePostgreSQL)
			default:
				common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
			}
			db, err := dialect.open(dialect.dsn)
			require.NoError(t, err)
			DB, LOG_DB = db, db
			sqlDB, err := db.DB()
			require.NoError(t, err)
			t.Cleanup(func() {
				DB, LOG_DB = previousDB, previousLogDB
				common.SetDatabaseTypes(previousMainDatabaseType, previousLogDatabaseType)
				_ = sqlDB.Close()
			})

			require.NoError(t, db.AutoMigrate(&User{}, &RechargeCommission{}, &Log{}))
			require.NoError(t, db.AutoMigrate(&User{}, &RechargeCommission{}, &Log{})) // second run must be a no-op

			// Persistent engines keep rows from earlier runs; hard-delete them
			// (soft-deleted rows still occupy the username/aff_code uniques).
			require.NoError(t, db.Unscoped().Where("username LIKE ?", "matrix-%").Delete(&User{}).Error)
			require.NoError(t, db.Unscoped().Where("trade_no LIKE ?", "MX-%").Delete(&RechargeCommission{}).Error)

			previousRate, previousCount, previousCap := common.RechargeCommissionRate, common.RechargeCommissionTopupCount, common.RechargeCommissionCap
			common.RechargeCommissionRate = 0.12
			common.RechargeCommissionTopupCount = 10
			common.RechargeCommissionCap = 100000
			t.Cleanup(func() {
				common.RechargeCommissionRate = previousRate
				common.RechargeCommissionTopupCount = previousCount
				common.RechargeCommissionCap = previousCap
			})

			suffix := dialect.name
			inviter := User{Username: "matrix-inviter-" + suffix, Password: "x", Role: common.RoleCommonUser, Status: common.UserStatusEnabled, AffCode: "MX" + suffix}
			invitee := User{Username: "matrix-invitee-" + suffix, Password: "x", Role: common.RoleCommonUser, Status: common.UserStatusEnabled, AffCode: "MXI" + suffix}
			require.NoError(t, DB.Create(&inviter).Error)
			require.NoError(t, DB.Create(&invitee).Error)
			require.NoError(t, DB.Model(&User{}).Where("id = ?", invitee.Id).Update("inviter_id", inviter.Id).Error)

			// First grant 60000; second truncated to the remaining 40000; a
			// replayed trade_no must not create a second row.
			GrantRechargeCommission(invitee.Id, "MX-"+suffix+"-1", 1, 500000)
			GrantRechargeCommission(invitee.Id, "MX-"+suffix+"-2", 2, 500000)
			GrantRechargeCommission(invitee.Id, "MX-"+suffix+"-2", 2, 500000)

			var granted []RechargeCommission
			require.NoError(t, DB.Where("trade_no LIKE ?", "MX-"+suffix+"-%").Order("trade_no").Find(&granted).Error)
			require.Len(t, granted, 2)
			assert.EqualValues(t, 60000, granted[0].CommissionQuota)
			assert.EqualValues(t, 40000, granted[1].CommissionQuota)

			var inviterAfter User
			require.NoError(t, DB.First(&inviterAfter, inviter.Id).Error)
			assert.EqualValues(t, 100000, inviterAfter.AffQuota)
			assert.EqualValues(t, 100000, inviterAfter.AffHistoryQuota)
		})
	}
}
