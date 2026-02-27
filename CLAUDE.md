# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **NewebPay (藍新金流) payment integration PoC** built with Next.js 15 and **Material UI v7**. It implements MPG (Multi-Payment Gateway) redirect-based credit card payments for the Taiwan payment processor NewebPay, including capture and refund operations.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: Material UI v7 with Emotion
- **Language**: TypeScript
- **Styling**: MUI Theme + CSS

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

## Architecture

### Payment Flow

1. User clicks "立即購買" → Frontend calls `POST /api/payment/create`
2. Backend encrypts TradeInfo (AES-256-CBC) and generates TradeSha (SHA256)
3. Frontend submits hidden form POST to NewebPay MPG gateway
4. User completes payment on NewebPay's hosted page
5. NewebPay sends webhook to `POST /api/payment/notify` (NotifyURL)
6. NewebPay redirects user to `POST /api/payment/return` → `/payment/result` (ReturnURL)

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── orders/route.ts        # Order CRUD operations
│   │   └── payment/
│   │       ├── create/route.ts    # Generate encrypted payment data
│   │       ├── notify/route.ts    # Webhook receiver (verify & decrypt)
│   │       ├── return/route.ts    # User return handler
│   │       ├── query/route.ts     # Transaction query API
│   │       ├── capture/route.ts      # Manual capture (請款)
│   │       ├── refund/route.ts       # Refund processing (退款)
│   │       ├── smart-refund/route.ts # Smart Refund API
│   │       ├── batch-refund/route.ts # Batch Refund API
│   │       └── refund-request/route.ts # Add to refund queue
│   ├── payment/result/            # Payment result page
│   └── poc/
│       ├── newebpay/              # Payment test page
│       └── refund/                # Refund management page
├── components/
│   ├── payment/
│   │   ├── PaymentForm.tsx        # Hidden form for MPG submission
│   │   └── PaymentResultDialog.tsx
│   └── refund/
│       ├── OrderList.tsx               # Order list with actions
│       ├── ManualRefundForm.tsx        # Manual refund form
│       ├── RefundResultDialog.tsx      # Refund result dialog
│       ├── SmartRefundResultDialog.tsx # Smart refund result dialog
│       └── BatchRefundPanel.tsx        # Batch refund queue panel
└── lib/
    ├── theme.ts                   # MUI theme configuration
    ├── orders.ts                  # Order storage facade
    ├── refund-queue.ts            # Refund queue (JSON file persistence)
    ├── storage/                   # Storage layer
    │   ├── index.ts               # Storage facade
    │   ├── orders.ts              # Order CRUD
    │   ├── transactions.ts        # Transaction CRUD
    │   └── migrate.ts             # Auto migration from old format
    └── newebpay/
        ├── crypto.ts              # AES encryption/decryption, SHA256
        ├── config.ts              # MPG URLs, API version, test card
        ├── types.ts               # TypeScript interfaces
        ├── query.ts               # Transaction query
        ├── capture.ts             # Capture (請款) logic
        ├── refund.ts              # Refund (退款) logic
        ├── close.ts               # Shared Close API logic
        ├── cancel.ts              # Cancel API (取消授權)
        ├── smart-refund.ts        # Smart Refund engine (決策矩陣 + 執行)
        ├── batch-refund.ts        # Batch Refund processor
        ├── adapter/               # SDK adapter pattern
        │   ├── interface.ts       # Adapter interface
        │   ├── poc.ts             # Native PoC implementation
        │   └── sdk.ts             # SDK-based implementation
        └── sdk/                   # Internal fork of newebpay-mpg-sdk (MIT)
            ├── index.ts           # Export entry with license notice
            ├── newebpay.client.ts # Main client (bug-fixed)
            └── interfaces/        # Type definitions
```

### Crypto Module (`src/lib/newebpay/crypto.ts`)

- `encryptTradeInfo()`: AES-256-CBC encrypt payment params
- `generateTradeSha()`: SHA256 signature with `HashKey=${KEY}&{encrypted}&HashIV=${IV}`
- `decryptTradeInfo()`: Decrypt webhook response (manual PKCS7 unpadding)
- `verifyTradeSha()`: Validate webhook signature

### Environment Variables

Required in `.env.local`:
```
NEWEBPAY_MERCHANT_ID=     # Merchant ID from NewebPay
NEWEBPAY_HASH_KEY=        # 32-character key
NEWEBPAY_HASH_IV=         # 16-character IV
NEXT_PUBLIC_BASE_URL=     # Public URL (use ngrok for local testing)
NEWEBPAY_AUTO_CAPTURE=    # Auto capture flag (true/false)
NEWEBPAY_USE_SDK=         # Use SDK adapter (true/false)
NEWEBPAY_SMART_REFUND=    # Enable smart refund engine (server-side)
NEXT_PUBLIC_SMART_REFUND= # Enable smart refund UI (client-side)
```

### Smart Refund Decision Matrix

| CloseStatus | BackStatus | Action | Description |
|:-----------:|:----------:|--------|-------------|
| 0 | 0 | `cancel_auth` | Cancel API (B01) — 取消授權，不扣款 |
| 1 | 0 | `cancel_capture` | B033 取消請款 → B01 取消授權（兩步） |
| 2 | 0 | `standard_refund` | Close API B032 — 退款與請款平行排隊 |
| 3 | 0 | `standard_refund` | Close API B032 — 標準退款 |
| * | 1 | `refund_pending` | 等待 21:00 批次處理 |
| * | 2 | `refund_processing` | 等待銀行回檔 |
| * | 3 | `already_refunded` | 已完成退款 |

Key constraints:
- Cancel API (B01): **CS=0 only** — 一旦請款就無法取消授權
- B033 取消請款: **CS=1 only** — CS=2 後不可取消（21:00 分水嶺）
- B032 退款: **CS=2 or CS=3** — CS=2 時退款與請款在銀行端平行處理

## NewebPay Integration Notes

- **Test MPG URL**: `https://ccore.newebpay.com/MPG/mpg_gateway`
- **Production MPG URL**: `https://core.newebpay.com/MPG/mpg_gateway`
- **Test Card**: 4000-2211-1111-1111, any future expiry, CVV: 222
- **API Version**: 2.0
- Webhook must always return HTTP 200 (even on errors) to prevent retries
- TradeSha verification is critical for security

## UI Framework

Material UI v7 with custom theme in `src/lib/theme.ts`:
- Primary: `#2563eb` (Blue)
- Success: `#22c55e` (Green)
- Error: `#ef4444` (Red)
- Border radius: 12px for cards, 8px for buttons

Key components: `Stepper`, `Card`, `Button`, `Chip`, `Dialog`, `Alert`, `Table`

## Local Testing with ngrok

```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start ngrok tunnel
ngrok http 3000

# Update NEXT_PUBLIC_BASE_URL in .env.local with ngrok URL
```

Test pages:
- Payment: `http://localhost:3000/poc/newebpay`
- Refund: `http://localhost:3000/poc/refund`
