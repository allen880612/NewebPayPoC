# MPG 交易回應參數規格

## 外層回應參數

| 參數 | 中文名稱 | 型態 | 說明 |
|------|----------|------|------|
| Status | 回傳狀態 | String(10) | `SUCCESS` 或錯誤代碼 |
| MerchantID | 商店代號 | String(20) | 藍新金流商店代號 |
| TradeInfo | 交易資料 AES 加密 | String | 需解密取得內含參數 |
| TradeSha | SHA256 簽章 | String | 用於驗證 TradeInfo |
| Version | 版本 | String(5) | 串接版本號 |
| EncryptType | 加密模式 | Int(1) | 僅當設定為 1 時回傳 |

## TradeInfo 解密後參數

### 共同回應參數 (所有支付方式)

| 參數 | 中文名稱 | 型態 | 說明 |
|------|----------|------|------|
| Status | 回傳狀態 | String(10) | `SUCCESS` 或錯誤代碼 |
| Message | 回傳訊息 | String(50) | 交易狀態描述 |
| Result | 回傳參數 | Object | RespondType=JSON 時使用 |
| MerchantID | 商店代號 | String(15) | 藍新金流商店代號 |
| Amt | 交易金額 | Int(10) | 純數字, 新台幣 |
| TradeNo | 藍新交易序號 | String(20) | 藍新金流產生的序號 |
| MerchantOrderNo | 商店訂單編號 | String(30) | 商店自訂編號 |
| PaymentType | 支付方式 | String(10) | 見下方支付方式代碼 |
| RespondType | 回傳格式 | String(10) | JSON 格式 |
| PayTime | 支付完成時間 | DateTime | `yyyy-MM-dd HH:mm:ss` |
| IP | 交易 IP | String(15) | 付款人 IP |
| EscrowBank | 款項保管銀行 | String(10) | `HNCB`=華南銀行 |

### PaymentType 支付方式代碼

| 代碼 | 說明 |
|------|------|
| CREDIT | 信用卡 |
| WEBATM | 網路 ATM |
| VACC | ATM 轉帳 |
| CVS | 超商代碼 |
| BARCODE | 超商條碼 |
| LINEPAY | LINE Pay |
| ESUNWALLET | 玉山 Wallet |
| TAIWANPAY | 台灣 Pay |
| BITOPAY | BitoPay |
| CVSCOM | 超商取貨付款 |
| FULA | Fula 付啦 |

---

## 信用卡專屬回應參數

適用：信用卡、Apple Pay、Google Pay、Samsung Pay、銀聯、美國運通

| 參數 | 中文名稱 | 型態 | 說明 |
|------|----------|------|------|
| AuthBank | 收單金融機構 | String(10) | 見下方 AuthBank 代碼 |
| CardBank | 發卡金融機構 | String(10) | 非台灣銀行則空白 |
| RespondCode | 金融機構回應碼 | String(5) | 銀行回應碼 |
| Auth | 授權碼 | String(6) | 銀行授權碼 |
| Card6No | 卡號前 6 碼 | String(6) | 信用卡前六碼 |
| Card4No | 卡號後 4 碼 | String(4) | 信用卡後四碼 |
| Exp | 有效期限 | String(4) | 格式 `YYMM` |
| ECI | ECI 值 | String(2) | 1,2,5,6=3D 交易 |
| Inst | 分期期別 | Int(10) | 分期交易期數 |
| InstFirst | 首期金額 | Int(10) | 分期首期金額 |
| InstEach | 每期金額 | Int(10) | 分期每期金額 |
| PaymentMethod | 交易類別 | String(15) | 見下方 PaymentMethod 代碼 |
| TokenUseStatus | Token 使用狀態 | Int(1) | 0=非快速結帳, 1=首次設定, 2=使用, 9=取消 |
| RedAmt | 紅利折抵後金額 | Int(5) | 僅紅利交易回傳 |

### AuthBank 收單金融機構代碼

| 代碼 | 銀行 |
|------|------|
| Esun | 玉山銀行 |
| Taishin | 台新銀行 |
| CTBC | 中國信託銀行 |
| NCCC | 聯合信用卡中心 |
| CathayBK | 國泰世華銀行 |
| Citibank | 花旗銀行 |
| UBOT | 聯邦銀行 |
| SKBank | 新光銀行 |
| Fubon | 富邦銀行 |
| FirstBank | 第一銀行 |
| LINEBank | 連線商業銀行 |
| SinoPac | 永豐銀行 |
| FULA | 中信資融 FULA |

### PaymentMethod 交易類別代碼

| 代碼 | 說明 |
|------|------|
| CREDIT | 台灣發卡機構信用卡 |
| FOREIGN | 國外發卡機構信用卡 |
| NTCB | 國民旅遊卡 |
| UNIONPAY | 銀聯卡 |
| APPLEPAY | Apple Pay |
| GOOGLEPAY | Google Pay |
| SAMSUNGPAY | Samsung Pay |

---

## ⚠️ 交易狀態欄位說明 (重要)

### TradeStatus 支付狀態

