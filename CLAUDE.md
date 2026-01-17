# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **NewebPay (藍新金流) payment integration PoC** built with Next.js 16 and **Material UI v7**. It implements MPG (Multi-Payment Gateway) redirect-based credit card payments for the Taiwan payment processor NewebPay.

## UI Framework

The project uses **Material UI v7** for the user interface:

### MUI Dependencies
- `@mui/material` v7.0.0 - Core components
- `@mui/icons-material` v7.0.1 - Material icons
- `@mui/material-nextjs` v7.0.0 - Next.js App Router integration
- `@emotion/react` & `@emotion/styled` - Styling engine

### Theme Configuration
Custom theme defined in `src/lib/theme.ts`:
- Primary: `#2563eb` (Blue)
- Success: `#22c55e` (Green)
- Error: `#ef4444` (Red)
- Border radius: 12px for cards, 8px for buttons

### Key MUI Components Used
- `Stepper` - Checkout flow progress
- `Card` / `CardContent` - Product and form containers
- `Button` - Primary, secondary, and success variants
- `Chip` - Discount tags
- `Dialog` - Payment result modal
- `Alert` - Error messages
- `CircularProgress` - Loading states
- `Typography` - Text styling

## Commands

```bash
# Development
npm run dev          # Start dev server at http://localhost:3000

# Build & Production
npm run build        # Build for production
npm start            # Start production server

# Lint
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

### Key Directories

```
src/
├── app/
│   ├── api/payment/
│   │   ├── create/route.ts    # Generate encrypted payment data
│   │   ├── notify/route.ts    # Webhook receiver (verify & decrypt)
│   │   └── return/route.ts    # User return handler
│   ├── payment/result/        # Payment result page with MUI Dialog
│   └── poc/newebpay/          # PoC test page with MUI components
├── components/payment/
│   ├── PaymentForm.tsx        # Hidden form with MUI Button
│   └── PaymentResultDialog.tsx # MUI Dialog for payment result
└── lib/
    ├── theme.ts               # MUI theme configuration
    └── newebpay/
        ├── crypto.ts          # AES encryption/decryption, SHA256
        ├── config.ts          # MPG URLs, API version, test card info
        └── types.ts           # TypeScript interfaces
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
```

## NewebPay Integration Notes

- **Test MPG URL**: `https://ccore.newebpay.com/MPG/mpg_gateway`
- **Production MPG URL**: `https://core.newebpay.com/MPG/mpg_gateway`
- **Test Card**: 4000-2211-1111-1111, any future expiry, CVV: 222
- **API Version**: 2.0
- Webhook must always return HTTP 200 (even on errors) to prevent retries
- TradeSha verification is critical for security
- Amount returned must match original order amount

## Local Testing with ngrok

```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start ngrok tunnel
ngrok http 3000

# Update NEXT_PUBLIC_BASE_URL in .env.local with ngrok URL
# Restart dev server to pick up env changes
```

Test page: `http://localhost:3000/poc/newebpay`
