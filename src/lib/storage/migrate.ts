import fs from 'fs';
import path from 'path';
import type { StoredOrder, Order, Transaction } from '../newebpay/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

/**
 * 偵測舊格式：orders.json 中的物件包含 tradeNo 欄位
 */
function isOldFormat(data: unknown[]): data is StoredOrder[] {
    if (data.length === 0) return false;
    const first = data[0] as Record<string, unknown>;
    // 舊格式有 tradeNo 直接在 order 裡，且沒有 createdAt 欄位
    return 'tradeNo' in first && !('createdAt' in first);
}

/**
 * 將 StoredOrder 轉為 Order
 */
function toOrder(stored: StoredOrder): Order {
    const now = new Date().toISOString();
    // 嘗試將 NewebPay 的 payTime 格式（"2026-01-17 15:00:37"）轉為 ISO
    const paidAt = stored.payTime
        ? new Date(stored.payTime.replace(' ', 'T') + '+08:00').toISOString()
        : undefined;

    let status: Order['status'];
    if (stored.status === 'refunded') {
        status = 'refunded';
    } else {
        status = 'paid';
    }

    return {
        merchantOrderNo: stored.merchantOrderNo,
        itemDesc: stored.itemDesc,
        amount: stored.amount,
        status,
        createdAt: paidAt || now,
        updatedAt: stored.refundedAt || paidAt || now,
        paidAt,
    };
}

/**
 * 將 StoredOrder 轉為 Transaction
 */
function toTransaction(stored: StoredOrder): Transaction {
    const now = new Date().toISOString();
    const payTime = stored.payTime
        ? new Date(stored.payTime.replace(' ', 'T') + '+08:00').toISOString()
        : undefined;

    return {
        id: stored.merchantOrderNo,
        merchantOrderNo: stored.merchantOrderNo,
        tradeNo: stored.tradeNo,
        amount: stored.amount,
        status: 'success',
        // 付款成功的預設值
        tradeStatus: stored.status === 'refunded' ? 6 : 1,
        closeStatus: 0,     // 未知，無法從舊格式推斷
        backStatus: stored.status === 'refunded' ? 3 : 0,
        card4No: stored.card4No,
        paymentMethod: 'CREDIT',
        payTime: stored.payTime,
        createdAt: payTime || now,
        processedAt: payTime || now,
        refundRequestedAt: stored.refundedAt,
        refundCompletedAt: stored.refundedAt,
    };
}

/**
 * 自動遷移：偵測舊格式 → 備份 → 拆分為 orders.json + transactions.json
 * 回傳 true 表示有執行遷移
 */
export function migrateIfNeeded(): boolean {
    if (!fs.existsSync(ORDERS_FILE)) {
        return false;
    }

    // 如果 transactions.json 已存在，表示已遷移過
    if (fs.existsSync(TRANSACTIONS_FILE)) {
        return false;
    }

    try {
        const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
        const data = JSON.parse(raw) as unknown[];

        if (!isOldFormat(data)) {
            return false;
        }

        console.log(`🔄 Migrating ${data.length} orders from old format...`);

        // 備份舊檔案
        const backupFile = ORDERS_FILE + '.bak';
        fs.copyFileSync(ORDERS_FILE, backupFile);
        console.log(`📦 Backup created: ${backupFile}`);

        // 轉換
        const orders: Order[] = data.map(toOrder);
        const transactions: Transaction[] = data.map(toTransaction);

        // 寫入新檔案
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), 'utf-8');

        console.log(`✅ Migration complete: ${orders.length} orders, ${transactions.length} transactions`);
        return true;
    } catch (error) {
        console.error('Migration error:', error);
        return false;
    }
}
