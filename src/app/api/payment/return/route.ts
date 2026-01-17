import { NextRequest, NextResponse } from 'next/server';
import { verifyTradeSha, decryptTradeInfo } from '@/lib/newebpay/crypto';
import type { DecryptedTradeResult } from '@/lib/newebpay/types';

export async function POST(request: NextRequest) {
    try {
        // 藍新 ReturnURL 為 Form POST
        const formData = await request.formData();

        const status = formData.get('Status') as string;
        const tradeInfo = formData.get('TradeInfo') as string;
        const tradeSha = formData.get('TradeSha') as string;

        console.log('=== ReturnURL Received ===');
        console.log('Status:', status);

        // 1. 驗證
        if (!verifyTradeSha(tradeInfo, tradeSha)) {
            console.error('❌ CheckCode verification failed');
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.url;
            return NextResponse.redirect(
                new URL(`/payment/result?status=ERROR&message=CheckCodeFailed`, baseUrl)
            );
        }

        // 2. 解密
        const decryptedString = decryptTradeInfo(tradeInfo);
        // 這裡通常要處理 padding，但簡單 parse 大多可行
        // Safe parse
        let decryptedData: DecryptedTradeResult;
        try {
            decryptedData = JSON.parse(decryptedString);
        } catch (e) {
            // 如果 JSON parse 失敗 (可能會有 padding characters or control chars)
            // 嘗試 clean string (remove last non-printable chars provided they are padding)
            // 在 nodejs crypto final('utf8') 應該已經處理了 pkcs7 padding unless raw data problem.
            // Let's assume standard flow first.
            console.error('JSON Parse error', e);
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.url;
            return NextResponse.redirect(
                new URL(`/payment/result?status=ERROR&message=JSONParseFailed`, baseUrl)
            );
        }

        console.log('=== Decrypted Return Data ===');
        console.log('Message:', decryptedData.Message);

        // 3. 準備 Redirect 參數
        const params = new URLSearchParams();
        params.set('Status', decryptedData.Status);
        params.set('Message', decryptedData.Message);

        // 如果有詳細結果
        if (decryptedData.Result) {
            params.set('TradeNo', decryptedData.Result.TradeNo || '');
            params.set('Amt', String(decryptedData.Result.Amt || ''));
            params.set('Card4No', decryptedData.Result.Card4No || '');
            // 
        }

        // 轉導回前端頁面
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.url;
        const redirectUrl = new URL(`/payment/result?${params.toString()}`, baseUrl);
        console.log('Redirecting to:', redirectUrl.toString());

        // 303 See Other 適合 POST 後轉 GET
        return NextResponse.redirect(redirectUrl, 303);

    } catch (error) {
        console.error('ReturnURL processing error:', error);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.url;
        return NextResponse.redirect(
            new URL(`/payment/result?status=EXCEPTION&message=ServerProcessingError`, baseUrl)
        );
    }
}
