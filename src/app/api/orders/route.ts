import { NextResponse } from 'next/server';
import { getOrders, getRefundableOrders } from '@/lib/orders';

// GET /api/orders - 取得訂單列表
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');

    try {
        let orders;

        if (filter === 'refundable') {
            // 只取得可退款的訂單（status = 'paid'）
            orders = getRefundableOrders();
        } else {
            // 取得所有訂單
            orders = getOrders();
        }

        // 按付款時間倒序排列（最新的在前面）
        orders.sort((a, b) => {
            return new Date(b.payTime).getTime() - new Date(a.payTime).getTime();
        });

        return NextResponse.json({
            success: true,
            orders,
            total: orders.length,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json(
            { success: false, message: '取得訂單列表失敗' },
            { status: 500 }
        );
    }
}
