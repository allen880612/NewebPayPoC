/**
 * Smart Refund - 根據 CloseStatus/BackStatus 自動判斷退款方式
 */
import type { PaymentAdapter } from './adapter/interface';
import type { CloseResult } from './close';
import {
    getOrderWithTransaction,
    updateOrderStatus,
    updateTransaction,
} from '../storage';

// 退款動作類型
export type RefundAction =
    | 'cancel_auth'           // CloseStatus=0, BackStatus=0 → 取消授權
    | 'cancel_capture'        // CloseStatus=1, BackStatus=0 → 取消請款 → 取消授權
    | 'standard_refund'       // CloseStatus=2 或 3, BackStatus=0 → 標準退款
    | 'refund_pending'        // BackStatus=1 → 已在退款佇列
    | 'refund_processing'     // BackStatus=2 → 退款處理中
    | 'already_refunded'      // BackStatus=3 → 已退款
    | 'unknown';              // 其他情況

export interface SmartRefundDecision {
    action: RefundAction;
    description: string;
    canExecute: boolean;
}

export interface SmartRefundStep {
    name: string;
    success: boolean;
    message: string;
    result?: CloseResult;
}

export interface SmartRefundResult {
    success: boolean;
    decision: SmartRefundDecision;
    steps: SmartRefundStep[];
    finalMessage: string;
}

/**
 * 純函式：根據 CloseStatus + BackStatus 決定退款動作
 */
export function determineRefundAction(closeStatus: number, backStatus: number): SmartRefundDecision {
    if (closeStatus === 0 && backStatus === 0) {
        return {
            action: 'cancel_auth',
            description: '未請款，執行取消授權',
            canExecute: true,
        };
    }

    if (closeStatus === 1 && backStatus === 0) {
        return {
            action: 'cancel_capture',
            description: '請款等待中，取消請款後取消授權',
            canExecute: true,
        };
    }

    if ((closeStatus === 2 || closeStatus === 3) && backStatus === 0) {
        return {
            action: 'standard_refund',
            description: closeStatus === 2
                ? '請款處理中，直接發動退款（與請款平行處理）'
                : '請款完成，執行標準退款',
            canExecute: true,
        };
    }

    if (backStatus === 1) {
        return {
            action: 'refund_pending',
            description: '退款已在佇列中，等待 21:00 批次處理',
            canExecute: false,
        };
    }

    if (backStatus === 2) {
        return {
            action: 'refund_processing',
            description: '退款處理中，等待銀行回應',
            canExecute: false,
        };
    }

    if (backStatus === 3) {
        return {
            action: 'already_refunded',
            description: '已完成退款',
            canExecute: false,
        };
    }

    return {
        action: 'unknown',
        description: `無法判斷退款方式 (CloseStatus=${closeStatus}, BackStatus=${backStatus})`,
        canExecute: false,
    };
}

/**
 * 執行智慧退款：Query → 決策 → 執行 → 更新本地狀態
 */
