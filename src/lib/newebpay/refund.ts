/**
 * 退款 API (Close API CloseType=2)
 */
import { executeCloseRequest, type CloseResult } from './close';
import type { RefundParams } from './types';

// 匯出 RefundResult 作為 CloseResult 的別名
export type RefundResult = CloseResult;

/**
 * 執行退款 API 請求
 */
export async function requestRefund(params: RefundParams): Promise<RefundResult> {
    return executeCloseRequest({
        merchantOrderNo: params.merchantOrderNo,
        tradeNo: params.tradeNo || '',
        amount: params.amount,
        closeType: 2,  // 退款
        timeStamp: params.timeStamp,
    }, '退款');
}
