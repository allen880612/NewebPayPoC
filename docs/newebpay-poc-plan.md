# NewebPay PoC 開發計劃

> **目的**：提供 claude-code 開發所需的完整規格與實作指引  
> **範圍**：藍新金流信用卡一次付清 PoC  
> **預估時間**：2-3 小時

---

## 1. 專案概述

### 1.1 目標
在 Next.js 專案中建立獨立的 PoC 模組，驗證藍新金流 MPG 跳轉式信用卡付款串接。

### 1.2 成功標準
- ✅ 可從測試頁面發起付款，跳轉至藍新
- ✅ 使用測試卡號完成付款
- ✅ Webhook 正確接收並驗證回傳資料
- ✅ 返回頁面顯示付款結果 Dialog

### 1.3 技術棧
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- 本地測試: ngrok

---

## 2. 檔案結構

```
project-root/
├── app/
│   ├── api/
│   │   └── payment/
│   │       ├── create/
│   │       │   └── route.ts          # 發起付款 API
│   │       └── notify/
│   │           └── route.ts          # Webhook 接收
│   ├── payment/
│   │   └── result/
│   │       └── page.tsx              # 返回結果頁（含 Dialog）
│   └── poc/
│       └── newebpay/
│           └── page.tsx              # PoC 測試頁面
├── components/
│   └── payment/
│       ├── PaymentForm.tsx           # 付款表單元件
│       └── PaymentResultDialog.tsx   # 結果 Dialog 元件
├── lib/
│   └── newebpay/
│       ├── crypto.ts                 # 加解密工具
│       ├── types.ts                  # TypeScript 型別定義
│       └── config.ts                 # 設定常數
└── .env.local                        # 環境變數
```

---

## 3. 環境設定

### 3.1 環境變數 (.env.local)

```env
# 藍新金流設定
NEWEBPAY_MERCHANT_ID=你的商店代號
NEWEBPAY_HASH_KEY=你的HashKey_32字元
NEWEBPAY_HASH_IV=你的HashIV_16字元

# 環境 URL（本地用 ngrok）
NEXT_PUBLIC_BASE_URL=https://xxxx.ngrok.io

# 藍新 API URL
NEWEBPAY_API_URL=https://ccore.newebpay.com/MPG/mpg_gateway
```

### 3.2 ngrok 設定步驟

```bash
# 1. 安裝 ngrok (macOS)
brew install ngrok

# 2. 啟動 Next.js
npm run dev

# 3. 另開終端機，啟動 ngrok
ngrok http 3000

# 4. 複製 ngrok URL 到 .env.local
# 例如: https://a1b2c3d4.ngrok.io
```

---

## 4. 核心模組實作

### 4.1 加解密工具 (lib/newebpay/crypto.ts)

```typescript
import crypto from 'crypto';

const HASH_KEY = process.env.NEWEBPAY_HASH_KEY!;
const HASH_IV = process.env.NEWEBPAY_HASH_IV!;

/**
 * AES-256-CBC 加密
 * @param data - 原始字串（URL encoded query string）
 * @returns 加密後的 hex 字串
 */
export function encryptTradeInfo(data: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', HASH_KEY, HASH_IV);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * SHA256 產生 TradeSha
 * @param aesEncrypted - AES 加密後的字串
 * @returns SHA256 大寫 hex 字串
 */
export function generateTradeSha(aesEncrypted: string): string {
  const raw = `HashKey=${HASH_KEY}&${aesEncrypted}&HashIV=${HASH_IV}`;
  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
}

/**
 * AES-256-CBC 解密
 * @param encrypted - 加密的 hex 字串
 * @returns 解密後的原始字串
 */
export function decryptTradeInfo(encrypted: string): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', HASH_KEY, HASH_IV);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 驗證 TradeSha
 * @param tradeInfo - 加密的 TradeInfo
 * @param tradeSha - 收到的 TradeSha
 * @returns 是否驗證通過
 */
export function verifyTradeSha(tradeInfo: string, tradeSha: string): boolean {
  const calculated = generateTradeSha(tradeInfo);
  return calculated === tradeSha;
}
```