export async function executeSmartRefund(
    adapter: PaymentAdapter,
    merchantOrderNo: string
): Promise<SmartRefundResult> {
    const steps: SmartRefundStep[] = [];

    // 1. 取得本地訂單資料
    const orderWithTx = getOrderWithTransaction(merchantOrderNo);
    if (!orderWithTx) {
        return {
            success: false,
            decision: { action: 'unknown', description: '找不到訂單', canExecute: false },
            steps: [],
            finalMessage: `找不到訂單 ${merchantOrderNo}`,
        };
    }

    if (!orderWithTx.transaction) {
        return {
            success: false,
            decision: { action: 'unknown', description: '找不到交易紀錄', canExecute: false },
            steps: [],
            finalMessage: `訂單 ${merchantOrderNo} 沒有交易紀錄`,
        };
    }

    const { transaction } = orderWithTx;

    // 2. Query 最新狀態
    const queryResult = await adapter.query({
        merchantOrderNo,
        amount: orderWithTx.amount,
    });

    steps.push({
        name: '查詢交易狀態',
        success: queryResult.success,
        message: queryResult.success
            ? `CloseStatus=${queryResult.closeStatus}, BackStatus=${queryResult.backStatus}`
            : queryResult.message,
    });

    if (!queryResult.success) {
        return {
            success: false,
            decision: { action: 'unknown', description: '查詢失敗', canExecute: false },
            steps,
            finalMessage: `查詢交易狀態失敗: ${queryResult.message}`,
        };
    }

    const closeStatus = queryResult.closeStatus ?? 0;
    const backStatus = queryResult.backStatus ?? 0;

    // 更新本地 transaction 狀態
    updateTransaction(transaction.id, {
        tradeStatus: queryResult.tradeStatus ?? transaction.tradeStatus,
        closeStatus,
        backStatus,
    });

    // 3. 決策
    const decision = determineRefundAction(closeStatus, backStatus);

    if (!decision.canExecute) {
        return {
            success: decision.action === 'already_refunded',
            decision,
            steps,
            finalMessage: decision.description,
        };
    }

    // 4. 執行
    const tradeNo = queryResult.tradeNo || transaction.tradeNo;

    // 標記訂單為退款中
    updateOrderStatus(merchantOrderNo, 'refunding');

    switch (decision.action) {
        case 'cancel_auth': {
            const cancelResult = await adapter.cancelAuth({
                merchantOrderNo,
                tradeNo,
                amount: orderWithTx.amount,
            });
            steps.push({
                name: '取消授權',
                success: cancelResult.success,
                message: cancelResult.message,
                result: cancelResult,
            });
            if (cancelResult.success) {
                updateOrderStatus(merchantOrderNo, 'cancelled');
                updateTransaction(transaction.id, {
                    tradeStatus: 3,  // 取消
                    refundCompletedAt: new Date().toISOString(),
                });
            } else {
                updateOrderStatus(merchantOrderNo, 'paid');
            }
            return {
                success: cancelResult.success,
                decision,
                steps,
                finalMessage: cancelResult.success ? '取消授權成功' : `取消授權失敗: ${cancelResult.message}`,
            };
        }

        case 'cancel_capture': {
            // Step 1: 取消請款 (B033: Close API CloseType=1, Cancel=1)
            const cancelCaptureResult = await adapter.cancelCapture({
                merchantOrderNo,
                tradeNo,
                amount: orderWithTx.amount,
            });
            steps.push({
                name: '取消請款',
                success: cancelCaptureResult.success,
                message: cancelCaptureResult.message,
                result: cancelCaptureResult,
            });

            if (!cancelCaptureResult.success) {
                updateOrderStatus(merchantOrderNo, 'paid');
                return {
                    success: false,
                    decision,
                    steps,
                    finalMessage: `取消請款失敗: ${cancelCaptureResult.message}`,
                };
            }

            // Step 2: 取消授權 (B01: Cancel API) — CS 已回到 0
            const cancelAuthResult = await adapter.cancelAuth({
                merchantOrderNo,
                tradeNo,
                amount: orderWithTx.amount,
            });
            steps.push({
                name: '取消授權',
                success: cancelAuthResult.success,
                message: cancelAuthResult.message,
                result: cancelAuthResult,
            });

            if (cancelAuthResult.success) {
                updateOrderStatus(merchantOrderNo, 'cancelled');
                updateTransaction(transaction.id, {
                    tradeStatus: 3,
                    closeStatus: 0,
                    refundCompletedAt: new Date().toISOString(),
                });
            }
            // Step 1 成功但 Step 2 失敗：CS 已回到 0，可稍後重試取消授權

            return {
                success: cancelAuthResult.success,
                decision,
                steps,
                finalMessage: cancelAuthResult.success
                    ? '取消請款+取消授權成功'
                    : `取消請款成功，但取消授權失敗: ${cancelAuthResult.message}`,
            };
        }

        case 'standard_refund': {
            const refundResult = await adapter.refund({
                merchantOrderNo,
                tradeNo,
                amount: orderWithTx.amount,
            });
            steps.push({
                name: '標準退款',
                success: refundResult.success,
                message: refundResult.message,
                result: refundResult,
            });
            if (refundResult.success) {
                updateOrderStatus(merchantOrderNo, 'refunding');
                updateTransaction(transaction.id, {
                    backStatus: 1,  // 退款申請中
                    refundRequestedAt: new Date().toISOString(),
                });
            } else {
                updateOrderStatus(merchantOrderNo, 'paid');
            }
            return {
                success: refundResult.success,
                decision,
                steps,
                finalMessage: refundResult.success ? '退款申請已送出，等待批次處理' : `退款失敗: ${refundResult.message}`,
            };
        }

        default:
            return {
                success: false,
                decision,
                steps,
                finalMessage: `不支援的退款動作: ${decision.action}`,
            };
    }
}
