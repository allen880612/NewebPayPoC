import { NextRequest, NextResponse } from 'next/server';
import { verifyTradeSha, decryptTradeInfo } from '@/lib/newebpay/crypto';
import { addOrder } from '@/lib/orders';
import { getAdapter } from '@/lib/newebpay/adapter';
import type { DecryptedTradeResult, StoredOrder } from '@/lib/newebpay/types';

export async function POST(request: NextRequest) {
    try {
        // 解析 form-urlencoded 資料
        const formData = await request.formData();

        const status = formData.get('Status') as string;
        const merchantId = formData.get('MerchantID') as string;
        const tradeInfo = formData.get('TradeInfo') as string;
        const tradeSha = formData.get('TradeSha') as string;

        console.log('=== Webhook Received ===');
        console.log('Status:', status);
        console.log('MerchantID:', merchantId);
        console.log('TradeSha:', tradeSha);

        // 1. 驗證 TradeSha
        const isValid = verifyTradeSha(tradeInfo, tradeSha);
        if (!isValid) {
            console.error('❌ TradeSha verification failed!');
            // 仍然回傳 200，避免藍新重試，但記錄錯誤
            return new NextResponse('OK', { status: 200 });
        }
        console.log('✅ TradeSha verified');

        // 2. 解密 TradeInfo
        const decryptedString = decryptTradeInfo(tradeInfo);
        // 藍新有時回傳的 JSON 可能包含控制字符，建議處理一下，但在此 PoC 先直接解析
        // Note: 實際開發中可能需要 decodeURIComponent 或處理 padding
        const decryptedData: DecryptedTradeResult = JSON.parse(decryptedString);

        console.log('=== Decrypted Result ===');
        console.log('Status:', decryptedData.Status);
        console.log('Message:', decryptedData.Message);

        if (decryptedData.Status === 'SUCCESS') {
            const result = decryptedData.Result;
            console.log('✅ Payment Success!');
            console.log('TradeNo:', result.TradeNo);
            console.log('MerchantOrderNo:', result.MerchantOrderNo);
            console.log('Amount:', result.Amt);
            console.log('PayTime:', result.PayTime);
            console.log('Card4No:', result.Card4No);
            console.log('AuthCode:', result.Auth);

            // Phase 2: 儲存訂單到 JSON
            const order: StoredOrder = {
                merchantOrderNo: result.MerchantOrderNo,
                tradeNo: result.TradeNo,
                amount: result.Amt,
                itemDesc: `訂單 ${result.MerchantOrderNo}`,
                payTime: result.PayTime,
                status: 'paid',
                card4No: result.Card4No,
            };
            addOrder(order);
            console.log('✅ Order saved to JSON');

            // 條件式自動請款
            const autoCapture = process.env.NEWEBPAY_AUTO_CAPTURE === 'true';
            if (autoCapture) {
                console.log('🔄 Auto capture enabled, requesting capture...');
                const adapter = getAdapter();
                const captureResult = await adapter.capture({
                    tradeNo: result.TradeNo,
                    merchantOrderNo: result.MerchantOrderNo,
                    amount: result.Amt,
                });
                if (captureResult.success) {
                    console.log('✅ Auto capture requested successfully');
                } else {
                    console.error('❌ Auto capture failed:', captureResult.message);
                }
            } else {
                console.log('ℹ️ Auto capture disabled. Use manual capture or NewebPay dashboard.');
            }
        } else {
            console.log('❌ Payment Failed');
            console.log('Error:', decryptedData.Message);
        }

        // 必須回傳 HTTP 200
        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error('Webhook processing error:', error);
        // 即使發生錯誤也回傳 200，避免藍新無限重試
        return new NextResponse('OK', { status: 200 });
    }
}