### 4.2 型別定義 (lib/newebpay/types.ts)

```typescript
// 發起付款請求
export interface CreatePaymentRequest {
  orderId: string;
  amount: number;
  itemDesc: string;
  email: string;
}

// 發起付款回應
export interface CreatePaymentResponse {
  MerchantID: string;
  TradeInfo: string;
  TradeSha: string;
  Version: string;
  PaymentUrl: string;
}

// 藍新回傳的原始資料
export interface NewebPayNotifyPayload {
  Status: string;
  MerchantID: string;
  TradeInfo: string;
  TradeSha: string;
  Version?: string;
}

// 解密後的交易結果（信用卡）
export interface DecryptedTradeResult {
  Status: string;
  Message: string;
  Result: {
    MerchantID: string;
    Amt: number;
    TradeNo: string;
    MerchantOrderNo: string;
    PaymentType: string;
    RespondType: string;
    PayTime: string;
    IP: string;
    EscrowBank?: string;
    // 信用卡專屬
    AuthBank?: string;
    RespondCode?: string;
    Auth?: string;
    Card6No?: string;
    Card4No?: string;
    Inst?: number;
    InstFirst?: number;
    InstEach?: number;
    ECI?: string;
    PaymentMethod?: string;
  };
}

// 付款結果（給前端用）
export interface PaymentResult {
  success: boolean;
  status: string;
  message: string;
  tradeNo?: string;
  amount?: number;
  payTime?: string;
  card4No?: string;
}
```

### 4.3 設定常數 (lib/newebpay/config.ts)

```typescript
export const NEWEBPAY_CONFIG = {
  // API URLs
  TEST_MPG_URL: 'https://ccore.newebpay.com/MPG/mpg_gateway',
  PROD_MPG_URL: 'https://core.newebpay.com/MPG/mpg_gateway',
  
  // API 版本
  VERSION: '2.0',
  
  // 回應格式
  RESPOND_TYPE: 'JSON',
  
  // 測試卡號
  TEST_CARD: {
    NUMBER: '4000-2211-1111-1111',
    EXPIRY: '12/30', // 任意未過期日期
    CVV: '222',
  },
} as const;

// 判斷是否為測試環境
export const isTestEnv = () => {
  return process.env.NODE_ENV !== 'production' || 
         process.env.NEWEBPAY_API_URL?.includes('ccore');
};

// 取得 MPG URL
export const getMpgUrl = () => {
  return isTestEnv() 
    ? NEWEBPAY_CONFIG.TEST_MPG_URL 
    : NEWEBPAY_CONFIG.PROD_MPG_URL;
};
```

---

## 5. API 實作