| 值 | 說明 | 備註 |
|----|------|------|
| 0 | 未付款 | 3D 交易等待消費者完成付款 |
| 1 | 付款成功 | 授權成功 ≠ 已扣款 |
| 2 | 付款失敗 | 授權失敗 |
| 3 | 取消付款 | 已取消授權 |
| 6 | 退款 | 退款完成 |

### CloseStatus 請款狀態

> ⚠️ **重要**：付款成功 (授權成功) 時 CloseStatus=0，此時**尚未實際扣款**

| 值 | 說明 | 可執行操作 | 備註 |
|----|------|-----------|------|
| 0 | 未請款 | 請款 [B031]、取消授權 [B01] | 尚未向銀行請款 |
| 1 | 請款申請中 | 取消請款 [B033] | 等待系統 21:00 報送 |
| 2 | 請款處理中 | (等待銀行) | 已報送銀行，無法取消 |
| 3 | 請款完成 | 退款 [B032] | 銀行已確認扣款 |
| 4 | 請款失敗 | 重新請款 | 電子錢包適用 |

### BackStatus 退款狀態

> ⚠️ **重要**：只有 CloseStatus=3 (請款完成) 才能執行退款

| 值 | 說明 | 可執行操作 | 備註 |
|----|------|-----------|------|
| 0 | 未退款 | 退款 [B032] | 需 CloseStatus=3 |
| 1 | 退款申請中 | 取消退款 [B034] | 等待系統 21:00 報送 |
| 2 | 退款處理中 | (等待銀行) | 已報送銀行，無法取消 |
| 3 | 退款完成 | 無 | 終態 |
| 4 | 退款失敗 | 重新退款 | 電子錢包適用 |

### 狀態轉換關係圖

```
發動交易 [NPA-F01]
    │
    ├─ 3D 交易 ──→ 未付款 (TradeStatus=0) ──→ 授權成功
    │
    └─ 非 3D 交易 ──→ 授權成功 (TradeStatus=1)
                          │
                          ├─ 取消授權 [B01] ──→ 已取消授權 (TradeStatus=3)
                          │
                          └─ 請款 [B031] ──→ 請款申請中 (CloseStatus=1)
                                                │
                                    ┌───────────┼───────────┐
                                    │           │           │
                              取消請款    系統21:00報送   
                               [B033]           │
                                    │           ▼
                                    │    請款處理中 (CloseStatus=2)
                                    │           │
                                    ▼           │ 銀行回檔
                              未請款 ◀──────────┘
                           (CloseStatus=0)      ▼
                                          請款完成 (CloseStatus=3)
                                                │
                                          退款 [B032]
                                                │
                                                ▼
                                          退款申請中 (BackStatus=1)
                                                │
                                    ┌───────────┼───────────┐
                                    │           │           │
                              取消退款    系統21:00報送
                               [B034]           │
                                    │           ▼
                                    │    退款處理中 (BackStatus=2)
                                    │           │
                                    ▼           │ 銀行回檔
                              請款完成 ◀────────┘
                                                ▼
                                          退款完成 (BackStatus=3)
```

### ⚠️ 批次處理時間點

藍新系統**每晚 21:00** 自動向銀行報送：

| 操作 | 報送前狀態 | 報送後狀態 | 可否取消 |
|------|-----------|-----------|----------|
| 請款 | CloseStatus=1 | CloseStatus=2 | 報送前可取消 |
| 退款 | BackStatus=1 | BackStatus=2 | 報送前可取消 |

---

## ATM/超商取號回應參數

適用：ATM、超商代碼、超商條碼、超商取貨付款

| 參數 | 中文名稱 | 型態 | 說明 |
|------|----------|------|------|
| ExpireDate | 繳費截止日期 | Date | `yyyy-MM-dd` |
| ExpireTime | 繳費截止時間 | Time | `HH:mm:ss` |
| BankCode | 銀行代碼 | String(3) | ATM 轉帳銀行代碼 |
| CodeNo | 繳費代碼 | String(30) | ATM 帳號或超商代碼 |
| Barcode_1 | 條碼第一段 | String(20) | 超商條碼用 |
| Barcode_2 | 條碼第二段 | String(20) | 超商條碼用 |
| Barcode_3 | 條碼第三段 | String(20) | 超商條碼用 |
| StoreType | 超商類別 | String(4) | 1=7-11, 2=全家, 3=萊爾富, 4=OK |

---

## 電子錢包專屬回應參數

適用：LINE Pay、玉山 Wallet、台灣 Pay

| 參數 | 中文名稱 | 型態 | 說明 |
|------|----------|------|------|
| RespondCode | 金融機構回應碼 | String(10) | |
| CloseAmt | 請款金額 | Int(10) | |
| CloseStatus | 請款狀態 | Int(1) | 0~4 |
| BackBalance | 可退款餘額 | Int(10) | LINE Pay 不支援 |
| BackStatus | 退款狀態 | Int(1) | 0~4 |
| RespondMsg | 授權結果訊息 | String(50) | |
| PaymentMethod | 交易類別 | String(15) | LINEPAY/ESUNWALLET/TAIWANPAY |
| AuthBank | 收單金融機構 | String(10) | Linepay/Esun |

