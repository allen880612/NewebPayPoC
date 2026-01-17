## UserStory / Description
As a Pallas-v1 開發者
I want 完成藍新金流信用卡付款串接 PoC
So that 驗證加解密邏輯正確、完整付款流程可通，為後續正式整合建立技術基礎

### 範圍
- 金流商：藍新金流 NewebPay
- 付款方式：MPG 跳轉式信用卡一次付清
- 環境：測試站 (https://ccore.newebpay.com)
- 測試卡號：4000-2211-1111-1111

本 Issue 僅涵蓋 測試帳號的 PoC 驗證
**不包含**：
- 正式帳號串接
- 完整錯誤處理
- 資料庫永久儲存（可用 console.log 替代）
- 電子發票串接

## Acceptance Criteria
### AC-1: 加解密功能正確
- [ ] 實作 AES-256-CBC 加密函式，產生 TradeInfo
- [ ] 實作 SHA256 簽章函式，產生 TradeSha
- [ ] 實作 AES-256-CBC 解密函式，可正確解密藍新回傳資料
- [ ] 加密後的資料可成功被藍新測試站接受（不出現 MPG03009 交易失敗）

### AC-2: 付款發起 API
- [ ] 建立 `POST /api/payment/create` API
- [ ] 接收訂單資訊（orderId, amount, itemDesc, email）
- [ ] 回傳加密後的付款資料（MerchantID, TradeInfo, TradeSha, Version）

### AC-3: MPG 跳轉付款
- [ ] AC2 之 TimeStamp 在有效期限內應該可以正確跳轉（120 秒）
- [ ] 前端可透過 Form POST 跳轉至藍新 MPG 付款頁面
- [ ] 付款頁面正常顯示，可輸入測試卡號
- [ ] 輸入測試卡號 4000-2211-1111-1111 可完成付款

### AC-4: Webhook 接收 (NotifyURL)
- [ ] 建立 `POST /api/payment/notify` API
- [ ] 可接收藍新 POST 回傳的 form-urlencoded 資料
- [ ] 驗證 TradeSha（SHA256 比對）
- [ ] 成功解密 TradeInfo 並解析 JSON
- [ ] Console 輸出付款結果（Status, TradeNo, Amt）
- [ ] 回傳 HTTP 200 給藍新

### AC-5: 返回頁面 (ReturnURL) 
- [ ] 建立 `/payment/result` 頁面
- [ ] 可接收藍新跳轉回傳的參數
- [ ] 根據付款結果顯示成功/失敗 Dialog
- [ ] Dialog 包含：狀態圖示、結果訊息、交易序號（成功時）

### AC-6: 本地測試環境
- [ ] 使用 ngrok 將本地服務暴露至外網
- [ ] NotifyURL 和 ReturnURL 皆使用 ngrok HTTPS URL
- [ ] 完整流程可在本地環境跑通

### AC-7: 測試驗證清單
- [ ] 付款成功：Webhook 收到 Status=SUCCESS
- [ ] 付款成功：ReturnURL 頁面顯示成功 Dialog
- [ ] 付款失敗：可模擬失敗情境（如超時）並正確處理
- [ ] 金額驗證：回傳 Amt 與發起時一致

## Notes
### 環境變數
```env
NEWEBPAY_MERCHANT_ID=     # 商店代號
NEWEBPAY_HASH_KEY=        # HashKey (32字元)
NEWEBPAY_HASH_IV=         # HashIV (16字元)
BASE_URL=                 # 本地 PoC 階段填入 ngrok URL (如 https://xxxx.ngrok.io)，後續根據 Develop/Production 環境填入對應 Endpoint
```

### 關鍵技術點
| 項目 | 規格 |
|-----|-----|
| 加密方式 | AES-256-CBC + PKCS7 Padding |
| 簽章方式 | SHA256 (大寫) |
| API 版本 | 2.0 |
| 測試站 URL | https://ccore.newebpay.com/MPG/mpg_gateway |

### 安全檢查（PoC 階段簡化版）
- [x] TradeSha 驗證
- [x] 金額比對
- [ ] ~~冪等性處理~~ (Phase 2)
- [ ] ~~交易 Log 寫入DB ~~ (Phase 2)

## Note
### 風險與注意事項
1. **TimeStamp 有效期**：產生加密資料後 120 秒內必須提交，否則會出現 MPG02004 錯誤
2. **ngrok URL 變動**：每次重啟 ngrok，URL 會改變，需同步更新 .env
3. **Webhook 必須回傳 200**：若回傳非 200，藍新會 Retry 3 次
4. **測試站限制**：測試站交易不會實際扣款，但流程與正式站一致

### 參考文件
- 藍新金流技術文件：線上交易─幕前支付技術串接手冊 NDNF1.1.9
- 原始需求: `docs/[#631]newebpay-poc/issue.md`
- PoC 設計文件：`docs/[#631]newebpay-poc/newebpay-poc-plan.md`
- HLD 設計文件：`docs/[#631]newebpay-poc/newebpay-credit-card-design-doc.md`

### 後續 Issue
- [ ] Phase 2: 正式整合（含 Firestore、完整錯誤處理）
- [ ] Phase 3: 對帳機制
- [ ] Phase 4: 訂閱制（定期定額）

## Definition of Done
- [ ] 所有 AC 完成
- [ ] 本地環境可完整跑通付款流程
- [ ] Console 可看到完整的付款結果 Log
- [ ] 返回頁面 Dialog 正常顯示
- [ ] (Optional) 上到 Develop 整個 PoC 流程應該也可以正確運行 (可以等 Phase2 完成再一起完整驗證)