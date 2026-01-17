import crypto from 'crypto';
import { getQueryUrl, NEWEBPAY_CONFIG } from './config';
import type { QueryParams, QueryApiResponse, QueryResult } from './types';

/**
 * 取得環境變數 (含 trim 和驗證)
 */
function getEnvVar(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing env var: ${name}`);
    }
    return value;
}

/**
 * 產生 CheckValue (查詢 API 專用)
 * 規則: SHA256(IV={HashIV}&Amt=...&MerchantID=...&MerchantOrderNo=...&Key={HashKey})
 */
function generateCheckValue(merchantOrderNo: string, amount: number): string {
    // 在函數內讀取環境變數，避免模組載入時序問題
    const merchantId = getEnvVar('NEWEBPAY_MERCHANT_ID');
    const hashKey = getEnvVar('NEWEBPAY_HASH_KEY');
    const hashIV = getEnvVar('NEWEBPAY_HASH_IV');

    // 確保金額是整數
    const amt = Math.floor(amount);

    // 參數依 A-Z 排序: Amt, MerchantID, MerchantOrderNo
    const params = `Amt=${amt}&MerchantID=${merchantId}&MerchantOrderNo=${merchantOrderNo}`;

    // ✅ 正確格式：IV= 和 Key= (非 HashIV= 和 HashKey=)
    const raw = `IV=${hashIV}&${params}&Key=${hashKey}`;

    console.log('=== CheckValue Debug ===');
    console.log('Raw string:', raw);

    return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
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

/**
 * 查詢交易狀態
 */
export async function queryTradeInfo(params: QueryParams): Promise<QueryResult> {
    try {
        const merchantId = getEnvVar('NEWEBPAY_MERCHANT_ID');
        const timeStamp = Math.floor(Date.now() / 1000);
        const checkValue = generateCheckValue(params.merchantOrderNo, params.amount);

        const queryUrl = getQueryUrl();
        console.log('=== Query Request ===');
        console.log('URL:', queryUrl);
        console.log('MerchantOrderNo:', params.merchantOrderNo);
        console.log('Amount:', params.amount);

        const formData = new URLSearchParams();
        formData.append('MerchantID', merchantId);
        formData.append('Version', NEWEBPAY_CONFIG.QUERY_VERSION);
        formData.append('RespondType', 'JSON');
        formData.append('CheckValue', checkValue);
        formData.append('TimeStamp', String(timeStamp));
        formData.append('MerchantOrderNo', params.merchantOrderNo);
        formData.append('Amt', String(Math.floor(params.amount)));

        const response = await fetch(queryUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const responseText = await response.text();
        console.log('=== Query Response ===');
        console.log('Raw Response:', responseText);

        let result: QueryApiResponse;
        try {
            result = JSON.parse(responseText);
        } catch {
            console.error('Failed to parse query response');
            return {
                success: false,
                message: '無法解析查詢回應',
            };
        }

        console.log('Status:', result.Status);
        console.log('Message:', result.Message);

        if (result.Status === 'SUCCESS' && result.Result) {
            // API 可能回傳字串，需轉換為數字
            const closeStatus = Number(result.Result.CloseStatus);
            const backStatus = Number(result.Result.BackStatus);
            const canRefund = closeStatus === 3 && backStatus === 0;

            console.log('CloseStatus:', closeStatus, getCloseStatusText(closeStatus));
            console.log('BackStatus:', backStatus, getBackStatusText(backStatus));
            console.log('Can Refund:', canRefund);

            return {
                success: true,
                message: result.Message,
                tradeNo: result.Result.TradeNo,
                tradeStatus: result.Result.TradeStatus,
                closeStatus,
                backStatus,
                closeStatusText: getCloseStatusText(closeStatus),
                backStatusText: getBackStatusText(backStatus),
                canRefund,
            };
        } else {
            return {
                success: false,
                message: result.Message,
            };
        }
    } catch (error) {
        console.error('Query request error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '查詢請求失敗',
        };
    }
}
