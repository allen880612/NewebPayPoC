# NewebPay 藍新金流 線上交易─幕前支付技術串接手冊

- [cite_start]**文件版本**: NDNF-1.1.9 [cite: 9]
- [cite_start]**文件日期**: 2025/07/22 [cite: 30]
- **適用場景**: 線上交易幕前支付 (MPG)

---

## [cite_start]1. 簡介 [cite: 53]

[cite_start]此份串接手冊主要針對藍新金流線上交易幕前支付的場域，說明交易、單筆交易查詢、取消授權、請退款/取消請退款、電子錢包退款之 API 介接規格說明 [cite: 55, 56]。

### [cite_start]本手冊涵蓋 API 範圍 [cite: 66]
* **MPG 交易 [NPA-F01]**: 幕前支付核心交易
* **單筆交易查詢 [NPA-B02]**: 查詢訂單狀態
* **取消授權 [NPA-B01]**: 信用卡取消授權
* **請款 [NPA-B031] / 取消請款 [NPA-B033]**
* **退款 [NPA-B032] / 取消退款 [NPA-B034]**
* **電子錢包退款 [NPA-B06]**

---

## [cite_start]2. 交易流程 [cite: 76]

### [cite_start]3.1 即時支付交易流程 [cite: 79]
即時支付涵蓋信用卡、Apple Pay/Google Pay/Samsung Pay、電子錢包 (TWQR、LINE Pay 等) 及 WebATM。

1.  消費者在商店網頁完成購物，並開始結帳。
2.  商店向藍新金流發動 MPG 交易 API。
3.  藍新金流將商店網頁轉導至藍新付款頁面 (MPG)。
4.  消費者於 MPG 選擇支付方式並輸入資訊 (或掃描 QR Code)。
5.  藍新金流將交易資訊傳送至收單機構 (若為 3D 交易則轉導驗證)。
6.  收單機構回傳交易結果。
7.  藍新金流透過 `NotifyURL` 背景通知商店付款結果。
8.  [cite_start]藍新金流將頁面轉導至付款完成頁面 (`ReturnURL`) [cite: 83-101]。

### [cite_start]3.2 非即時支付交易流程 [cite: 285]
涵蓋超商代碼、超商條碼、超商取貨付款及 ATM 轉帳。

1.  消費者在商店網頁結帳。
2.  商店發動 MPG 交易 API。
3.  消費者於 MPG 選擇支付方式 (如超商代碼)。
4.  藍新金流回傳取號資訊 (轉導回 `CustomerURL` 或顯示於藍新頁面)。
5.  消費者至超商或 ATM 完成付款。
6.  收單機構或超商將付款結果回傳。
7.  [cite_start]藍新金流透過 `NotifyURL` 背景通知商店付款結果 [cite: 289-300]。

---

## [cite_start]4. APIs [cite: 341]

### [cite_start]4.1 加解密方式 [cite: 344]

發動 API 時需使用 AES256 加密 `TradeInfo`，並配合 SHA256 產生檢查碼。

#### [cite_start]4.1.1 AES256 加密 [cite: 346]
* **模式**: AES-256-CBC
* **Padding**: PKCS7
* **Key/IV**: 商店 API 串接金鑰 (Hash Key, Hash IV)

**PHP 加密範例**:
```php
$key = "Fs5cX1TGqYM2PpdbE14a9H83YQSQF5jn"; // 範例 Key
$iv = "C6AcmfqJILwgnhIP"; // 範例 IV
$data1 = "MerchantID=MS12345678&..."; // URL Encode 後的參數字串

// 加密並轉為十六進制
$edata1 = bin2hex(openssl_encrypt($data1, "AES-256-CBC", $key, OPENSSL_RAW_DATA, $iv));

```



4.1.2 SHA256 壓碼 (TradeSha) 

1. 格式：`HashKey=(HashKey)&(AES加密字串)&HashIV=(HashIV)`
2. 將字串使用 SHA256 壓碼後轉為**大寫**。

**PHP 範例**:

```php
$hashs = "HashKey=".$key."&".$edata1."&HashIV=".$iv;
$hash = strtoupper(hash("sha256", $hashs));

```



4.1.5 CheckCode 產生規則 (用於驗證回傳) 

1. 將 `Amt`、`MerchantID`、`MerchantOrderNo`、`TradeNo` 四個參數依 **A~Z 排序**。
2. 用 `&` 串聯。
3. 前面加上 `HashIV=...`，後面加上 `HashKey=...`。
4. SHA256 壓碼轉大寫。

4.1.6 CheckValue 產生規則 (用於查詢 API) 

1. 將 `Amt`、`MerchantID`、`MerchantOrderNo` 三個參數依 **A~Z 排序**。
2. 用 `&` 串聯。
3. 前面加上 `IV=...`，後面加上 `Key=...`。
4. SHA256 壓碼轉大寫。

