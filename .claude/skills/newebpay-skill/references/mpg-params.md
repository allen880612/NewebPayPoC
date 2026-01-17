# MPG 交易請求參數規格

## Form POST 參數

| 參數 | 中文名稱 | 必填 | 型態 | 說明 |
|------|----------|------|------|------|
| MerchantID | 商店代號 | V | String(15) | 藍新金流商店代號 |
| TradeInfo | 交易資料 AES 加密 | V | String | AES-256-CBC 加密後的交易參數 |
| TradeSha | 交易資料 SHA256 | V | String | TradeInfo 的 SHA256 簽章 |
| Version | 串接程式版本 | V | String(5) | 固定 `2.3` |
| EncryptType | 加密模式 | - | Int(1) | 0=AES/CBC/PKCS7 (預設), 1=AES/GCM |

## TradeInfo 內含參數

### 基本必填參數

| 參數 | 中文名稱 | 必填 | 型態 | 說明 |
|------|----------|------|------|------|
| MerchantID | 商店代號 | V | String(15) | 藍新金流商店代號 |
| RespondType | 回傳格式 | V | String(6) | `JSON` 或 `String` |
| TimeStamp | 時間戳記 | V | String(50) | Unix 時間戳 (容許誤差 120 秒) |
| Version | 串接程式版本 | V | String(5) | `2.3` |
| MerchantOrderNo | 商店訂單編號 | V | String(30) | 限英數+"_", 同商店不可重複 |
| Amt | 訂單金額 | V | Int(10) | 純數字, 新台幣 |
| ItemDesc | 商品資訊 | V | String(50) | UTF-8, 避免特殊符號 |

### URL 設定參數

| 參數 | 中文名稱 | 必填 | 型態 | 說明 |
|------|----------|------|------|------|
| NotifyURL | 背景通知網址 | - | String(200) | Webhook 接收付款結果 (建議必設) |
| ReturnURL | 前台返回網址 | - | String(200) | 付款完成後前台導回 |
| ClientBackURL | 返回商店網址 | - | String(200) | 消費者取消付款返回 |
| CustomerURL | 取號完成返回 | - | String(200) | 非即時付款取號完成導回 |

### 交易控制參數

| 參數 | 中文名稱 | 必填 | 型態 | 說明 |
|------|----------|------|------|------|
| TradeLimit | 交易有效時間 | - | Int(3) | 60~900 秒, 預設不啟用 |
| ExpireDate | 繳費截止日期 | - | String(10) | 非即時支付用, 格式 `yyyy-MM-dd` |
| ExpireTime | 繳費截止時間 | - | String(6) | 格式 `HHmmss` |
| LangType | 語系 | - | String(5) | `zh-tw`/`en`/`jp`, 預設繁中 |
| Email | 付款人信箱 | - | String(50) | 付款通知用 |
| OrderComment | 商店備註 | - | String(300) | 顯示於 MPG 頁面 |

### 信用卡相關參數

| 參數 | 中文名稱 | 必填 | 型態 | 說明 |
|------|----------|------|------|------|
| CREDIT | 一次付清 | - | Int(1) | 1=啟用, 0=不啟用 |
| InstFlag | 分期期別 | - | String(18) | `1`=全部, 或 `3,6,12,18,24,30` |
| CreditRed | 紅利折抵 | - | Int(1) | 1=啟用 |
| UNIONPAY | 銀聯卡 | - | Int(1) | 1=啟用 |
| CREDITAE | 美國運通卡 | - | Int(1) | 1=啟用 |

### 三大 Pay 參數

| 參數 | 中文名稱 | 必填 | 型態 | 說明 |
|------|----------|------|------|------|
| APPLEPAY | Apple Pay | - | Int(1) | 1=啟用 |
| ANDROIDPAY | Google Pay | - | Int(1) | 1=啟用 |
| SAMSUNGPAY | Samsung Pay | - | Int(1) | 1=啟用 |

### ATM/超商參數

| 參數 | 中文名稱 | 必填 | 型態 | 說明 |
|------|----------|------|------|------|
| WEBATM | 網路 ATM | - | Int(1) | 1=啟用, 限額 49,999 元 |
| VACC | ATM 轉帳 | - | Int(1) | 1=啟用, 限額 49,999 元 |
| BankType | 指定銀行 | - | String(26) | `BOT,HNCB,KGI` |
| CVS | 超商代碼 | - | Int(1) | 1=啟用 |
| BARCODE | 超商條碼 | - | Int(1) | 1=啟用 |

### 電子錢包參數

| 參數 | 中文名稱 | 必填 | 型態 | 說明 |
|------|----------|------|------|------|
| LINEPAY | LINE Pay | - | Int(1) | 1=啟用 |
| ImageUrl | LINE Pay 圖片 | - | String(200) | 84x84 像素, jpg/png, 顯示於付款頁 |

> ⚠️ **LINE Pay 退款**使用電子錢包退款 API [NPA-B06]，退款期限 60 天，支援部分退款

### 信用卡記憶卡號 (Token)

| 參數 | 中文名稱 | 必填 | 型態 | 說明 |
|------|----------|------|------|------|
| TokenTerm | 綁定識別碼 | - | String(20) | 會員編號或 Email |
| TokenTermDemand | 必填欄位設定 | - | Int(1) | 1=到期日+安全碼, 2=到期日, 3=安全碼, 4=皆非必填 |

## 注意事項

1. **支付方式預設**：若 CREDIT/WEBATM/VACC 等全未指定, 則依商店後台設定
2. **ReturnURL vs NotifyURL**：兩者不可設相同網址, 避免重複觸發
3. **TimeStamp 有效期**：120 秒內必須發動交易
4. **iframe 禁用**：MPG 頁面禁止以 iframe 或 proxy 方式嵌入

## TypeScript 型別定義

```typescript
interface MPGTradeInfoParams {
  // 必填
  MerchantID: string;
  RespondType: 'JSON' | 'String';
  TimeStamp: number;
  Version: '2.3';
  MerchantOrderNo: string;
  Amt: number;
  ItemDesc: string;
  
  // URL
  NotifyURL?: string;
  ReturnURL?: string;
  ClientBackURL?: string;
  CustomerURL?: string;
  
  // 交易控制
  TradeLimit?: number;
  ExpireDate?: string;
  LangType?: 'zh-tw' | 'en' | 'jp';
  Email?: string;
  OrderComment?: string;
  
  // 信用卡 (主要支援)
  CREDIT?: 0 | 1;
  InstFlag?: string;      // 分期：'3,6,12,18,24,30'
  CreditRed?: 0 | 1;      // 紅利折抵
  UNIONPAY?: 0 | 1;       // 銀聯卡
  CREDITAE?: 0 | 1;       // 美國運通卡
  
  // 三大 Pay
  APPLEPAY?: 0 | 1;
  ANDROIDPAY?: 0 | 1;
  SAMSUNGPAY?: 0 | 1;
  
  // LINE Pay (後續支援)
  LINEPAY?: 0 | 1;
  ImageUrl?: string;      // 84x84 像素
  
  // 信用卡記憶卡號 (Token)
  TokenTerm?: string;
  TokenTermDemand?: 1 | 2 | 3 | 4;
}

// 信用卡一次付清最簡設定
const creditOnceParams: Partial<MPGTradeInfoParams> = {
  CREDIT: 1,
  InstFlag: '0',  // 不啟用分期
};

// LINE Pay 設定
const linePayParams: Partial<MPGTradeInfoParams> = {
  LINEPAY: 1,
  ImageUrl: 'https://example.com/product-84x84.jpg',
};
```
