/**
 * 請款 API (Close API CloseType=1)
 */
import { executeCloseRequest, type CloseResult } from './close';
import type { CaptureParams } from './types';

// 匯出 CaptureResult 作為 CloseResult 的別名
export type CaptureResult = CloseResult;

/**
 * 執行請款 API 請求
 */
export async function requestCapture(params: CaptureParams): Promise<CaptureResult> {
    return executeCloseRequest({
        merchantOrderNo: params.merchantOrderNo,
        tradeNo: params.tradeNo,
        amount: params.amount,
        closeType: 1,  // 請款
        timeStamp: params.timeStamp,
    }, '請款');
}
