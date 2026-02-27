/**
 * 退款佇列 - 儲存待處理的退款請求
 * 儲存位置: data/refund-queue.json
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'refund-queue.json');

export interface RefundRequest {
    id: string;
    merchantOrderNo: string;
    tradeNo: string;
    amount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    retryCount: number;
    maxRetries: number;
    requestedAt: string;
    lastAttemptAt?: string;
    lastError?: string;
    completedAt?: string;
}

function ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

// 讀取所有退款請求
export function getAllRefundRequests(): RefundRequest[] {
    ensureDataDir();

    if (!fs.existsSync(QUEUE_FILE)) {
        return [];
    }

    try {
        const data = fs.readFileSync(QUEUE_FILE, 'utf-8');
        return JSON.parse(data) as RefundRequest[];
    } catch {
        console.error('Error reading refund queue file');
        return [];
    }
}

// 儲存所有退款請求
function saveAllRefundRequests(requests: RefundRequest[]): void {
    ensureDataDir();
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(requests, null, 2), 'utf-8');
}

// 新增退款請求
export function addRefundRequest(params: {
    merchantOrderNo: string;
    tradeNo: string;
    amount: number;
}): RefundRequest {
    const requests = getAllRefundRequests();

    // 檢查是否已有 pending/processing 的請求
    const existing = requests.find(
        r => r.merchantOrderNo === params.merchantOrderNo &&
            (r.status === 'pending' || r.status === 'processing')
    );

    if (existing) {
        return existing;
    }

    const request: RefundRequest = {
        id: `RR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        merchantOrderNo: params.merchantOrderNo,
        tradeNo: params.tradeNo,
        amount: params.amount,
        status: 'pending',
        retryCount: 0,
        maxRetries: 7,
        requestedAt: new Date().toISOString(),
    };

    requests.push(request);
    saveAllRefundRequests(requests);
    return request;
}

// 取得 pending 的退款請求
export function getPendingRequests(): RefundRequest[] {
    return getAllRefundRequests().filter(r => r.status === 'pending');
}

// 更新退款請求
export function updateRefundRequest(id: string, updates: Partial<RefundRequest>): boolean {
    const requests = getAllRefundRequests();
    const request = requests.find(r => r.id === id);

    if (!request) {
        return false;
    }

    Object.assign(request, updates);
    saveAllRefundRequests(requests);
    return true;
}

// 根據 merchantOrderNo 取得退款請求
export function getRefundRequestByOrderNo(merchantOrderNo: string): RefundRequest | null {
    const requests = getAllRefundRequests();
    return requests.find(r => r.merchantOrderNo === merchantOrderNo) || null;
}
