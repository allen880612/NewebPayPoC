import { NextRequest, NextResponse } from 'next/server';
import { queryTradeInfo } from '@/lib/newebpay/query';
import { getOrderByMerchantOrderNo } from '@/lib/orders';

interface QueryRequestBody {
    merchantOrderNo: string;
    amount?: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: QueryRequestBody = await request.json();
        const { merchantOrderNo } = body;
        let { amount } = body;

        if (!merchantOrderNo) {
            return NextResponse.json(
                { success: false, message: '缺少必要參數 (merchantOrderNo)' },
                { status: 400 }
            );
        }

        // 如果沒有傳入 amount，從本地訂單取得
        if (!amount) {
            const order = getOrderByMerchantOrderNo(merchantOrderNo);
            if (!order) {
                return NextResponse.json(
                    { success: false, message: '找不到此訂單，請提供 amount' },
                    { status: 404 }
                );
            }
            amount = order.amount;
        }

        console.log('=== Processing Query ===');
        console.log('MerchantOrderNo:', merchantOrderNo);
        console.log('Amount:', amount);

        const result = await queryTradeInfo({
            merchantOrderNo,
            amount,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Query API error:', error);
        return NextResponse.json(
            { success: false, message: '查詢處理失敗' },
            { status: 500 }
        );
    }
}