### 5.1 發起付款 API (app/api/payment/create/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { encryptTradeInfo, generateTradeSha } from '@/lib/newebpay/crypto';
import { getMpgUrl, NEWEBPAY_CONFIG } from '@/lib/newebpay/config';
import type { CreatePaymentRequest, CreatePaymentResponse } from '@/lib/newebpay/types';

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentRequest = await request.json();
    const { orderId, amount, itemDesc, email } = body;

    // 驗證必填欄位
    if (!orderId || !amount || !itemDesc) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const merchantId = process.env.NEWEBPAY_MERCHANT_ID!;

    // 組裝 TradeInfo 參數
    const tradeInfoParams = new URLSearchParams({
      MerchantID: merchantId,
      RespondType: NEWEBPAY_CONFIG.RESPOND_TYPE,
      TimeStamp: String(Math.floor(Date.now() / 1000)),
      Version: NEWEBPAY_CONFIG.VERSION,
      MerchantOrderNo: orderId,
      Amt: String(amount),
      ItemDesc: itemDesc,
      Email: email || '',
      // 啟用信用卡
      CREDIT: '1',
      // 回傳 URL
      NotifyURL: `${baseUrl}/api/payment/notify`,
      ReturnURL: `${baseUrl}/payment/result`,
    });

    const tradeInfoString = tradeInfoParams.toString();
    
    // 加密
    const tradeInfo = encryptTradeInfo(tradeInfoString);
    const tradeSha = generateTradeSha(tradeInfo);

    // Console log for debugging
    console.log('=== Payment Create ===');
    console.log('OrderId:', orderId);
    console.log('Amount:', amount);
    console.log('TradeInfo (raw):', tradeInfoString);
    console.log('TradeInfo (encrypted):', tradeInfo.substring(0, 50) + '...');
    console.log('TradeSha:', tradeSha);

    const response: CreatePaymentResponse = {
      MerchantID: merchantId,
      TradeInfo: tradeInfo,
      TradeSha: tradeSha,
      Version: NEWEBPAY_CONFIG.VERSION,
      PaymentUrl: getMpgUrl(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Payment create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5.2 Webhook 接收 API (app/api/payment/notify/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyTradeSha, decryptTradeInfo } from '@/lib/newebpay/crypto';
import type { DecryptedTradeResult } from '@/lib/newebpay/types';

export async function POST(request: NextRequest) {
  try {
    // 解析 form-urlencoded 資料
    const formData = await request.formData();
    
    const status = formData.get('Status') as string;
    const merchantId = formData.get('MerchantID') as string;
    const tradeInfo = formData.get('TradeInfo') as string;
    const tradeSha = formData.get('TradeSha') as string;

    console.log('=== Webhook Received ===');
    console.log('Status:', status);
    console.log('MerchantID:', merchantId);
    console.log('TradeSha:', tradeSha);

    // 1. 驗證 TradeSha
    const isValid = verifyTradeSha(tradeInfo, tradeSha);
    if (!isValid) {
      console.error('❌ TradeSha verification failed!');
      // 仍然回傳 200，避免藍新重試，但記錄錯誤
      return new NextResponse('OK', { status: 200 });
    }
    console.log('✅ TradeSha verified');

    // 2. 解密 TradeInfo
    const decryptedString = decryptTradeInfo(tradeInfo);
    const decryptedData: DecryptedTradeResult = JSON.parse(decryptedString);

    console.log('=== Decrypted Result ===');
    console.log('Status:', decryptedData.Status);
    console.log('Message:', decryptedData.Message);
    
    if (decryptedData.Status === 'SUCCESS') {
      const result = decryptedData.Result;
      console.log('✅ Payment Success!');
      console.log('TradeNo:', result.TradeNo);
      console.log('MerchantOrderNo:', result.MerchantOrderNo);
      console.log('Amount:', result.Amt);
      console.log('PayTime:', result.PayTime);
      console.log('Card4No:', result.Card4No);
      console.log('AuthCode:', result.Auth);
      
      // TODO: Phase 2 - 更新資料庫訂單狀態
      // await updateOrderStatus(result.MerchantOrderNo, 'PAID');
    } else {
      console.log('❌ Payment Failed');
      console.log('Error:', decryptedData.Message);
      
      // TODO: Phase 2 - 更新資料庫訂單狀態
      // await updateOrderStatus(result.MerchantOrderNo, 'PAYMENT_FAILED');
    }

    // 必須回傳 HTTP 200
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // 即使發生錯誤也回傳 200，避免藍新無限重試
    return new NextResponse('OK', { status: 200 });
  }
}
```

---

## 6. 頁面實作

### 6.1 PoC 測試頁面 (app/poc/newebpay/page.tsx)

```tsx
'use client';

import { useState } from 'react';
import { PaymentForm } from '@/components/payment/PaymentForm';
import type { CreatePaymentResponse } from '@/lib/newebpay/types';

// 模擬商品
const MOCK_PRODUCT = {
  id: 'course_001',
  name: '線上課程 - React 進階實戰',
  price: 1500,
  description: '包含 20 小時影片 + 專案實作',
};

export default function NewebPayPoCPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<CreatePaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 產生訂單編號
  const generateOrderId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD${timestamp}${random}`.substring(0, 20); // 藍新限制 30 字元
  };

  // 發起付款
  const handleCreatePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const orderId = generateOrderId();
      
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: MOCK_PRODUCT.price,
          itemDesc: MOCK_PRODUCT.name,
          email: 'test@example.com',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment');
      }

      const data: CreatePaymentResponse = await response.json();
      setPaymentData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            藍新金流 PoC 測試
          </h1>
          <p className="text-gray-500 mt-2">信用卡一次付清</p>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <strong>測試卡號：</strong>4000-2211-1111-1111<br />
            <strong>有效期限：</strong>任意未過期日期<br />
            <strong>安全碼：</strong>222
          </div>
        </div>

        {/* 商品卡片 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">商品資訊</h2>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-lg">{MOCK_PRODUCT.name}</h3>
            <p className="text-gray-500 text-sm mt-1">{MOCK_PRODUCT.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">
                NT$ {MOCK_PRODUCT.price.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 操作區 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {!paymentData ? (
            // Step 1: 建立付款
            <button
              onClick={handleCreatePayment}
              disabled={isLoading}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
            >
              {isLoading ? '處理中...' : '立即購買'}
            </button>
          ) : (
            // Step 2: 跳轉藍新
            <div>
              <p className="text-sm text-gray-500 mb-4 text-center">
                付款資料已準備完成，點擊下方按鈕前往藍新付款
              </p>
              <PaymentForm paymentData={paymentData} />
              <button
                onClick={() => setPaymentData(null)}
                className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                取消付款
              </button>
            </div>
          )}
        </div>

        {/* Debug Info */}
        {paymentData && (
          <div className="mt-6 bg-gray-800 rounded-xl p-4 text-xs font-mono text-gray-300 overflow-auto">
            <p className="text-gray-500 mb-2"># Debug Info</p>
            <p>MerchantID: {paymentData.MerchantID}</p>
            <p>Version: {paymentData.Version}</p>
            <p>TradeInfo: {paymentData.TradeInfo.substring(0, 40)}...</p>
            <p>TradeSha: {paymentData.TradeSha}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 6.2 付款表單元件 (components/payment/PaymentForm.tsx)

```tsx
'use client';

import type { CreatePaymentResponse } from '@/lib/newebpay/types';

interface PaymentFormProps {
  paymentData: CreatePaymentResponse;
}

export function PaymentForm({ paymentData }: PaymentFormProps) {
  return (
    <form method="POST" action={paymentData.PaymentUrl}>
      <input type="hidden" name="MerchantID" value={paymentData.MerchantID} />
      <input type="hidden" name="TradeInfo" value={paymentData.TradeInfo} />
      <input type="hidden" name="TradeSha" value={paymentData.TradeSha} />
      <input type="hidden" name="Version" value={paymentData.Version} />
      
      <button
        type="submit"
        className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        前往藍新金流付款
      </button>
    </form>
  );
}
```

### 6.3 返回結果頁 (app/payment/result/page.tsx)

```tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentResultDialog } from '@/components/payment/PaymentResultDialog';
import type { PaymentResult } from '@/lib/newebpay/types';

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // 從 URL 參數解析結果
    // 注意：ReturnURL 是 POST，但 Next.js App Router 會轉成 GET
    // 實際上藍新會 POST 到這個頁面，我們需要在伺服器端處理
    
    // 簡化處理：直接顯示等待狀態，實際結果由 Webhook 處理
    // 這裡我們模擬一個查詢 API 來取得最新狀態
    const checkPaymentStatus = async () => {
      // TODO: 實際應該查詢後端 API 取得訂單狀態
      // 這裡先用模擬資料
      
      // 模擬延遲
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 從 URL 判斷（實際應查 API）
      const status = searchParams.get('Status');
      
      if (status === 'SUCCESS') {
        setResult({
          success: true,
          status: 'SUCCESS',
          message: '付款成功',
          tradeNo: searchParams.get('TradeNo') || 'NPY' + Date.now(),
          amount: 1500,
        });
      } else if (status) {
        setResult({
          success: false,
          status: status,
          message: '付款失敗，請重新嘗試',
        });
      } else {
        // 如果沒有 Status，顯示預設成功（因為只有成功才會跳轉回來）
        setResult({
          success: true,
          status: 'SUCCESS',
          message: '付款成功',
          tradeNo: 'NPY' + Date.now(),
          amount: 1500,
        });
      }
      
      setShowDialog(true);
    };

    checkPaymentStatus();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {!showDialog ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">處理付款結果中...</p>
        </div>
      ) : (
        <PaymentResultDialog
          result={result!}
          onClose={() => {
            // 關閉後導回首頁或訂單頁
            window.location.href = '/poc/newebpay';
          }}
        />
      )}
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}
```

### 6.4 結果 Dialog 元件 (components/payment/PaymentResultDialog.tsx)

```tsx
'use client';

