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

// ============ 退款相關 ============

// 退款請求參數（內部使用）
export interface RefundParams {
    merchantOrderNo: string;
    tradeNo?: string;        // IndexType=1 時需要
    amount: number;
    timeStamp?: number;      // 選填，預設使用當前時間
}

// Close API PostData_ 內含參數
export interface CloseRequestParams {
    RespondType: string;
    Version: string;
    Amt: number;
    MerchantOrderNo: string;
    TimeStamp: string;
    IndexType: number;      // 1=藍新交易序號, 2=商店訂單編號
    TradeNo: string;
    CloseType: number;      // 1=請款, 2=退款
}

// 退款 API 回應
export interface RefundApiResponse {
    Status: string;
    Message: string;
    Result?: {
        MerchantID: string;
        Amt: number;
        TradeNo: string;
        MerchantOrderNo: string;
    };
}

// 退款結果（給前端用）
export interface RefundResult {
    success: boolean;
    status: string;
    message: string;
    tradeNo?: string;
    merchantOrderNo?: string;
    amount?: number;
}

// ============ 請款相關 ============

// 請款請求參數
export interface CaptureParams {
    merchantOrderNo: string;
    tradeNo: string;         // 藍新交易序號
    amount: number;
    timeStamp?: number;      // 選填，預設使用當前時間
}

// 請款 API 回應（結構同退款）
export interface CaptureApiResponse {
    Status: string;
    Message: string;
    Result?: {
        MerchantID: string;
        Amt: number;
        TradeNo: string;
        MerchantOrderNo: string;
    };
}

// 請款結果（給前端用）
export interface CaptureResult {
    success: boolean;
    status: string;
    message: string;
    tradeNo?: string;
    merchantOrderNo?: string;
    amount?: number;
}

// ============ 交易查詢相關 ============

// 查詢請求參數
export interface QueryParams {
    merchantOrderNo: string;
    amount: number;
}

// 查詢 API 回應
export interface QueryApiResponse {
    Status: string;
    Message: string;
    Result?: QueryResultData;
}

// 查詢結果資料
export interface QueryResultData {
    MerchantID: string;
    Amt: number;
    TradeNo: string;
    MerchantOrderNo: string;
    TradeStatus: number;      // 0=未付款, 1=付款成功, 2=失敗, 3=取消, 6=退款
    PaymentType: string;
    CreateTime: string;
    PayTime: string;
    FundTime?: string;
    // 信用卡專屬
    RespondCode?: string;
    Auth?: string;
    ECI?: string;
    CloseAmt?: number;        // 已請款金額
    CloseStatus?: number;     // 0=未請款, 1=申請中, 2=處理中, 3=完成
    BackBalance?: number;     // 可退款餘額
    BackStatus?: number;      // 0=未退款, 1=申請中, 2=處理中, 3=完成
}

// 查詢結果（給前端用）
export interface QueryResult {
    success: boolean;
    message: string;
    tradeNo?: string;
    tradeStatus?: number;
    closeStatus?: number;
    backStatus?: number;
    closeStatusText?: string;
    backStatusText?: string;
    canRefund?: boolean;
}

// ============ 本地訂單儲存 ============

// 儲存在 JSON 的訂單結構
export interface StoredOrder {
    merchantOrderNo: string;
    tradeNo: string;
    amount: number;
    itemDesc: string;
    payTime: string;
    status: 'paid' | 'refunded';
    card4No?: string;
    refundedAt?: string;
}
