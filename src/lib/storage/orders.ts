import fs from 'fs';
import path from 'path';
import type { Order } from '../newebpay/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

function ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

// 讀取所有 Orders
export function getAllOrders(): Order[] {
    ensureDataDir();

    if (!fs.existsSync(ORDERS_FILE)) {
        return [];
    }

    try {
        const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
        return JSON.parse(data) as Order[];
    } catch {
        console.error('Error reading orders file');
        return [];
    }
}

// 儲存所有 Orders
export function saveAllOrders(orders: Order[]): void {
    ensureDataDir();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

// 新增或更新 Order
export function upsertOrder(order: Order): void {
    const orders = getAllOrders();
    const existingIndex = orders.findIndex(
        o => o.merchantOrderNo === order.merchantOrderNo
    );

    if (existingIndex >= 0) {
        orders[existingIndex] = order;
    } else {
        orders.push(order);
    }

    saveAllOrders(orders);
}

// 根據 merchantOrderNo 取得 Order
export function getOrderByMerchantOrderNo(merchantOrderNo: string): Order | null {
    const orders = getAllOrders();
    return orders.find(o => o.merchantOrderNo === merchantOrderNo) || null;
}

// 更新 Order 狀態
export function updateOrderStatus(merchantOrderNo: string, status: Order['status']): boolean {
    const orders = getAllOrders();
    const order = orders.find(o => o.merchantOrderNo === merchantOrderNo);

    if (!order) {
        return false;
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    saveAllOrders(orders);
    return true;
}
