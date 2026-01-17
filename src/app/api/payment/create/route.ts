import { NextRequest, NextResponse } from 'next/server';
import { encryptTradeInfo, generateTradeSha } from '@/lib/newebpay/crypto';
import { getMpgUrl, NEWEBPAY_CONFIG } from '@/lib/newebpay/config';
import type { CreatePaymentRequest, CreatePaymentResponse } from '@/lib/newebpay/types';

export async function POST(request: NextRequest) {
    try {
        const body: CreatePaymentRequest = await request.json();
        const { orderId, amount, itemDesc, email } = body;

        // 驗證必填欄位
        if (!orderId || !amount || !itemDesc) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        const merchantId = process.env.NEWEBPAY_MERCHANT_ID!;

        if (!merchantId) {
            return NextResponse.json(
                { error: 'Merchant ID is not configured' },
                { status: 500 }
            );
        }

        // 組裝 TradeInfo 參數
        const tradeInfoParams = new URLSearchParams({
            MerchantID: merchantId,
            RespondType: NEWEBPAY_CONFIG.RESPOND_TYPE,
            TimeStamp: String(Math.floor(Date.now() / 1000)),
            Version: NEWEBPAY_CONFIG.VERSION,
            MerchantOrderNo: orderId,
            Amt: String(amount),
            ItemDesc: itemDesc,
            Email: email || '',
            // 啟用信用卡
            CREDIT: '1',
            // 回傳 URL
            NotifyURL: `${baseUrl}/api/payment/notify`,
            ReturnURL: `${baseUrl}/api/payment/return`,
        });

        const tradeInfoString = tradeInfoParams.toString();

        // 加密
        const tradeInfo = encryptTradeInfo(tradeInfoString);
        const tradeSha = generateTradeSha(tradeInfo);

        // Console log for debugging
        console.log('=== Payment Create ===');
        console.log('OrderId:', orderId);
        console.log('Amount:', amount);
        console.log('TradeInfo (raw):', tradeInfoString);
        console.log('TradeInfo (encrypted):', tradeInfo.substring(0, 50) + '...');
        console.log('TradeSha:', tradeSha);

        const response: CreatePaymentResponse = {
            MerchantID: merchantId,
            TradeInfo: tradeInfo,
            TradeSha: tradeSha,
            Version: NEWEBPAY_CONFIG.VERSION,
            PaymentUrl: getMpgUrl(),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Payment create error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
