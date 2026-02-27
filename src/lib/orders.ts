/**
 * Facade 層 - 委託 storage 層處理，保持向下相容
 * 舊的 StoredOrder 介面透過 adapter 轉換到新的 Order + Transaction 模型
 */
import type { StoredOrder } from './newebpay/types';
import {
    getAllOrdersWithTransactions,
    getOrderWithTransaction,
    upsertOrder,
    upsertTransaction,
    updateOrderStatus,
    getTransactionByTradeNo,
} from './storage';
import type { Order, Transaction } from './newebpay/types';

// ============ 向下相容的舊介面 ============

// 將 OrderWithTransaction 轉回 StoredOrder 格式
function toStoredOrder(order: Order, transaction: Transaction | null): StoredOrder {
    return {
        merchantOrderNo: order.merchantOrderNo,
        tradeNo: transaction?.tradeNo || '',
        amount: order.amount,
        itemDesc: order.itemDesc,
        payTime: transaction?.payTime || '',
        status: order.status === 'refunded' ? 'refunded' : 'paid',
        card4No: transaction?.card4No,
        refundedAt: transaction?.refundCompletedAt,
    };
}

// 讀取所有訂單（回傳舊格式）
export function getOrders(): StoredOrder[] {
    const ordersWithTx = getAllOrdersWithTransactions();
    return ordersWithTx.map(o => toStoredOrder(o, o.transaction));
}

// 儲存訂單列表（向下相容 - 不建議使用）
export function saveOrders(_orders: StoredOrder[]): void {
    console.warn('saveOrders() is deprecated. Use storage layer directly.');
}

// 新增一筆訂單（從 StoredOrder 轉換為 Order + Transaction）
export function addOrder(stored: StoredOrder): void {
    const now = new Date().toISOString();
    const paidAt = stored.payTime
        ? new Date(stored.payTime.replace(' ', 'T') + '+08:00').toISOString()
        : now;

    const order: Order = {
        merchantOrderNo: stored.merchantOrderNo,
        itemDesc: stored.itemDesc,
        amount: stored.amount,
        status: stored.status === 'refunded' ? 'refunded' : 'paid',
        createdAt: paidAt,
        updatedAt: now,
        paidAt,
    };
    upsertOrder(order);

    const transaction: Transaction = {
        id: stored.merchantOrderNo,
        merchantOrderNo: stored.merchantOrderNo,
        tradeNo: stored.tradeNo,
        amount: stored.amount,
        status: 'success',
        tradeStatus: stored.status === 'refunded' ? 6 : 1,
        closeStatus: 0,
        backStatus: stored.status === 'refunded' ? 3 : 0,
        card4No: stored.card4No,
        paymentMethod: 'CREDIT',
        payTime: stored.payTime,
        createdAt: paidAt,
        processedAt: paidAt,
        refundRequestedAt: stored.refundedAt,
        refundCompletedAt: stored.refundedAt,
    };
    upsertTransaction(transaction);
}

// 根據訂單編號取得訂單（回傳舊格式）
export function getOrderByMerchantOrderNo(merchantOrderNo: string): StoredOrder | null {
    const owt = getOrderWithTransaction(merchantOrderNo);
    if (!owt) return null;
    return toStoredOrder(owt, owt.transaction);
}

// 根據藍新交易序號取得訂單（回傳舊格式）
export function getOrderByTradeNo(tradeNo: string): StoredOrder | null {
    const tx = getTransactionByTradeNo(tradeNo);
    if (!tx) return null;
    const owt = getOrderWithTransaction(tx.merchantOrderNo);
    if (!owt) return null;
    return toStoredOrder(owt, owt.transaction);
}

// 更新訂單狀態為已退款
export function markOrderAsRefunded(merchantOrderNo: string): boolean {
    return updateOrderStatus(merchantOrderNo, 'refunded');
}

// 取得可退款的訂單（status = 'paid'）
export function getRefundableOrders(): StoredOrder[] {
    const ordersWithTx = getAllOrdersWithTransactions();
    return ordersWithTx
        .filter(o => o.status === 'paid')
        .map(o => toStoredOrder(o, o.transaction));
}
