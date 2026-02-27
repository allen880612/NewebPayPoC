/**
 * Cancel Authorization API (取消授權)
 * Endpoint: /API/CreditCard/Cancel
 * 用於 CloseStatus=0（未請款）時取消信用卡授權
 */
import { encryptTradeInfo, generateTradeSha } from './crypto';
import { getCancelUrl, NEWEBPAY_CONFIG } from './config';
import type { CloseResult } from './close';

const MERCHANT_ID = process.env.NEWEBPAY_MERCHANT_ID!;

export interface CancelAuthParams {
    merchantOrderNo: string;
    tradeNo: string;
    amount: number;
    timeStamp?: number;
}

interface CancelApiResponse {
    Status: string;
    Message: string;
    Result?: {
        MerchantID: string;
        Amt: number;
        TradeNo: string;
        MerchantOrderNo: string;
    };
}

/**
 * 建立 Cancel API PostData
 */
function buildCancelPostData(params: CancelAuthParams): string {
    const timeStamp = params.timeStamp || Math.floor(Date.now() / 1000);

    const data = {
        RespondType: 'JSON',
        Version: NEWEBPAY_CONFIG.CANCEL_VERSION,
        Amt: params.amount,
        MerchantOrderNo: params.merchantOrderNo,
        TimeStamp: timeStamp,
        IndexType: 1,           // 1 = 使用 TradeNo
        TradeNo: params.tradeNo,
    };

    return Object.entries(data)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');
}

/**
 * 執行取消授權
 */
export async function executeCancelAuth(params: CancelAuthParams): Promise<CloseResult> {
    try {
        // 1. 建立 PostData 並加密
        const postDataString = buildCancelPostData(params);
        const encryptedPostData = encryptTradeInfo(postDataString);

        // 2. 產生 HashData (SHA256)
        const hashData = generateTradeSha(encryptedPostData);

        // 3. 發送請求
        const cancelUrl = getCancelUrl();
        console.log('=== Cancel Auth Request ===');
        console.log('URL:', cancelUrl);
        console.log('MerchantOrderNo:', params.merchantOrderNo);
        console.log('TradeNo:', params.tradeNo);
        console.log('Amount:', params.amount);

        const formData = new URLSearchParams();
        formData.append('MerchantID_', MERCHANT_ID);
        formData.append('PostData_', encryptedPostData);
        formData.append('HashData_', hashData);

        const response = await fetch(cancelUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const responseText = await response.text();
        console.log('=== Cancel Auth Response ===');
        console.log('Raw Response:', responseText);

        // 4. 解析回應
        let result: CancelApiResponse;
        try {
            result = JSON.parse(responseText);
        } catch {
            console.error('Failed to parse cancel response');
            return {
                success: false,
                status: 'PARSE_ERROR',
                message: '無法解析取消授權回應',
            };
        }

        console.log('Status:', result.Status);
        console.log('Message:', result.Message);

        // 5. 回傳結果
        if (result.Status === 'SUCCESS') {
            return {
                success: true,
                status: result.Status,
                message: result.Message,
                tradeNo: result.Result?.TradeNo,
                merchantOrderNo: result.Result?.MerchantOrderNo,
                amount: result.Result?.Amt,
            };
        } else {
            return {
                success: false,
                status: result.Status,
                message: result.Message,
            };
        }
    } catch (error) {
        console.error('Cancel auth request error:', error);
        return {
            success: false,
            status: 'REQUEST_ERROR',
            message: error instanceof Error ? error.message : '取消授權請求失敗',
        };
    }
}
