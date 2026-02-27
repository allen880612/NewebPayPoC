import { NextResponse } from 'next/server';
import { getAdapter } from '@/lib/newebpay/adapter';
import { executeBatchRefund } from '@/lib/newebpay/batch-refund';

// POST /api/payment/batch-refund - 觸發批次退款處理
export async function POST() {
    try {
        console.log('=== Batch Refund Triggered ===');

        const adapter = getAdapter();
        const result = await executeBatchRefund(adapter);

        console.log('=== Batch Refund Complete ===');
        console.log(`Total: ${result.total}, Completed: ${result.completed}, Skipped: ${result.skipped}, Failed: ${result.failed}`);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Batch refund API error:', error);
        return NextResponse.json(
            { success: false, message: '批次退款處理失敗' },
            { status: 500 }
        );
    }
}
