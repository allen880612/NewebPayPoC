/**
 * PoC Adapter - 使用現有的 PoC 實作
 */
import type { PaymentAdapter } from './interface';
import type { CaptureParams, RefundParams, QueryParams } from '../types';
import type { CloseResult } from '../close';
import type { QueryResult } from '../types';
import type { CancelAuthParams } from '../cancel';
import type { SmartRefundResult } from '../smart-refund';
import { executeCloseRequest } from '../close';
import { executeCancelAuth } from '../cancel';
import { executeSmartRefund } from '../smart-refund';
import { queryTradeInfo } from '../query';

export class PocAdapter implements PaymentAdapter {
    getName(): string {
        return 'PoC';
    }

    async capture(params: CaptureParams): Promise<CloseResult> {
        console.log(`[${this.getName()}] Capture request`);
        return executeCloseRequest({
            merchantOrderNo: params.merchantOrderNo,
            tradeNo: params.tradeNo,
            amount: params.amount,
            closeType: 1,  // 請款
            timeStamp: params.timeStamp,
        }, '請款');
    }

    async refund(params: RefundParams): Promise<CloseResult> {
        console.log(`[${this.getName()}] Refund request`);
        return executeCloseRequest({
            merchantOrderNo: params.merchantOrderNo,
            tradeNo: params.tradeNo || '',
            amount: params.amount,
            closeType: 2,  // 退款
            timeStamp: params.timeStamp,
        }, '退款');
    }

    async cancelAuth(params: CancelAuthParams): Promise<CloseResult> {
        console.log(`[${this.getName()}] Cancel auth request`);
        return executeCancelAuth(params);
    }

    async cancelCapture(params: CancelAuthParams): Promise<CloseResult> {
        console.log(`[${this.getName()}] Cancel capture request (B033)`);
        return executeCloseRequest({
            merchantOrderNo: params.merchantOrderNo,
            tradeNo: params.tradeNo,
            amount: params.amount,
            closeType: 1,
            cancel: 1,
        }, '取消請款');
    }

    async smartRefund(merchantOrderNo: string): Promise<SmartRefundResult> {
        console.log(`[${this.getName()}] Smart refund request`);
        return executeSmartRefund(this, merchantOrderNo);
    }

    async query(params: QueryParams): Promise<QueryResult> {
        console.log(`[${this.getName()}] Query request`);
        return queryTradeInfo(params);
    }
}
