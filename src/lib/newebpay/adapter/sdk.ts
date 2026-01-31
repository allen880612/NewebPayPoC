/**
 * SDK Adapter - 使用內部 Fork 的 SDK (已修復 bug)
 */
import { NewebpayClient } from '../sdk';
import type { PaymentAdapter } from './interface';
import type { CaptureParams, RefundParams, QueryParams } from '../types';
import type { CloseResult } from '../close';
import type { QueryResult } from '../types';

// Lazy initialization - 避免模組載入時 env 尚未就緒
let _client: NewebpayClient | null = null;

function getClient(): NewebpayClient {
    if (!_client) {
        const merchantId = process.env.NEWEBPAY_MERCHANT_ID?.trim();
        const hashKey = process.env.NEWEBPAY_HASH_KEY?.trim();
        const hashIV = process.env.NEWEBPAY_HASH_IV?.trim();

        if (!merchantId || !hashKey || !hashIV) {
            throw new Error('Missing NewebPay credentials in env');
        }

        _client = new NewebpayClient({
            merchantId,
            hashKey,
            hashIV,
            env: 'sandbox',  // TODO: 可從 env 讀取
        });
    }
    return _client;
}

/**
 * 取得 CloseStatus 文字說明
 */
function getCloseStatusText(status?: number): string {
    switch (status) {
        case 0: return '未請款';
        case 1: return '請款申請中 (等待 21:00 批次)';
        case 2: return '請款處理中 (等待銀行)';
        case 3: return '請款完成';
        case 4: return '請款失敗';
        default: return '未知';
    }
}

/**
 * 取得 BackStatus 文字說明
 */
function getBackStatusText(status?: number): string {
    switch (status) {
        case 0: return '未退款';
        case 1: return '退款申請中 (等待 21:00 批次)';
        case 2: return '退款處理中 (等待銀行)';
        case 3: return '退款完成';
        case 4: return '退款失敗';
        default: return '未知';
    }
}

export class SdkAdapter implements PaymentAdapter {
    getName(): string {
        return 'SDK';
    }

    async capture(params: CaptureParams): Promise<CloseResult> {
        console.log(`[${this.getName()}] Capture request`);
        console.log('MerchantOrderNo:', params.merchantOrderNo);
        console.log('TradeNo:', params.tradeNo);
        console.log('Amount:', params.amount);

        try {
            const client = getClient();

            // SDK 的 refundCreditCard 用於請款和退款
            // CloseType: 1 = 請款, 2 = 退款
            const response = await client.refundCreditCard({
                Amt: params.amount,
                MerchantOrderNo: params.merchantOrderNo,
                IndexType: 1,  // 使用 TradeNo
                TradeNo: params.tradeNo,
                CloseType: 1,  // 請款
            });

            console.log(`[${this.getName()}] Capture response:`, response);

            if (response.Status === 'SUCCESS') {
                const result = response.Result as { TradeNo?: string; MerchantOrderNo?: string; Amt?: number } | undefined;
                return {
                    success: true,
                    status: response.Status,
                    message: response.Message,
                    tradeNo: result?.TradeNo,
                    merchantOrderNo: result?.MerchantOrderNo,
                    amount: result?.Amt,
                };
            } else {
                return {
                    success: false,
                    status: response.Status,
                    message: response.Message,
                };
            }
        } catch (error) {
            console.error(`[${this.getName()}] Capture error:`, error);
            return {
                success: false,
                status: 'SDK_ERROR',
                message: error instanceof Error ? error.message : '請款請求失敗',
            };
        }
    }

    async refund(params: RefundParams): Promise<CloseResult> {
        console.log(`[${this.getName()}] Refund request`);
        console.log('MerchantOrderNo:', params.merchantOrderNo);
        console.log('TradeNo:', params.tradeNo);
        console.log('Amount:', params.amount);

        try {
            const client = getClient();

            const response = await client.refundCreditCard({
                Amt: params.amount,
                MerchantOrderNo: params.merchantOrderNo,
                IndexType: 1,  // 使用 TradeNo
                TradeNo: params.tradeNo || '',
                CloseType: 2,  // 退款
            });

            console.log(`[${this.getName()}] Refund response:`, response);

            if (response.Status === 'SUCCESS') {
                const result = response.Result as { TradeNo?: string; MerchantOrderNo?: string; Amt?: number } | undefined;
                return {
                    success: true,
                    status: response.Status,
                    message: response.Message,
                    tradeNo: result?.TradeNo,
                    merchantOrderNo: result?.MerchantOrderNo,
                    amount: result?.Amt,
                };
            } else {
                return {
                    success: false,
                    status: response.Status,
                    message: response.Message,
                };
            }
        } catch (error) {
            console.error(`[${this.getName()}] Refund error:`, error);
            return {
                success: false,
                status: 'SDK_ERROR',
                message: error instanceof Error ? error.message : '退款請求失敗',
            };
        }
    }

    async query(params: QueryParams): Promise<QueryResult> {
        console.log(`[${this.getName()}] Query request`);
        console.log('MerchantOrderNo:', params.merchantOrderNo);
        console.log('Amount:', params.amount);

        try {
            const client = getClient();

            const response = await client.queryTradeInfo({
                MerchantOrderNo: params.merchantOrderNo,
                Amt: params.amount,
            });

            console.log(`[${this.getName()}] Query response:`, response);

            if (response.Status === 'SUCCESS' && response.Result) {
                const result = response.Result as {
                    TradeNo?: string;
                    TradeStatus?: number;
                    CloseStatus?: number;
                    BackStatus?: number;
                };
                const closeStatus = Number(result.CloseStatus ?? 0);
                const backStatus = Number(result.BackStatus ?? 0);
                const canRefund = closeStatus === 3 && backStatus === 0;

                return {
                    success: true,
                    message: response.Message,
                    tradeNo: result.TradeNo,
                    tradeStatus: result.TradeStatus,
                    closeStatus,
                    backStatus,
                    closeStatusText: getCloseStatusText(closeStatus),
                    backStatusText: getBackStatusText(backStatus),
                    canRefund,
                };
            } else {
                return {
                    success: false,
                    message: response.Message,
                };
            }
        } catch (error) {
            console.error(`[${this.getName()}] Query error:`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : '查詢請求失敗',
            };
        }
    }
}
