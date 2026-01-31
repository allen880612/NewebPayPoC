/**
 * 共用 Close API 請求邏輯
 * 用於請款 (CloseType=1) 和退款 (CloseType=2)
 */
import { encryptTradeInfo, generateTradeSha } from './crypto';
import { getCloseUrl, NEWEBPAY_CONFIG } from './config';

const MERCHANT_ID = process.env.NEWEBPAY_MERCHANT_ID!;

// Close API 操作類型
export type CloseType = 1 | 2;  // 1=請款, 2=退款

// 共用請求參數
export interface CloseRequestParams {
    merchantOrderNo: string;
    tradeNo: string;
    amount: number;
    closeType: CloseType;
    timeStamp?: number;
}

// Close API 回應
export interface CloseApiResponse {
    Status: string;
    Message: string;
    Result?: {
        MerchantID: string;
        Amt: number;
        TradeNo: string;
        MerchantOrderNo: string;
    };
}

// 共用結果格式
export interface CloseResult {
    success: boolean;
    status: string;
    message: string;
    tradeNo?: string;
    merchantOrderNo?: string;
    amount?: number;
}

/**
 * 建立 Close API PostData（加密前的 URL-encoded 字串）
 */
function buildClosePostData(params: CloseRequestParams): string {
    const timeStamp = params.timeStamp || Math.floor(Date.now() / 1000);

    const data = {
        RespondType: 'JSON',
        Version: NEWEBPAY_CONFIG.CLOSE_VERSION,
        Amt: params.amount,
        MerchantOrderNo: params.merchantOrderNo,
        TimeStamp: timeStamp,
        IndexType: 1,                   // 1 = 使用 TradeNo
        TradeNo: params.tradeNo,
        CloseType: params.closeType,    // 1=請款, 2=退款
    };

    return Object.entries(data)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');
}

/**
 * 執行 Close API 請求（請款或退款）
 */
export async function executeCloseRequest(
    params: CloseRequestParams,
    operationName: string = params.closeType === 1 ? '請款' : '退款'
): Promise<CloseResult> {
    try {
        // 1. 建立 PostData 並加密
        const postDataString = buildClosePostData(params);
        const encryptedPostData = encryptTradeInfo(postDataString);

        // 2. 產生 HashData (SHA256)
        const hashData = generateTradeSha(encryptedPostData);

        // 3. 發送請求
        const closeUrl = getCloseUrl();
        console.log(`=== ${operationName} Request ===`);
        console.log('URL:', closeUrl);
        console.log('MerchantOrderNo:', params.merchantOrderNo);
        console.log('TradeNo:', params.tradeNo);
        console.log('Amount:', params.amount);
        console.log('CloseType:', params.closeType);

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
        console.log(`=== ${operationName} Response ===`);
        console.log('Raw Response:', responseText);

        // 4. 解析回應
        let result: CloseApiResponse;
        try {
            result = JSON.parse(responseText);
        } catch {
            console.error(`Failed to parse ${operationName} response`);
            return {
                success: false,
                status: 'PARSE_ERROR',
                message: `無法解析${operationName}回應`,
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
        console.error(`${operationName} request error:`, error);
        return {
            success: false,
            status: 'REQUEST_ERROR',
            message: error instanceof Error ? error.message : `${operationName}請求失敗`,
        };
    }
}
