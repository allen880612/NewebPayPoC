/**
 * 批次退款處理器
 * 讀取 pending 退款請求 → Query 最新狀態 → 決策 → 執行/跳過 → 更新結果
 */
import type { PaymentAdapter } from './adapter/interface';
import { determineRefundAction } from './smart-refund';
import {
    getPendingRequests,
    updateRefundRequest,
    type RefundRequest,
} from '../refund-queue';
import {
    getOrderWithTransaction,
    updateOrderStatus,
    updateTransaction,
} from '../storage';

export interface BatchRefundItemResult {
    requestId: string;
    merchantOrderNo: string;
    action: string;
    success: boolean;
    message: string;
    skipped: boolean;
}

export interface BatchRefundResult {
    success: boolean;
    total: number;
    processed: number;
    skipped: number;
    failed: number;
    completed: number;
    results: BatchRefundItemResult[];
}

/**
 * 執行批次退款
 */
export async function executeBatchRefund(adapter: PaymentAdapter): Promise<BatchRefundResult> {
    const pendingRequests = getPendingRequests();
    const results: BatchRefundItemResult[] = [];

    let processed = 0;
    let skipped = 0;
    let failed = 0;
    let completed = 0;

    for (const request of pendingRequests) {
        const itemResult = await processOneRequest(adapter, request);
        results.push(itemResult);

        if (itemResult.skipped) {
            skipped++;
        } else if (itemResult.success) {
            completed++;
        } else {
            failed++;
        }
        processed++;
    }

    return {
        success: true,
        total: pendingRequests.length,
        processed,
        skipped,
        failed,
        completed,
        results,
    };
}

async function processOneRequest(
    adapter: PaymentAdapter,
    request: RefundRequest
): Promise<BatchRefundItemResult> {
    const now = new Date().toISOString();

    // 標記為處理中
    updateRefundRequest(request.id, {
        status: 'processing',
        lastAttemptAt: now,
    });

    // 取得本地訂單
    const orderWithTx = getOrderWithTransaction(request.merchantOrderNo);
    if (!orderWithTx || !orderWithTx.transaction) {
        updateRefundRequest(request.id, {
            status: 'failed',
            lastError: '找不到訂單或交易紀錄',
        });
        return {
            requestId: request.id,
            merchantOrderNo: request.merchantOrderNo,
            action: 'none',
            success: false,
            message: '找不到訂單或交易紀錄',
            skipped: false,
        };
    }

    // Query 最新狀態
    const queryResult = await adapter.query({
        merchantOrderNo: request.merchantOrderNo,
        amount: request.amount,
    });

    if (!queryResult.success) {
        const newRetryCount = request.retryCount + 1;
        const isFailed = newRetryCount >= request.maxRetries;

        updateRefundRequest(request.id, {
            status: isFailed ? 'failed' : 'pending',
            retryCount: newRetryCount,
            lastError: `查詢失敗: ${queryResult.message}`,
        });

        return {
            requestId: request.id,
            merchantOrderNo: request.merchantOrderNo,
            action: 'query_failed',
            success: false,
            message: queryResult.message,
            skipped: false,
        };
    }

    const closeStatus = queryResult.closeStatus ?? 0;
    const backStatus = queryResult.backStatus ?? 0;

    // 更新本地 Transaction 狀態
    updateTransaction(orderWithTx.transaction.id, {
        tradeStatus: queryResult.tradeStatus ?? orderWithTx.transaction.tradeStatus,
        closeStatus,
        backStatus,
    });

    // 決策
    const decision = determineRefundAction(closeStatus, backStatus);

    // 已退款 / 退款中 / 退款佇列中 → 標記完成
    if (['already_refunded', 'refund_pending', 'refund_processing'].includes(decision.action)) {
        updateRefundRequest(request.id, {
            status: 'completed',
            completedAt: now,
        });

        if (decision.action === 'already_refunded') {
            updateOrderStatus(request.merchantOrderNo, 'refunded');
        }

        return {
            requestId: request.id,
            merchantOrderNo: request.merchantOrderNo,
            action: decision.action,
            success: true,
            message: decision.description,
            skipped: false,
        };
    }

    // 不可執行的動作
    if (!decision.canExecute) {
        updateRefundRequest(request.id, {
            status: 'pending',
            lastError: decision.description,
        });
        return {
            requestId: request.id,
            merchantOrderNo: request.merchantOrderNo,
            action: decision.action,
            success: false,
            message: decision.description,
            skipped: true,
        };
    }

    // 執行退款
    const tradeNo = queryResult.tradeNo || orderWithTx.transaction.tradeNo;

    updateOrderStatus(request.merchantOrderNo, 'refunding');

    let execSuccess = false;
    let execMessage = '';

    switch (decision.action) {
        case 'cancel_auth': {
            const result = await adapter.cancelAuth({
                merchantOrderNo: request.merchantOrderNo,
                tradeNo,
                amount: request.amount,
            });
            execSuccess = result.success;
            execMessage = result.message;
            if (result.success) {
                updateOrderStatus(request.merchantOrderNo, 'cancelled');
                updateTransaction(orderWithTx.transaction.id, {
                    tradeStatus: 3,
                    refundCompletedAt: now,
                });
            }
            break;
        }

        case 'cancel_capture': {
            // Step 1: 取消請款 (B033)
            const cancelCaptureResult = await adapter.cancelCapture({
                merchantOrderNo: request.merchantOrderNo,
                tradeNo,
                amount: request.amount,
            });
            if (!cancelCaptureResult.success) {
                execSuccess = false;
                execMessage = `取消請款失敗: ${cancelCaptureResult.message}`;
                break;
            }

            // Step 2: 取消授權 (B01) — CS 已回到 0
            const cancelAuthResult = await adapter.cancelAuth({
                merchantOrderNo: request.merchantOrderNo,
                tradeNo,
                amount: request.amount,
            });
            execSuccess = cancelAuthResult.success;
            execMessage = cancelAuthResult.success
                ? '取消請款+取消授權成功'
                : `取消請款成功，但取消授權失敗: ${cancelAuthResult.message}`;
            if (cancelAuthResult.success) {
                updateOrderStatus(request.merchantOrderNo, 'cancelled');
                updateTransaction(orderWithTx.transaction.id, {
                    tradeStatus: 3,
                    closeStatus: 0,
                    refundCompletedAt: now,
                });
            }
            break;
        }

        case 'standard_refund': {
            const result = await adapter.refund({
                merchantOrderNo: request.merchantOrderNo,
                tradeNo,
                amount: request.amount,
            });
            execSuccess = result.success;
            execMessage = result.message;
            if (result.success) {
                updateOrderStatus(request.merchantOrderNo, 'refunding');
                updateTransaction(orderWithTx.transaction.id, {
                    backStatus: 1,
                    refundRequestedAt: now,
                });
            }
            break;
        }

        default:
            execMessage = `不支援的動作: ${decision.action}`;
    }

    if (execSuccess) {
        updateRefundRequest(request.id, {
            status: 'completed',
            completedAt: now,
        });
    } else {
        const newRetryCount = request.retryCount + 1;
        const isFailed = newRetryCount >= request.maxRetries;

        updateRefundRequest(request.id, {
            status: isFailed ? 'failed' : 'pending',
            retryCount: newRetryCount,
            lastError: execMessage,
        });

        if (!isFailed) {
            updateOrderStatus(request.merchantOrderNo, 'paid');
        }
    }

    return {
        requestId: request.id,
        merchantOrderNo: request.merchantOrderNo,
        action: decision.action,
        success: execSuccess,
        message: execMessage,
        skipped: false,
    };
}
