import { NextRequest, NextResponse } from 'next/server';
import { requestCapture } from '@/lib/newebpay/capture';

interface CaptureRequestBody {
    tradeNo: string;
    merchantOrderNo: string;
    amount: number;
}

/**
 * POST /api/payment/capture
 * 手動請款 API
 *
 * Request body:
 * - tradeNo: 藍新交易序號
 * - merchantOrderNo: 商店訂單編號
 * - amount: 請款金額
 */
export async function POST(request: NextRequest) {
    try {
        const body: CaptureRequestBody = await request.json();

        // 驗證必要參數
        if (!body.tradeNo || !body.merchantOrderNo || !body.amount) {
            return NextResponse.json(
                {
                    success: false,
                    message: '缺少必要參數: tradeNo, merchantOrderNo, amount',
                },
                { status: 400 }
            );
        }

        console.log('=== Manual Capture Request ===');
        console.log('TradeNo:', body.tradeNo);
        console.log('MerchantOrderNo:', body.merchantOrderNo);
        console.log('Amount:', body.amount);

        // 呼叫請款 API
        const result = await requestCapture({
            tradeNo: body.tradeNo,
            merchantOrderNo: body.merchantOrderNo,
            amount: body.amount,
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: result.message,
                data: {
                    tradeNo: result.tradeNo,
                    merchantOrderNo: result.merchantOrderNo,
                    amount: result.amount,
                },
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    status: result.status,
                    message: result.message,
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Manual capture error:', error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : '請款失敗',
            },
            { status: 500 }
        );
    }
}
