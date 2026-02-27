import fs from 'fs';
import path from 'path';
import type { Transaction } from '../newebpay/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

function ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

// 讀取所有 Transactions
export function getAllTransactions(): Transaction[] {
    ensureDataDir();

    if (!fs.existsSync(TRANSACTIONS_FILE)) {
        return [];
    }

    try {
        const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf-8');
        return JSON.parse(data) as Transaction[];
    } catch {
        console.error('Error reading transactions file');
        return [];
    }
}

// 儲存所有 Transactions
export function saveAllTransactions(transactions: Transaction[]): void {
    ensureDataDir();
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), 'utf-8');
}

// 新增或更新 Transaction
export function upsertTransaction(transaction: Transaction): void {
    const transactions = getAllTransactions();
    const existingIndex = transactions.findIndex(
        t => t.id === transaction.id
    );

    if (existingIndex >= 0) {
        transactions[existingIndex] = transaction;
    } else {
        transactions.push(transaction);
    }

    saveAllTransactions(transactions);
}

// 根據 merchantOrderNo 取得 Transaction
export function getTransactionByMerchantOrderNo(merchantOrderNo: string): Transaction | null {
    const transactions = getAllTransactions();
    return transactions.find(t => t.merchantOrderNo === merchantOrderNo) || null;
}

// 根據 tradeNo 取得 Transaction
export function getTransactionByTradeNo(tradeNo: string): Transaction | null {
    const transactions = getAllTransactions();
    return transactions.find(t => t.tradeNo === tradeNo) || null;
}

// 更新 Transaction 狀態
export function updateTransaction(id: string, updates: Partial<Transaction>): boolean {
    const transactions = getAllTransactions();
    const transaction = transactions.find(t => t.id === id);

    if (!transaction) {
        return false;
    }

    Object.assign(transaction, updates);
    saveAllTransactions(transactions);
    return true;
}
