import { NextResponse } from 'next/server';
import { getAllOrdersWithTransactions } from '@/lib/storage';

// GET /api/orders - 取得訂單列表（OrderWithTransaction[] 格式）
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');

    try {
        let orders = getAllOrdersWithTransactions();

        if (filter === 'refundable') {
            orders = orders.filter(o => o.status === 'paid');
        }

        // 按建立時間倒序排列（最新的在前面）
        orders.sort((a, b) => {
            const timeA = a.paidAt || a.createdAt;
            const timeB = b.paidAt || b.createdAt;
            return new Date(timeB).getTime() - new Date(timeA).getTime();
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
