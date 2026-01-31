/**
 * PoC Adapter - 使用現有的 PoC 實作
 */
import type { PaymentAdapter } from './interface';
import type { CaptureParams, RefundParams, QueryParams } from '../types';
import type { CloseResult } from '../close';
import type { QueryResult } from '../types';
import { executeCloseRequest } from '../close';
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

    async query(params: QueryParams): Promise<QueryResult> {
        console.log(`[${this.getName()}] Query request`);
        return queryTradeInfo(params);
    }
}
