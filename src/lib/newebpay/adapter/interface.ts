/**
 * Payment Adapter Interface
 * 定義統一的支付操作介面，讓 PoC 和 SDK 實作可以互換
 */

import type { CaptureParams, RefundParams, QueryParams } from '../types';
import type { CloseResult } from '../close';
import type { QueryResult } from '../types';

/**
 * 支付操作 Adapter 介面
 */
export interface PaymentAdapter {
    /**
     * 請款 (Close API CloseType=1)
     */
    capture(params: CaptureParams): Promise<CloseResult>;

    /**
     * 退款 (Close API CloseType=2)
     */
    refund(params: RefundParams): Promise<CloseResult>;

    /**
     * 查詢交易狀態
     */
    query(params: QueryParams): Promise<QueryResult>;

    /**
     * 取得 Adapter 名稱（用於 logging）
     */
    getName(): string;
}
