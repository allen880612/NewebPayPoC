import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/newebpay/adapter';
import { getOrderByMerchantOrderNo, markOrderAsRefunded } from '@/lib/orders';

interface RefundRequestBody {
    merchantOrderNo: string;
    amount: number;
    // 手動輸入模式可能沒有存在 JSON 中
    manual?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const body: RefundRequestBody = await request.json();
        const { merchantOrderNo, amount, manual } = body;

        // 驗證必要參數
        if (!merchantOrderNo || !amount) {
            return NextResponse.json(
                { success: false, message: '缺少必要參數 (merchantOrderNo, amount)' },
                { status: 400 }
            );
        }

        // 非手動模式時，檢查訂單是否存在且可退款
        if (!manual) {
            const order = getOrderByMerchantOrderNo(merchantOrderNo);

            if (!order) {
                return NextResponse.json(
                    { success: false, message: '找不到此訂單' },
                    { status: 404 }
                );
            }

            if (order.status === 'refunded') {
                return NextResponse.json(
                    { success: false, message: '此訂單已退款' },
                    { status: 400 }
                );
            }

            // 驗證金額
            if (order.amount !== amount) {
                return NextResponse.json(
                    { success: false, message: '退款金額與訂單金額不符' },
                    { status: 400 }
                );
            }
        }

        // 取得 tradeNo（非手動模式從 order 取得，手動模式不支援）
        let tradeNo: string | undefined;
        if (!manual) {
            const order = getOrderByMerchantOrderNo(merchantOrderNo);
            tradeNo = order?.tradeNo;
        }

        console.log('=== Processing Refund ===');
        console.log('MerchantOrderNo:', merchantOrderNo);
        console.log('TradeNo:', tradeNo);
        console.log('Amount:', amount);
        console.log('Manual Mode:', manual);

        // 使用 Adapter 執行退款
        const adapter = getAdapter();
        const result = await adapter.refund({
            merchantOrderNo,
            tradeNo,
            amount,
        });

        // 退款成功時更新訂單狀態
        if (result.success && !manual) {
            markOrderAsRefunded(merchantOrderNo);
            console.log('✅ Order marked as refunded');
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Refund API error:', error);
        return NextResponse.json(
            { success: false, message: '退款處理失敗' },
            { status: 500 }
        );
    }
}
