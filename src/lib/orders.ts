import fs from 'fs';
import path from 'path';
import type { StoredOrder } from './newebpay/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// 確保 data 目錄存在
function ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

// 讀取所有訂單
export function getOrders(): StoredOrder[] {
    ensureDataDir();

    if (!fs.existsSync(ORDERS_FILE)) {
        return [];
    }

    try {
        const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
        return JSON.parse(data) as StoredOrder[];
    } catch {
        console.error('Error reading orders file');
        return [];
    }
}

// 儲存訂單列表
export function saveOrders(orders: StoredOrder[]): void {
    ensureDataDir();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

// 新增一筆訂單
export function addOrder(order: StoredOrder): void {
    const orders = getOrders();

    // 檢查是否已存在（避免重複）
    const existingIndex = orders.findIndex(
        o => o.merchantOrderNo === order.merchantOrderNo
    );

    if (existingIndex >= 0) {
        // 更新既有訂單
        orders[existingIndex] = order;
    } else {
        // 新增訂單
        orders.push(order);
    }

    saveOrders(orders);
}

// 根據訂單編號取得訂單
export function getOrderByMerchantOrderNo(merchantOrderNo: string): StoredOrder | null {
    const orders = getOrders();
    return orders.find(o => o.merchantOrderNo === merchantOrderNo) || null;
}

// 根據藍新交易序號取得訂單
export function getOrderByTradeNo(tradeNo: string): StoredOrder | null {
    const orders = getOrders();
    return orders.find(o => o.tradeNo === tradeNo) || null;
}

// 更新訂單狀態為已退款
export function markOrderAsRefunded(merchantOrderNo: string): boolean {
    const orders = getOrders();
    const order = orders.find(o => o.merchantOrderNo === merchantOrderNo);

    if (!order) {
        return false;
    }

    order.status = 'refunded';
    order.refundedAt = new Date().toISOString();
    saveOrders(orders);
    return true;
}

// 取得可退款的訂單（status = 'paid'）
export function getRefundableOrders(): StoredOrder[] {
    const orders = getOrders();
    return orders.filter(o => o.status === 'paid');
}