---

4.2 MPG 交易 [NPA-F01] 

* **測試網址**: `https://ccore.newebpay.com/MPG/mpg_gateway`
* **正式網址**: `https://core.newebpay.com/MPG/mpg_gateway`

4.2.1 請求參數 (Form Post) 

**第一層參數 (需顯示於 Form 表單)**

| 參數名稱 | 說明 | 必填 | 型態 | 備註 |
| --- | --- | --- | --- | --- |
| **MerchantID** | 商店代號 | V | String(15) | 藍新金流商店代號 |
| **TradeInfo** | 交易資料 | V | String | 將交易資料 AES 加密後的字串 |
| **TradeSha** | 交易檢查碼 | V | String | 將 TradeInfo 進行 SHA256 加密 |
| **Version** | 版本號 | V | String(5) | 固定值 **2.3** 

 |
| **EncryptType** | 加密模式 |  | Int(1) | 0: AES/CBC/PKCS7 (預設), 1: AES/GCM |

**TradeInfo 內含參數 (需組成字串後加密)** 

| 參數名稱 | 中文名稱 | 必填 | 型態 | 備註重點 |
| --- | --- | --- | --- | --- |
| **MerchantID** | 商店代號 | V | String(15) |  |
| **RespondType** | 回傳格式 | V | String(6) | `JSON` 或 `String` |
| **TimeStamp** | 時間戳記 | V | String(50) | Unix Time 秒數 |
| **Version** | 串接版本 | V | String(5) | **2.3** |
| **LangType** | 語系 |  | String(5) | `en`, `zh-tw`, `jp` |
| **MerchantOrderNo** | 商店訂單編號 | V | String(30) | 限英數字與底線，不可重複 |
| **Amt** | 訂單金額 | V | Int(10) | 純數字，新台幣 |
| **ItemDesc** | 商品資訊 | V | String(50) | 避免特殊符號 |
| **TradeLimit** | 交易秒數限制 |  | Int(3) | 60~900 秒 |
| **ExpireDate** | 繳費有效期限 |  | String(10) | 格式 `YYYYMMDD` (非即時支付用) |
| **ReturnURL** | 返回商店網址 |  | String(200) | 支付完成後導回 (POST) |
| **NotifyURL** | 支付通知網址 |  | String(200) | 背景回傳支付結果 (POST) |
| **CustomerURL** | 取號網址 |  | String(200) | 取號完成後導回 |
| **ClientBackURL** | 返回按鈕網址 |  | String(200) | 支付頁面上的「返回商店」連結 |
| **Email** | 付款人信箱 |  | String(50) |  |
| **EmailModify** | 信箱可否修改 |  | Int(1) | 1=可修改, 0=不可 |
| **LoginType** | (已取消) |  |  |  |
| **OrderComment** | 商店備註 |  | String(300) | 顯示於 MPG 頁面 |
| **TokenTerm** | 綁定代碼 |  | String(20) | 用於記憶卡號 (Token) 

 |
| **CREDIT** | 信用卡啟用 |  | Int(1) | 1=啟用 |
| **ANDROIDPAY** | Google Pay |  | Int(1) | 1=啟用 |
| **SAMSUNGPAY** | Samsung Pay |  | Int(1) | 1=啟用 |
| **LINEPAY** | LINE Pay |  | Int(1) | 1=啟用 |
| **InstFlag** | 分期啟用 |  | String(18) | `1`=全開, `3,6`=指定期數 |
| **CreditRed** | 紅利啟用 |  | Int(1) | 1=啟用 |
| **UNIONPAY** | 銀聯卡 |  | Int(1) | 1=啟用 |
| **WEBATM** | WebATM |  | Int(1) | 1=啟用 |
| **VACC** | ATM 轉帳 |  | Int(1) | 1=啟用 |
| **BankType** | 指定銀行 |  | String(26) | 例: `BOT,HNCB` |
| **CVS** | 超商代碼 |  | Int(1) | 1=啟用 |
| **BARCODE** | 超商條碼 |  | Int(1) | 1=啟用 |
| **ESUNWALLET** | 玉山 Wallet |  | Int(1) | 1=啟用 |
| **TAIWANPAY** | 台灣 Pay |  | Int(1) | 1=啟用 |
| **BITOPAY** | BitoPay |  | Int(1) | 1=啟用 

 |
| **CVSCOM** | 超商物流 |  | Int(1) | 1=取貨不付款, 2=取貨付款, 3=兩者 |
| **LgsType** | 物流型態 |  | String(3) | `B2C`, `C2C` |
| **TWQR** | TWQR |  | Int(1) | 1=啟用 

 |
| **Wallet Display Mode** | 電子支付模式 |  | Int(1) | 1=固定顯示 QR Code 

 |