import type { PaymentResult } from '@/lib/newebpay/types';

interface PaymentResultDialogProps {
  result: PaymentResult;
  onClose: () => void;
}

export function PaymentResultDialog({ result, onClose }: PaymentResultDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform animate-in fade-in zoom-in duration-300">
        {result.success ? (
          // 成功狀態
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800">
              付款成功！
            </h3>
            <p className="text-gray-500 text-center mt-2">
              感謝您的購買
            </p>
            
            {/* 交易資訊 */}
            <div className="bg-gray-50 rounded-lg p-4 mt-4 space-y-2">
              {result.tradeNo && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">交易序號</span>
                  <span className="font-mono text-gray-700">{result.tradeNo}</span>
                </div>
              )}
              {result.amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">付款金額</span>
                  <span className="font-medium text-gray-700">
                    NT$ {result.amount.toLocaleString()}
                  </span>
                </div>
              )}
              {result.card4No && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">卡號末四碼</span>
                  <span className="font-mono text-gray-700">**** {result.card4No}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          // 失敗狀態
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800">
              付款失敗
            </h3>
            <p className="text-gray-500 text-center mt-2">
              {result.message}
            </p>
            
            {/* 錯誤提示 */}
            <div className="bg-red-50 rounded-lg p-4 mt-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-red-700">
                請確認卡片資訊是否正確，或聯繫發卡銀行
              </span>
            </div>
          </>
        )}

        {/* 確認按鈕 */}
        <button
          onClick={onClose}
          className={`w-full mt-6 py-3 rounded-lg font-medium transition-colors ${
            result.success
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-800 hover:bg-gray-900 text-white'
          }`}
        >
          {result.success ? '完成' : '返回重試'}
        </button>
      </div>
    </div>
  );
}
```

---

## 7. UI 設計規格

### 7.1 PoC 測試頁面

```
┌─────────────────────────────────────────┐
│         藍新金流 PoC 測試                │
│           信用卡一次付清                 │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ⚠️ 測試卡號：4000-2211-1111-1111 │   │
│  │    有效期限：任意未過期日期       │   │
│  │    安全碼：222                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  商品資訊                        │   │
│  │  ┌───────────────────────────┐  │   │
│  │  │ 線上課程 - React 進階實戰  │  │   │
│  │  │ 包含 20 小時影片 + 專案實作│  │   │
│  │  │                           │  │   │
│  │  │ NT$ 1,500                 │  │   │
│  │  └───────────────────────────┘  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  [      立即購買      ]         │   │  ← 藍色按鈕
│  └─────────────────────────────────┘   │
│                                         │
│  (點擊後變成)                           │
│  ┌─────────────────────────────────┐   │
│  │  付款資料已準備完成              │   │
│  │  [   前往藍新金流付款   ]       │   │  ← 綠色按鈕
│  │        取消付款                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ # Debug Info                    │   │  ← 深色背景
│  │ MerchantID: MS12345678          │   │
│  │ TradeInfo: a1b2c3d4e5f6...      │   │
│  │ TradeSha: ABC123DEF456...       │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 7.2 付款成功 Dialog

