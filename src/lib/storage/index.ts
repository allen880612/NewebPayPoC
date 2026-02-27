import type { OrderWithTransaction } from '../newebpay/types';
import { getAllOrders, getOrderByMerchantOrderNo as getOrder } from './orders';
import { getTransactionByMerchantOrderNo } from './transactions';
import { migrateIfNeeded } from './migrate';

// Re-export 個別 storage 操作
export { getAllOrders, saveAllOrders, upsertOrder, getOrderByMerchantOrderNo, updateOrderStatus } from './orders';
export { getAllTransactions, saveAllTransactions, upsertTransaction, getTransactionByMerchantOrderNo, getTransactionByTradeNo, updateTransaction } from './transactions';
export { migrateIfNeeded } from './migrate';

// 確保遷移在首次載入時執行
let migrated = false;
function ensureMigrated(): void {
    if (!migrated) {
        migrateIfNeeded();
        migrated = true;
    }
}

// 取得單一 OrderWithTransaction
export function getOrderWithTransaction(merchantOrderNo: string): OrderWithTransaction | null {
    ensureMigrated();
    const order = getOrder(merchantOrderNo);
    if (!order) return null;

    const transaction = getTransactionByMerchantOrderNo(merchantOrderNo);
    return { ...order, transaction };
}

// 取得所有 OrderWithTransaction
export function getAllOrdersWithTransactions(): OrderWithTransaction[] {
    ensureMigrated();
    const orders = getAllOrders();
    return orders.map(order => {
        const transaction = getTransactionByMerchantOrderNo(order.merchantOrderNo);
        return { ...order, transaction };
    });
}