---

4.2.2 回應參數 - 支付完成 

當交易成功，藍新會回傳 AES 加密的 `TradeInfo`。解密後的 JSON/String 包含：

* **Status**: `SUCCESS` 代表成功。
* **MerchantID**: 商店代號。
* **TradeNo**: 藍新交易序號。
* **Amt**: 金額。
* **PaymentType**: 支付方式 (CREDIT, WEBATM, CVS, etc.)。
* **PayTime**: 支付完成時間。
* **IP**: 交易 IP。
* **EscrowBank**: 款項保管銀行 (HNCB 等)。

**信用卡專屬回傳**:

* 
**AuthBank**: 收單銀行 (Esun, Taishin, SinoPac 等) 。


* **RespondCode**: 銀行回應碼。
* **Auth**: 授權碼。
* **Card6No / Card4No**: 卡號前六後四。
* **ECI**: 3D 驗證值。
* **TokenUseStatus**: 信用卡快速結帳狀態。

**超商/ATM 專屬回傳**:

* **PayInfo**: 繳費代碼/條碼/帳號。
* **StoreType**: 超商類別 (全家, 7-11 等)。

---

4.3 單筆交易查詢 [NPA-B02] 

* **API 網址**: `https://core.newebpay.com/API/QueryTradeInfo`

**請求參數**:

* `MerchantID`, `Version` (1.3), `RespondType`, `TimeStamp`
* `MerchantOrderNo`, `Amt`
* **`CheckValue`**: 驗證碼 (參見 4.1.6)

**回應參數**:

* 
`TradeStatus`: 0=未付款, 1=付款成功, 2=付款失敗, 3=取消付款, 6=退款 。


* `CloseStatus`: 0=未請款, 1=等待請款, 2=請款處理中, 3=請款完成。
* `BackStatus`: 0=未退款, 1=等待退款, 2=退款處理中, 3=退款完成。

---

4.4 取消授權 [NPA-B01] 

* **API 網址**: `https://core.newebpay.com/API/CreditCard/Cancel`
* **功能**: 取消信用卡授權 (尚未請款前)。
* **請求參數**: `MerchantID`, `PostData` (AES 加密資料)。
* **PostData 內容**: `Amt`, `MerchantOrderNo` (或 `TradeNo`), `IndexType` (1=商店單號, 2=藍新單號)。

---

4.5 請退款/取消請退款 [NPA-B031~34] 

* **API 網址**: `https://core.newebpay.com/API/CreditCard/Close`
* **請求參數**: `MerchantID`, `PostData`。
* **PostData 內容**:
* `CloseType`: **1=請款**, **2=退款**。
* `Cancel`: 若要**取消**請款/退款，此欄位填 `1`。
* `Amt`: 金額。
* `IndexType`: 單號類別。



---

4.6 電子錢包退款 [NPA-B06] 

* **API 網址**: `https://core.newebpay.com/API/EWallet/refund`
* 
**特點**: Payload 使用 **JSON Encode** 後再加密，非 URL Query String 。


* **請求參數**:
* `UID_` (商店代號)
* `EncryptData_` (加密後的 JSON)
* `HashData_` (SHA256 壓碼)


* **EncryptData 內容**:
* `MerchantOrderNo`
* `Amount`
* 
`PaymentType`: `ESUNWALLET`, `LINEPAY`, `TAIWANPAY`, `TWQR`, `EZPALIPAY` 等 。





---

5. 常見錯誤代碼表 

| 代碼 | 錯誤原因 | 解決方式/備註 |
| --- | --- | --- |
| **MPG01002** | TimeStamp 可空白 | 檢查時間戳記 |
| **MPG01009** | 商店代號不可空白 | MerchantID 未帶入 |
| **MPG01016** | 檢查碼不可空白 | CheckValue 未帶入 |
| **MPG02004** | 頁面已逾時失效 | 產生 TimeStamp 後 120 秒內需發動 |
| **MPG02005** | 驗證資料錯誤 | 來源不合法 (禁用 iframe) |
| **MPG03009** | 交易失敗 | 檢查 CheckCode 或解密失敗 |
| **TRA10021** | 查無該筆交易 | 單號錯誤或非信用卡交易 |
| **TRA20001** | 取消授權批次處理中 | 需等待銀行批次處理 |
| **MPG03010** | 驗證資料不存在 | 玉山/台灣Pay/BitoPay 錯誤 |

---

6. 附錄：測試區資訊 

* **測試卡號 (信用卡)**: `4000-2211-1111-1111` (一次付清/分期)
* **測試卡號 (紅利)**: `4003-5511-1111-1111`
* **WebATM**: 僅支援「華南銀行」模擬。
* **有效月年/末三碼**: 任意填寫。