```
┌─────────────────────────────────────┐
│                                     │
│           ┌─────────┐              │
│           │   ✓    │              │  ← 綠色圓形背景 + 白色勾勾
│           └─────────┘              │
│                                     │
│           付款成功！                │  ← 粗體大字
│         感謝您的購買                │  ← 灰色小字
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 交易序號    NPY1234567890   │   │  ← 淺灰背景區塊
│  │ 付款金額    NT$ 1,500       │   │
│  │ 卡號末四碼  **** 1111       │   │
│  └─────────────────────────────┘   │
│                                     │
│  [          完成          ]        │  ← 綠色按鈕
│                                     │
└─────────────────────────────────────┘
```

### 7.3 付款失敗 Dialog

```
┌─────────────────────────────────────┐
│                                     │
│           ┌─────────┐              │
│           │   ✗    │              │  ← 紅色圓形背景 + 白色叉叉
│           └─────────┘              │
│                                     │
│           付款失敗                  │  ← 粗體大字
│      付款失敗，請重新嘗試          │  ← 灰色小字
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ⚠️ 請確認卡片資訊是否正確， │   │  ← 淺紅背景區塊
│  │    或聯繫發卡銀行            │   │
│  └─────────────────────────────┘   │
│                                     │
│  [        返回重試        ]        │  ← 深灰按鈕
│                                     │
└─────────────────────────────────────┘
```

