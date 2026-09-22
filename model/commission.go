package model

import (
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// RechargeCommission 记录一笔成功充值对应的返佣发放。TradeNo 唯一索引保证
// 同一笔充值至多发放一次；发放使用独立事务，失败只记日志、不影响已完成的
// 充值（宁漏不重：漏发可凭 trade_no 补发，重发难追回）。
type RechargeCommission struct {
	Id              int     `json:"id"`
	InviterId       int     `json:"inviter_id" gorm:"index"`
	InviteeId       int     `json:"invitee_id" gorm:"index"`
	TradeNo         string  `json:"trade_no" gorm:"unique;type:varchar(255)"`
	TopUpId         int     `json:"top_up_id"`
	CreditedQuota   int     `json:"credited_quota"`
	CommissionQuota int     `json:"commission_quota"`
	Rate            float64 `json:"rate"`
	CreateTime      int64   `json:"create_time"`
}

// GrantRechargeCommission 在充值事务提交成功后调用，为被邀请人的邀请人发放
// 充值返佣。creditedQuota 为该笔充值实际入账额度（返佣基数）。比例未启用、
// 无邀请人、笔数用尽或封顶已满时静默跳过；任何错误只记日志。
func GrantRechargeCommission(inviteeId int, tradeNo string, topUpId int, creditedQuota int) {
	if common.RechargeCommissionRate <= 0 || creditedQuota <= 0 || tradeNo == "" {
		return
	}

	inviterId, commission, err := grantRechargeCommissionTx(inviteeId, tradeNo, topUpId, creditedQuota)
	if err != nil {
		common.SysError(fmt.Sprintf("recharge commission grant failed: trade_no=%s invitee_id=%d error=%q", tradeNo, inviteeId, err.Error()))
		return
	}
	if inviterId == 0 || commission <= 0 {
		return
	}
	RecordLog(inviterId, LogTypeSystem, fmt.Sprintf("邀请返佣到账：被邀请用户充值成功，返佣额度: %s（比例 %.0f%%）", logger.FormatQuota(commission), common.RechargeCommissionRate*100))
}

func grantRechargeCommissionTx(inviteeId int, tradeNo string, topUpId int, creditedQuota int) (int, int, error) {
	var inviterId int
	var commission int

	err := DB.Transaction(func(tx *gorm.DB) error {
		// 行锁串行化同一被邀请人的并发充值，保证笔数计数与唯一发放。
		invitee := &User{}
		if err := lockForUpdate(tx).Select("id", "inviter_id").First(invitee, "id = ?", inviteeId).Error; err != nil {
			return err
		}
		if invitee.InviterId == 0 {
			return nil
		}
		inviterId = invitee.InviterId

		var count int64
		if err := tx.Model(&RechargeCommission{}).Where("invitee_id = ?", inviteeId).Count(&count).Error; err != nil {
			return err
		}
		if count >= int64(common.RechargeCommissionTopupCount) {
			return nil
		}

		checked, clamp := common.QuotaFromDecimalChecked(
			decimal.NewFromInt(int64(creditedQuota)).Mul(decimal.NewFromFloat(common.RechargeCommissionRate)),
		)
		if clamp != nil {
			common.SysError(fmt.Sprintf("recharge commission clamped: trade_no=%s credited_quota=%d %s", tradeNo, creditedQuota, clamp.Error()))
		}
		if checked <= 0 {
			return nil
		}
		commission = checked

		if common.RechargeCommissionCap > 0 {
			// 锁邀请人行后求和，串行化同一邀请人的封顶核算。
			inviter := &User{}
			if err := lockForUpdate(tx).Select("id").First(inviter, "id = ?", inviterId).Error; err != nil {
				return err
			}
			var granted int64
			if err := tx.Model(&RechargeCommission{}).
				Where("inviter_id = ?", inviterId).
				Select("COALESCE(SUM(commission_quota), 0)").
				Scan(&granted).Error; err != nil {
				return err
			}
			remaining := common.RechargeCommissionCap - int(granted)
			if remaining <= 0 {
				commission = 0
				return nil
			}
			commission = min(commission, remaining)
		}

		record := &RechargeCommission{
			InviterId:       inviterId,
			InviteeId:       inviteeId,
			TradeNo:         tradeNo,
			TopUpId:         topUpId,
			CreditedQuota:   creditedQuota,
			CommissionQuota: commission,
			Rate:            common.RechargeCommissionRate,
			CreateTime:      common.GetTimestamp(),
		}
		if err := tx.Create(record).Error; err != nil {
			return err
		}

		result := tx.Model(&User{}).Where("id = ?", inviterId).Updates(map[string]any{
			"aff_quota":   gorm.Expr("aff_quota + ?", commission),
			"aff_history": gorm.Expr("aff_history + ?", commission),
		})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
	if err != nil {
		inviterId = 0
		commission = 0
	}
	return inviterId, commission, err
}
