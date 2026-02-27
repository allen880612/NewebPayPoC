import { NextRequest, NextResponse } from 'next/server';
import {
    addRefundRequest,
    getAllRefundRequests,
    getRefundRequestByOrderNo,
} from '@/lib/refund-queue';
import { getOrderWithTransaction } from '@/lib/storage';

interface RefundRequestBody {
    merchantOrderNo: string;
    tradeNo?: string;
    amount?: number;
}

// POST /api/payment/refund-request - 建立退款請求（加入佇列）
export async function POST(request: NextRequest) {
    try {
        const body: RefundRequestBody = await request.json();
        const { merchantOrderNo } = body;

        if (!merchantOrderNo) {
            return NextResponse.json(
                { success: false, message: '缺少必要參數 (merchantOrderNo)' },
                { status: 400 }
            );
        }

        // 取得訂單資料
        const orderWithTx = getOrderWithTransaction(merchantOrderNo);
        if (!orderWithTx) {
            return NextResponse.json(
                { success: false, message: '找不到此訂單' },
                { status: 404 }
            );
        }

        if (orderWithTx.status !== 'paid') {
            return NextResponse.json(
                { success: false, message: `訂單狀態不允許退款 (${orderWithTx.status})` },
                { status: 400 }
            );
        }

        const tradeNo = body.tradeNo || orderWithTx.transaction?.tradeNo || '';
        const amount = body.amount || orderWithTx.amount;

        const refundRequest = addRefundRequest({
            merchantOrderNo,
            tradeNo,
            amount,
        });

        return NextResponse.json({
            success: true,
            message: '退款請求已加入佇列',
            request: refundRequest,
        });
    } catch (error) {
        console.error('Refund request API error:', error);
        return NextResponse.json(
            { success: false, message: '建立退款請求失敗' },
            { status: 500 }
        );
    }
}

// GET /api/payment/refund-request - 查詢退款佇列
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const merchantOrderNo = searchParams.get('merchantOrderNo');

    try {
        if (merchantOrderNo) {
            const refundRequest = getRefundRequestByOrderNo(merchantOrderNo);
            return NextResponse.json({
                success: true,
                request: refundRequest,
            });
        }

        const requests = getAllRefundRequests();

        // 按請求時間倒序
        requests.sort((a, b) =>
            new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        );

        return NextResponse.json({
            success: true,
            requests,
            total: requests.length,
            pending: requests.filter(r => r.status === 'pending').length,
            processing: requests.filter(r => r.status === 'processing').length,
            completed: requests.filter(r => r.status === 'completed').length,
            failed: requests.filter(r => r.status === 'failed').length,
        });
    } catch (error) {
        console.error('Refund request query error:', error);
        return NextResponse.json(
            { success: false, message: '查詢退款佇列失敗' },
            { status: 500 }
        );
    }
}
