import { encryptTradeInfo, generateTradeSha } from './crypto';
import { getCloseUrl, NEWEBPAY_CONFIG } from './config';
import type { CaptureParams, CaptureApiResponse, CaptureResult } from './types';

const MERCHANT_ID = process.env.NEWEBPAY_MERCHANT_ID!;

/**
 * 建立請款請求的 PostData（加密前的 URL-encoded 字串）
 */
function buildCapturePostData(params: CaptureParams): string {
    const timeStamp = params.timeStamp || Math.floor(Date.now() / 1000);

    const data = {
        RespondType: 'JSON',
        Version: NEWEBPAY_CONFIG.CLOSE_VERSION,
        Amt: params.amount,
        MerchantOrderNo: params.merchantOrderNo,
        TimeStamp: timeStamp,
        IndexType: 1,                 // 1 = 使用 TradeNo (藍新交易序號)
        TradeNo: params.tradeNo,      // 藍新交易序號
        CloseType: 1,                 // 1 = 請款
    };

    // 轉換為 URL-encoded 字串
    const queryString = Object.entries(data)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');

    return queryString;
}

/**
 * 執行請款 API 請求
 */
export async function requestCapture(params: CaptureParams): Promise<CaptureResult> {
    try {
        // 1. 建立 PostData 並加密
        const postDataString = buildCapturePostData(params);
        const encryptedPostData = encryptTradeInfo(postDataString);

        // 2. 產生 HashData (SHA256)
        const hashData = generateTradeSha(encryptedPostData);

        // 3. 發送請求
        const closeUrl = getCloseUrl();
        console.log('=== Capture Request ===');
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
        console.log('=== Capture Response ===');
        console.log('Raw Response:', responseText);

        // 4. 解析回應
        let result: CaptureApiResponse;
        try {
            result = JSON.parse(responseText);
        } catch {
            console.error('Failed to parse capture response');
            return {
                success: false,
                status: 'PARSE_ERROR',
                message: '無法解析請款回應',
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
        console.error('Capture request error:', error);
        return {
            success: false,
            status: 'REQUEST_ERROR',
            message: error instanceof Error ? error.message : '請款請求失敗',
        };
    }
}
