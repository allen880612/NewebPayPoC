# NewebPay PoC

[English](#english) | **中文**

---

## 中文

藍新金流 (NewebPay) 支付整合概念驗證專案，使用 Next.js 15 + Material UI v7 建構。

### 功能特色

- **MPG 跳轉式付款** - 信用卡一次付清
- **AES-256-CBC 加解密** - 符合藍新金流規格
- **SHA256 簽章驗證** - 確保交易安全
- **Webhook 回調處理** - NotifyURL 接收付款通知
- **交易查詢** - 查詢訂單狀態
- **請款/退款** - 支援手動請款與退款操作
- **訂單管理介面** - 管理歷史訂單

### 快速開始

```bash
# 安裝依賴
npm install

# 設定環境變數
cp env.example .env.local
# 編輯 .env.local 填入藍新金流商店資訊

# 啟動開發伺服器
npm run dev
```

### 環境變數

```env
NEWEBPAY_MERCHANT_ID=     # 商店代號
NEWEBPAY_HASH_KEY=        # 32 字元金鑰
NEWEBPAY_HASH_IV=         # 16 字元向量
NEXT_PUBLIC_BASE_URL=     # 公開 URL (本地測試用 ngrok)
NEWEBPAY_AUTO_CAPTURE=    # 自動請款 (true/false)
```

### 本地測試

使用 ngrok 建立公開通道以接收藍新金流回調：

```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
# 將 ngrok URL 更新至 .env.local 的 NEXT_PUBLIC_BASE_URL
```

### 測試頁面

- 付款測試：`http://localhost:3000/poc/newebpay`
- 退款管理：`http://localhost:3000/poc/refund`

### 測試卡號

| 卡號 | 有效期 | CVV |
|------|--------|-----|
| 4000-2211-1111-1111 | 任意未來日期 | 222 |

---

<a id="english"></a>
## English

NewebPay payment integration Proof of Concept built with Next.js 15 + Material UI v7.

### Features

- **MPG Redirect Payment** - Credit card one-time payment
- **AES-256-CBC Encryption** - NewebPay compliant
- **SHA256 Signature Verification** - Secure transactions
- **Webhook Handler** - NotifyURL payment notifications
- **Transaction Query** - Order status lookup
- **Capture/Refund** - Manual capture and refund operations
- **Order Management UI** - Manage order history

### Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp env.example .env.local
# Edit .env.local with your NewebPay credentials

# Start dev server
npm run dev
```

### Environment Variables

```env
NEWEBPAY_MERCHANT_ID=     # Merchant ID
NEWEBPAY_HASH_KEY=        # 32-character key
NEWEBPAY_HASH_IV=         # 16-character IV
NEXT_PUBLIC_BASE_URL=     # Public URL (use ngrok for local)
NEWEBPAY_AUTO_CAPTURE=    # Auto capture (true/false)
```

### Local Testing

Use ngrok to expose your local server for NewebPay callbacks:

```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
# Update NEXT_PUBLIC_BASE_URL in .env.local with ngrok URL
```

### Test Pages

- Payment test: `http://localhost:3000/poc/newebpay`
- Refund management: `http://localhost:3000/poc/refund`

### Test Card

| Card Number | Expiry | CVV |
|-------------|--------|-----|
| 4000-2211-1111-1111 | Any future date | 222 |

---

## License

MIT