---

## 查詢 API 信用卡專屬回應

| 參數 | 中文名稱 | 型態 | 說明 |
|------|----------|------|------|
| CloseAmt | 請款金額 | Int(10) | 已請款金額 |
| CloseStatus | 請款狀態 | Int(1) | 見上方說明 |
| BackBalance | 可退款餘額 | Int(10) | 可退款金額 |
| BackStatus | 退款狀態 | Int(1) | 見上方說明 |
| CheckCode | 檢核碼 | Hash | 用於驗證回傳資料 |

---

## TypeScript 型別定義

```typescript
// 解密後的 TradeInfo 結構 (支付完成)
interface PaymentCompleteResult {
  Status: string;
  Message: string;
  MerchantID: string;
  Amt: number;
  TradeNo: string;
  MerchantOrderNo: string;
  PaymentType: string;
  RespondType: string;
  PayTime: string;
  IP: string;
  EscrowBank: string;
  
  // 信用卡專屬 (可選)
  AuthBank?: string;
  CardBank?: string;
  RespondCode?: string;
  Auth?: string;
  Card6No?: string;
  Card4No?: string;
  Exp?: string;
  ECI?: string;
  Inst?: number;
  InstFirst?: number;
  InstEach?: number;
  PaymentMethod?: string;
  TokenUseStatus?: number;
  RedAmt?: number;
}

// ATM/超商取號結果
interface GetCodeResult {
  Status: string;
  Message: string;
  MerchantID: string;
  Amt: number;
  TradeNo: string;
  MerchantOrderNo: string;
  PaymentType: string;
  ExpireDate: string;
  ExpireTime?: string;
  
  // ATM
  BankCode?: string;
  CodeNo?: string;
  
  // 超商條碼
  Barcode_1?: string;
  Barcode_2?: string;
  Barcode_3?: string;
  
  // 超商類別
  StoreType?: string;
}

// 查詢 API 結果
interface QueryTradeResult {
  Status: string;
  Message: string;
  MerchantID: string;
  Amt: number;
  TradeNo: string;
  MerchantOrderNo: string;
  TradeStatus: '0' | '1' | '2' | '3' | '6';
  PaymentType: string;
  CreateTime: string;
  PayTime: string;
  CheckCode: string;
  FundTime?: string;
  
  // 信用卡專屬
  CloseAmt?: number;
  CloseStatus?: '0' | '1' | '2' | '3' | '4';
  BackBalance?: number;
  BackStatus?: '0' | '1' | '2' | '3' | '4';
  RespondCode?: string;
  Auth?: string;
  ECI?: string;
  Inst?: string;
  InstFirst?: string;
  InstEach?: string;
  RespondMsg?: string;
}

// 請退款 API 結果
interface CloseResult {
  Status: string;
  Message: string;
  MerchantID: string;
  Amt: number;
  TradeNo: string;
  MerchantOrderNo: string;
}

// 電子錢包退款結果
interface EWalletRefundResult {
  Status: string;  // '1000' = 成功
  Message: string;
  EncryptData: string;
  HashData: string;
  UID: string;
  Version: string;
}

// 電子錢包退款 EncryptData 解密後
interface EWalletRefundData {
  TradeNo: string;
  BankMessage: string;
  BankCode: string;
  MerchantOrderNo: string;
  RefundAmount: number;
  RefundDate: string;  // 'yyyy-MM-dd HH:mm:ss'
}
```

---

## 回應範例

### 信用卡付款成功

```json
{
  "Status": "SUCCESS",
  "Message": "授權成功",
  "MerchantID": "MS12345678",
  "Amt": 1000,
  "TradeNo": "23092714215835071",
  "MerchantOrderNo": "ORDER_1695795668",
  "PaymentType": "CREDIT",
  "PayTime": "2023-09-27 14:21:59",
  "IP": "203.69.xxx.xxx",
  "EscrowBank": "HNCB",
  "AuthBank": "Esun",
  "CardBank": "Esun",
  "RespondCode": "00",
  "Auth": "115468",
  "Card6No": "400022",
  "Card4No": "1111",
  "Exp": "2512",
  "ECI": "5",
  "PaymentMethod": "CREDIT"
}
```

### 查詢 API 回應 (已請款)

```json
{
  "Status": "SUCCESS",
  "Message": "查詢成功",
  "Result": {
    "MerchantID": "MS12345678",
    "Amt": 1000,
    "TradeNo": "23092714215835071",
    "MerchantOrderNo": "ORDER_1695795668",
    "TradeStatus": "1",
    "PaymentType": "CREDIT",
    "CreateTime": "2023-09-27 14:21:59",
    "PayTime": "2023-09-27 14:21:59",
    "FundTime": "2023-10-02",
    "CheckCode": "79C5227AF869AE4F25FDF4E22B928D5B...",
    "RespondCode": "00",
    "Auth": "115468",
    "CloseAmt": 1000,
    "CloseStatus": "3",
    "BackBalance": 1000,
    "BackStatus": "0",
    "RespondMsg": "請款完成"
  }
}
```
