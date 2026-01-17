import { encryptTradeInfo, generateTradeSha } from './crypto';
import { getCloseUrl, NEWEBPAY_CONFIG } from './config';
import type { RefundParams, RefundApiResponse, RefundResult } from './types';

const MERCHANT_ID = process.env.NEWEBPAY_MERCHANT_ID!;

/**
 * 建立退款請求的 PostData（加密前的 URL-encoded 字串）
 */
function buildRefundPostData(params: RefundParams): string {
    const timeStamp = params.timeStamp || Math.floor(Date.now() / 1000);

    const data = {
        RespondType: 'JSON',
        Version: NEWEBPAY_CONFIG.CLOSE_VERSION,
        Amt: params.amount,
        MerchantOrderNo: params.merchantOrderNo,
        TimeStamp: timeStamp,
        IndexType: 1,                 // 1 = 使用 TradeNo (藍新交易序號)
        TradeNo: params.tradeNo,      // 藍新交易序號
        CloseType: 2,                 // 2 = 退款
    };

    // 轉換為 URL-encoded 字串
    const queryString = Object.entries(data)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');

    return queryString;
}

/**
 * 執行退款 API 請求
 */
export async function requestRefund(params: RefundParams): Promise<RefundResult> {
    try {
        // 1. 建立 PostData 並加密
        const postDataString = buildRefundPostData(params);
        const encryptedPostData = encryptTradeInfo(postDataString);

        // 2. 產生 HashData (SHA256)
        const hashData = generateTradeSha(encryptedPostData);

        // 3. 發送請求
        const closeUrl = getCloseUrl();
        console.log('=== Refund Request ===');
        console.log('URL:', closeUrl);
        console.log('MerchantOrderNo:', params.merchantOrderNo);
        console.log('TradeNo:', params.tradeNo);
        console.log('Amount:', params.amount);

        const formData = new URLSearchParams();
        formData.append('MerchantID_', MERCHANT_ID);
        formData.append('PostData_', encryptedPostData);
        formData.append('HashData_', hashData);

        const response = await fetch(closeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const responseText = await response.text();
        console.log('=== Refund Response ===');
        console.log('Raw Response:', responseText);

        // 4. 解析回應
        let result: RefundApiResponse;
        try {
            result = JSON.parse(responseText);
        } catch {
            console.error('Failed to parse refund response');
            return {
                success: false,
                status: 'PARSE_ERROR',
                message: '無法解析退款回應',
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
        console.error('Refund request error:', error);
        return {
            success: false,
            status: 'REQUEST_ERROR',
            message: error instanceof Error ? error.message : '退款請求失敗',
        };
    }
}