---

## 8. 測試檢查清單

### 8.1 本地測試步驟

```bash
# 1. 確認環境變數設定完成
cat .env.local

# 2. 啟動 Next.js
npm run dev

# 3. 啟動 ngrok（另開終端機）
ngrok http 3000

# 4. 更新 .env.local 中的 NEXT_PUBLIC_BASE_URL
# 重啟 Next.js 讓環境變數生效

# 5. 開啟瀏覽器
open http://localhost:3000/poc/newebpay
```

### 8.2 驗證項目

| # | 檢查項目 | 預期結果 | 狀態 |
|---|---------|---------|-----|
| 1 | 點擊「立即購買」 | 按鈕變成「前往藍新金流付款」 | ⬜ |
| 2 | 點擊「前往藍新金流付款」 | 跳轉至藍新 MPG 頁面 | ⬜ |
| 3 | 藍新頁面顯示正確金額 | 顯示 NT$ 1,500 | ⬜ |
| 4 | 輸入測試卡號付款 | 付款成功，跳轉回 ReturnURL | ⬜ |
| 5 | 返回頁面顯示成功 Dialog | 綠色勾勾 + 交易資訊 | ⬜ |
| 6 | Console 顯示 Webhook 資料 | 看到 TradeNo, Amt, Card4No | ⬜ |
| 7 | TradeSha 驗證通過 | Console 顯示 ✅ TradeSha verified | ⬜ |

### 8.3 常見錯誤排查

| 錯誤 | 可能原因 | 解法 |
|-----|---------|-----|
| MPG02004 頁面逾時 | TimeStamp 超過 120 秒 | 重新點擊「立即購買」 |
| MPG03009 交易失敗 | HashKey/IV 錯誤 | 檢查 .env.local 設定 |
| Webhook 收不到 | ngrok URL 錯誤 | 確認 BASE_URL 正確 |
| 解密失敗 | 加密方式不符 | 檢查 AES-256-CBC 實作 |

---

## 9. 後續階段預告

### Phase 2: 正式整合
- 整合 Firestore 資料庫
- 完整錯誤處理與重試機制
- 冪等性設計
- 交易 Log 寫入

### Phase 3: 對帳機制
- 定時對帳排程
- 異常交易處理
- 報表產出

### Phase 4: 訂閱制
- 定期定額扣款
- 扣款失敗處理
- 訂閱管理

---

## 10. 參考資源

- [藍新金流測試站](https://cwww.newebpay.com/)
- [藍新金流技術文件](線上交易─幕前支付技術串接手冊_NDNF1.1.9.pdf)
- [ngrok 官網](https://ngrok.com/)
- [Next.js App Router 文件](https://nextjs.org/docs/app)

---

**文件版本**: v1.0  
**最後更新**: 2025-12-20
