import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/newebpay/adapter';

interface SmartRefundRequestBody {
    merchantOrderNo: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: SmartRefundRequestBody = await request.json();
        const { merchantOrderNo } = body;

        if (!merchantOrderNo) {
            return NextResponse.json(
                { success: false, message: '缺少必要參數 (merchantOrderNo)' },
                { status: 400 }
            );
        }

        console.log('=== Smart Refund Request ===');
        console.log('MerchantOrderNo:', merchantOrderNo);

        const adapter = getAdapter();
        const result = await adapter.smartRefund(merchantOrderNo);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Smart refund API error:', error);
        return NextResponse.json(
            { success: false, message: '智慧退款處理失敗' },
            { status: 500 }
        );
    }
}
