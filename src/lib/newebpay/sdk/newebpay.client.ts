/**
 * Based on newebpay-mpg-sdk by Wen-Hong Huang
 * Original: https://github.com/depresto/newebpay-mpg-sdk
 * License: MIT
 *
 * Modified for internal use with bug fixes:
 * - Fixed Content-Type from multipart/form-data to x-www-form-urlencoded
 * - Added HashData_ to Close API requests
 * - Replaced axios with native fetch
 * - Added error handling
 */
import crypto from "crypto";
import {
  AddMerchantParams,
  AlterPeriodicPaymentAmountParams,
  AlterPeriodicPaymentAmountResponse,
  AlterPeriodicPaymentStatusParams,
  AlterPeriodicPaymentStatusResponse,
  CancelCreditCardParams,
  ChargeMerchantResult,
  CreatePeriodicPaymentHTMLParams,
  CreatePeriodicPaymentResponse,
  CreditCardPaymentParams,
  EmbeddedPaymentParams,
  EmbeddedPaymentResponse,
  EmbeddedTokenPaymentParams,
  GetPaymentFormHTMLParams,
  is3DResponse,
  ModifyMerchantParams,
  PeriodicPaymentResponse,
  QueryTokenStatusParams,
  QueryTokenStatusResponse,
  QueryTradeInfoParams,
  RefundCreditCardParams,
  RefundEWalletParams,
  TokenPaymentParams,
  TokenPaymentResponse,
  TradeInfo,
  UnbindTokenParams,
  UnbindTokenResponse,
} from ".";

type NewebpayClientOptions = {
  proxyEndpoint?: string;
  proxySecret?: string;
  userAgent?: string;
};

export class NewebpayClient {
  partnerId: string | null;
  merchantId: string;
  hashKey: string;
  hashIV: string;
  apiEndpoint: string;
  inframeEndpoint: string;
  env: "sandbox" | "production";
  proxyEndpoint?: string;
  proxySecret?: string;
  userAgent?: string;

  constructor(params: {
    partnerId?: string;
    merchantId: string;
    hashKey: string;
    hashIV: string;
    env: "sandbox" | "production";
    options?: NewebpayClientOptions;
  }) {
    const isDryRun = params.env === "sandbox";

    this.env = params.env;
    this.partnerId = params.partnerId ?? null;
    this.merchantId = params.merchantId;
    this.hashKey = params.hashKey;
    this.hashIV = params.hashIV;

    this.userAgent = params.options?.userAgent;
    this.proxyEndpoint = params.options?.proxyEndpoint;
    this.proxySecret = params.options?.proxySecret;
    this.apiEndpoint = isDryRun
      ? "https://ccore.newebpay.com"
      : "https://core.newebpay.com";
    this.inframeEndpoint = isDryRun
      ? "https://c-inframe.newebpay.com"
      : "https://p-inframe.newebpay.com";
  }

  /**
   * Internal fetch helper with correct Content-Type
   */
  private async postFormData(
    endpoint: string,
    params: URLSearchParams
  ): Promise<Response> {
    const url = `${this.apiEndpoint}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (this.userAgent) {
      headers["User-Agent"] = this.userAgent;
    }

    return fetch(url, {
      method: "POST",
      headers,
      body: params.toString(),
    });
  }

  /**
   * Internal fetch helper for JSON endpoints (embedded payments)
   */
  private async postJson(
    baseUrl: string,
    endpoint: string,
    body: object,
    authHeader?: string
  ): Promise<Response> {
    const url = `${baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    if (this.userAgent) {
      headers["User-Agent"] = this.userAgent;
    }

    return fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * Parse TradeInfo string from API
   */
  public parseTradeInfo(tradeInfo: string) {
    const decrypted = this.decryptAESString(tradeInfo);
    return JSON.parse(decrypted) as TradeInfo;
  }

  public decryptAESString(encrypted: string) {
    const decipher = crypto.createDecipheriv(
      "aes256",
      this.hashKey,
      this.hashIV
    );
    decipher.setAutoPadding(false);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted.replace(/[\x00-\x20]+/g, "");
  }

  /**
   * Generate Newebpay payment HTML form
   */
  public getPaymentFormHTML(params: GetPaymentFormHTMLParams): string {
    const Version = params.Version ?? "2.0";
    const TimeStamp = this.getTimeStamp();
    const tradeInfo = this.buildTradeInfo({
      MerchantID: this.merchantId,
      RespondType: "JSON",
      TimeStamp,
      Version,
      LangType: "zh-tw",
      LoginType: 0,
      ...params,
    });
    const tradeSha = this.buildTradeSha(tradeInfo);

    const html: string[] = [];
    const paymentEndpoint = `${this.apiEndpoint}/MPG/mpg_gateway`;
    const formId = `_auto_pay_Form_${new Date().getTime()}`;

    html.push(
      `<form id="${formId}" method="post" action="${paymentEndpoint}">`
    );
    html.push(
      `<input type="hidden" name="MerchantID" value="${this.merchantId}" />`
    );
    html.push(`<input type="hidden" name="Version" value="${Version}" />`);
    html.push(`<input type="hidden" name="TradeInfo" value="${tradeInfo}" />`);
    html.push(`<input type="hidden" name="TradeSha" value="${tradeSha}" />`);
    html.push("</form>");
    html.push("<script>");
    html.push(`document.getElementById("${formId}").submit();`);
    html.push("</script>");
    return html.join("\n");
  }

  /**
   * Query trade info - FIXED: using URLSearchParams instead of FormData
   */
  public async queryTradeInfo(params: QueryTradeInfoParams) {
    const { Amt, MerchantOrderNo } = params;
    const MerchantID = this.merchantId;
    const Version = "1.3";
    const TimeStamp = this.getTimeStamp();
    const CheckValue = this.buildCheckValue({
      Amt,
      MerchantID,
      MerchantOrderNo,
    });

    const formData = new URLSearchParams();
    formData.append("MerchantID", MerchantID);
    formData.append("Version", Version);
    formData.append("RespondType", "JSON");
    formData.append("CheckValue", CheckValue);
    formData.append("TimeStamp", TimeStamp);
    formData.append("MerchantOrderNo", MerchantOrderNo);
    formData.append("Amt", String(Amt));

    const response = await this.postFormData("/API/QueryTradeInfo", formData);
    const data = await response.json();

    const Status = data.Status as string;
    const Message = data.Message as string;
    const Result = data.Result as { [key: string]: unknown };

    return {
      Status,
      Message,
      Result,
    };
  }

  public createPeriodicPaymentHTML(params: CreatePeriodicPaymentHTMLParams) {
    if (params.PeriodTimes > 99) {
      throw new Error("PeriodTimes must be less than 100");
    }

    const periodFirstdateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
    if (
      params.PeriodFirstdate &&
      !periodFirstdateRegex.test(params.PeriodFirstdate)
    ) {
      throw new Error("PeriodTimes format is invalid");
    }

    const Version = "1.5";
    const TimeStamp = this.getTimeStamp();

    const tradeInfo = this.buildTradeInfo({
      RespondType: "JSON",
      TimeStamp,
      Version,
      ...params,
    });

    const html: string[] = [];
    const paymentEndpoint = `${this.apiEndpoint}/MPG/period`;
    const formId = `_auto_pay_Form_${new Date().getTime()}`;

    html.push(
      `<form id="${formId}" method="post" action="${paymentEndpoint}">`
    );
    html.push(
      `<input type="hidden" name="MerchantID_" value="${this.merchantId}" />`
    );
    html.push(`<input type="hidden" name="PostData_" value="${tradeInfo}" />`);
    html.push("</form>");
    html.push("<script>");
    html.push(`document.getElementById("${formId}").submit();`);
    html.push("</script>");

    return html.join("\n");
  }

  public async alterPeriodicPaymentStatus(
    params: AlterPeriodicPaymentStatusParams
  ) {
    const Version = "1.0";
    const TimeStamp = this.getTimeStamp();

    const PostData_ = this.buildTradeInfo({
      RespondType: "JSON",
      TimeStamp,
      Version,
      ...params,
    });

    const formData = new URLSearchParams();
    formData.append("MerchantID_", this.merchantId);
    formData.append("PostData_", PostData_);

    const response = await this.postFormData(
      "/MPG/period/AlterStatus",
      formData
    );
    const data = await response.json();

    if (typeof data === "string") {
      const responseParams = new URLSearchParams(data);
      return {
        Status: responseParams.get("Status"),
        Message: responseParams.get("Message"),
        Result: null,
      } as AlterPeriodicPaymentStatusResponse;
    } else {
      const period = data.period;
      const decrypted = this.decryptAESString(period);
      return JSON.parse(decrypted) as AlterPeriodicPaymentStatusResponse;
    }
  }

  public async alterPeriodicPaymentAmount(
    params: AlterPeriodicPaymentAmountParams
  ) {
    const Version = "1.2";
    const TimeStamp = this.getTimeStamp();

    const PostData_ = this.buildTradeInfo({
      RespondType: "JSON",
      TimeStamp,
      Version,
      ...params,
    });

    const formData = new URLSearchParams();
    formData.append("MerchantID_", this.merchantId);
    formData.append("PostData_", PostData_);

    const response = await this.postFormData("/MPG/period/AlterAmt", formData);
    const data = await response.json();

    if (typeof data === "string") {
      const responseParams = new URLSearchParams(data);
      return {
        Status: responseParams.get("Status"),
        Message: responseParams.get("Message"),
        Result: null,
      } as AlterPeriodicPaymentAmountResponse;
    } else {
      const period = data.period;
      const decrypted = this.decryptAESString(period);
      return JSON.parse(decrypted) as AlterPeriodicPaymentAmountResponse;
    }
  }

  /**
   * Refund/Capture credit card - FIXED: added HashData_
   */
  public async refundCreditCard(params: RefundCreditCardParams) {
    const Version = "1.1";
    const TimeStamp = this.getTimeStamp();

    const PostData_ = this.buildTradeInfo({
      RespondType: "JSON",
      TimeStamp,
      Version,
      ...params,
    });

    // FIX: Add HashData_ which was missing in original SDK
    const HashData_ = this.buildTradeSha(PostData_);

    const formData = new URLSearchParams();
    formData.append("MerchantID_", this.merchantId);
    formData.append("PostData_", PostData_);
    formData.append("HashData_", HashData_);

    const response = await this.postFormData("/API/CreditCard/Close", formData);
    const data = await response.json();

    const Status = data.Status as string;
    const Message = data.Message as string;
    const Result = data.Result as { [key: string]: unknown };

    return {
      Status,
      Message,
      Result,
    };
  }

  /**
   * Cancel credit card authorization - FIXED: added HashData_
   */
  public async cancelCreditCard(params: CancelCreditCardParams) {
    const Version = "1.0";
    const TimeStamp = this.getTimeStamp();

    const PostData_ = this.buildTradeInfo({
      RespondType: "JSON",
      TimeStamp,
      Version,
      ...params,
    });

    // FIX: Add HashData_ which was missing in original SDK
    const HashData_ = this.buildTradeSha(PostData_);

    const formData = new URLSearchParams();
    formData.append("MerchantID_", this.merchantId);
    formData.append("PostData_", PostData_);
    formData.append("HashData_", HashData_);

    const response = await this.postFormData(
      "/API/CreditCard/Cancel",
      formData
    );
    const data = await response.json();

    const Status = data.Status as string;
    const Message = data.Message as string;
    const Result = data.Result as { [key: string]: unknown };

    return {
      Status,
      Message,
      Result,
    };
  }

  public async refundEWallet(params: RefundEWalletParams) {
    const Version = "1.0";
    const TimeStamp = this.getTimeStamp();

    const data_ = JSON.stringify({
      TimeStamp,
      ...params,
    });
    const EncryptData_ = this.encryptAESString(data_);
    const HashData_ = this.buildTradeSha(EncryptData_);

    const formData = new URLSearchParams();
    formData.append("UID_", this.merchantId);
    formData.append("Version_", Version);
    formData.append("EncryptData_", EncryptData_);
    formData.append("RespondType_", "JSON");
    formData.append("HashData_", HashData_);

    const response = await this.postFormData("/API/EWallet/refund", formData);
    const data = await response.json();

    const Status = data.Status as string;
    const Message = data.Message as string;
    const UID = data.UID as string;
    const EncryptData = data.EncryptData as string;
    const Result = EncryptData
      ? (this.parseTradeInfo(EncryptData) as { [key: string]: unknown })
      : {};

    return {
      UID,
      Version,
      Status,
      Message,
      Result,
    };
  }

  /**
   * Create a new Newebpay merchant with partner API
   */
  public async addMerchant(params: AddMerchantParams) {
    if (!this.partnerId) {
      throw new Error("Please provide PartnerID");
    }

    const Version = params.Version ?? "1.8";
    const TimeStamp = this.getTimeStamp();

    const formData = new URLSearchParams();
    formData.append("PartnerID_", this.partnerId);
    formData.append(
      "PostData_",
      this.buildTradeInfo({
        TimeStamp,
        Version,
        ...params,
      })
    );

    const response = await this.postFormData("/API/AddMerchant", formData);
    const data = await response.json();

    const status = data.status as string;
    const message = data.message as string;
    const result = data.result as { [key: string]: unknown };

    return {
      status,
      message,
      result,
    };
  }

  /**
   * Modify an existing Newebpay merchant with partner API
   */
  public async modifyMerchant(params: ModifyMerchantParams) {
    if (!this.partnerId) {
      throw new Error("Please provide PartnerID");
    }

    const Version = params.Version ?? "1.7";
    const TimeStamp = this.getTimeStamp();

    const formData = new URLSearchParams();
    formData.append("PartnerID_", this.partnerId);
    formData.append(
      "PostData_",
      this.buildTradeInfo({
        TimeStamp,
        Version,
        ...params,
      })
    );

    const response = await this.postFormData(
      "/API/AddMerchant/modify",
      formData
    );
    const data = await response.json();

    const status = data.status as string;
    const message = data.message as string;
    const result = data.result as { [key: string]: unknown };

    return {
      status,
      message,
      result,
    };
  }

  /**
   * Charge a Newebpay merchant with partner API
   */
  public async chargeMerchant(params: AddMerchantParams) {
    if (!this.partnerId) {
      throw new Error("Please provide PartnerID");
    }

    const Version = params.Version ?? "1.1";
    const TimeStamp = this.getTimeStamp();

    const formData = new URLSearchParams();
    formData.append("PartnerID_", this.partnerId);
    formData.append(
      "PostData_",
      this.buildTradeInfo({
        TimeStamp,
        Version,
        ...params,
      })
    );

    const response = await this.postFormData("/API/ChargeInstruct", formData);
    const data = await response.json();

    return data as ChargeMerchantResult;
  }

  public requestCreditCardPayment = async (params: CreditCardPaymentParams) => {
    const Version = params.TokenSwitch ? "2.0" : "1.1";
    const TimeStamp = this.getTimeStamp();

    const PostData_ = this.buildTradeInfo({
      MerchantID: this.merchantId,
      TimeStamp,
      Version,
      ...params,
    });

    // FIX: Add HashData_
    const HashData_ = this.buildTradeSha(PostData_);

    const formData = new URLSearchParams();
    formData.append("MerchantID_", this.merchantId);
    formData.append("PostData_", PostData_);
    formData.append("HashData_", HashData_);
    formData.append("Pos_", "JSON");

    const response = await this.postFormData("/API/CreditCard/Close", formData);
    const data = await response.json();

    return data as TradeInfo;
  };

  public async authorizeTokenPayment(params: TokenPaymentParams) {
    const Version = params.Version ?? "2.4";
    const TimeStamp = this.getTimeStamp();

    const PostData_ = this.buildTradeInfo({
      MerchantID: this.merchantId,
      RespondType: "JSON",
      TimeStamp,
      Version,
      ...params,
    });

    const body = {
      MerchantID_: this.merchantId,
      PostData_: PostData_,
      Pos_: "JSON",
    };

    const response = await this.postJson(
      this.apiEndpoint,
      "/API/CreditCard",
      body
    );
    const data = await response.json();

    const Status = data.Status as string;
    const Message = data.Message as string;
    let Result: TokenPaymentResponse["Result"] | null = null;

    if (data.Result) {
      if (typeof data.Result === "string") {
        const decrypted = this.decryptAESString(data.Result);
        Result = JSON.parse(decrypted) as TokenPaymentResponse["Result"];
      } else {
        Result = data.Result as TokenPaymentResponse["Result"];
      }
    }

    return {
      Status,
      Message,
      Result: Result!,
    } as TokenPaymentResponse;
  }

  /**
   * @deprecated This API is not yet available
   */
  public async queryTokenStatus(params: QueryTokenStatusParams) {
    const Version = "1.0";
    const TimeStamp = this.getTimeStamp();

    const EncryptData_ = this.buildTradeInfo({
      MerchantID: this.merchantId,
      TimeStamp,
      TokenTerm: params.TokenTerm,
      TokenValue: params.TokenValue,
    });
    const HashData_ = this.buildTradeSha(EncryptData_);

    const body = {
      UID_: this.merchantId,
      EncryptData_: EncryptData_,
      HashData_: HashData_,
      Version_: Version,
      RespondType_: "JSON",
    };

    const response = await this.postJson(
      this.apiEndpoint,
      "/API/TokenCard/query",
      body
    );
    const data = await response.json();

    const Status = data.Status as string;
    const Message = data.Message as string;
    let Result: QueryTokenStatusResponse["Result"] | null = null;

    if (data.Result) {
      if (typeof data.Result === "string") {
        const decrypted = this.decryptAESString(data.Result);
        Result = JSON.parse(decrypted) as QueryTokenStatusResponse["Result"];
      } else {
        Result = data.Result as QueryTokenStatusResponse["Result"];
      }
    }

    return {
      Status,
      Message,
      Result: Result!,
    } as QueryTokenStatusResponse;
  }

  /**
   * @deprecated This API is not yet available
   */
  public async unbindToken(params: UnbindTokenParams) {
    const Version = "1.0";
    const TimeStamp = this.getTimeStamp();

    const PostData_ = this.buildTradeInfo({
      MerchantID: this.merchantId,
      TimeStamp,
      TokenTerm: params.TokenTerm,
      TokenValue: params.TokenValue,
    });
    const HashData_ = this.buildTradeSha(PostData_);

    const body = {
      UID_: this.merchantId,
      EncryptData_: PostData_,
      HashData_: HashData_,
      Version_: Version,
      RespondType_: "JSON",
    };

    const response = await this.postJson(
      this.apiEndpoint,
      "/API/TokenCard/unbinding",
      body
    );
    const data = await response.json();

    const Status = data.Status as string;
    const Message = data.Message as string;
    let Result: UnbindTokenResponse["Result"] | null = null;

    if (data.Result) {
      if (typeof data.Result === "string") {
        const decrypted = this.decryptAESString(data.Result);
        Result = JSON.parse(decrypted) as UnbindTokenResponse["Result"];
      } else {
        Result = data.Result as UnbindTokenResponse["Result"];
      }
    }

    return {
      Status,
      Message,
      Result: Result!,
    } as UnbindTokenResponse;
  }

  /**
   * Embedded credit card payment (P1 first transaction)
   */
  public async embeddedCreditCardPayment(
    params: EmbeddedPaymentParams
  ): Promise<EmbeddedPaymentResponse> {
    const { Prime, ...restParams } = params;
    const TimeStamp = Date.now();
    const Version = "2.4";

    const requestBody = {
      MerchantID: this.merchantId,
      TimeStamp,
      Version,
      ...restParams,
    };

    const response = await this.postJson(
      this.inframeEndpoint,
      "/NWPJCore/PaymentC",
      requestBody,
      `Bearer ${Prime}`
    );
    const data = await response.json();

    return data as EmbeddedPaymentResponse;
  }

  /**
   * Decode 3D verification HTML
   */
  public decode3DHTML(encodedHtml: string): string {
    return decodeURIComponent(encodedHtml.replace(/\+/g, " "));
  }

  /**
   * Check if response is 3D verification response
   */
  public is3DResponse(response: EmbeddedPaymentResponse): boolean {
    return is3DResponse(response);
  }

  /**
   * Embedded token payment (Pn subsequent transactions)
   */
  public async embeddedTokenPayment(
    params: EmbeddedTokenPaymentParams
  ): Promise<EmbeddedPaymentResponse> {
    const TimeStamp = Date.now();
    const Version = "2.0";

    const requestBody = {
      MerchantID: this.merchantId,
      TimeStamp,
      Version,
      TokenSwitch: "on" as const,
      ...params,
    };

    const response = await this.postJson(
      this.inframeEndpoint,
      "/NWPJCore/PaymentTC",
      requestBody,
      `Bearer ${this.hashKey}`
    );
    const data = await response.json();

    return data as EmbeddedPaymentResponse;
  }

  public buildTradeInfo(params: { [key: string]: unknown }) {
    const postData = new URLSearchParams(
      params as Record<string, string>
    ).toString();
    const encrypted = this.encryptAESString(postData);
    return encrypted;
  }

  public encryptAESString(plainText: string) {
    const cipher = crypto.createCipheriv("aes256", this.hashKey, this.hashIV);
    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  public buildTradeSha(tradeInfo: string) {
    const hashData = `HashKey=${this.hashKey}&${tradeInfo}&HashIV=${this.hashIV}`;
    const encrypted = crypto
      .createHash("sha256")
      .update(hashData)
      .digest("hex")
      .toUpperCase();
    return encrypted;
  }

  public buildCheckCode(params: { [key: string]: unknown }) {
    const data = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {} as { [key: string]: unknown });

    const paramsStr = new URLSearchParams(
      data as Record<string, string>
    ).toString();
    const checkStr = `HashIV=${this.hashIV}&${paramsStr}&HashKey=${this.hashKey}`;

    return crypto
      .createHash("sha256")
      .update(checkStr)
      .digest("hex")
      .toUpperCase();
  }

  public buildCheckValue(params: { [key: string]: unknown }) {
    const data = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {} as { [key: string]: unknown });

    const paramsStr = new URLSearchParams(
      data as Record<string, string>
    ).toString();
    const checkStr = `IV=${this.hashIV}&${paramsStr}&Key=${this.hashKey}`;

    return crypto
      .createHash("sha256")
      .update(checkStr)
      .digest("hex")
      .toUpperCase();
  }

  public parseCreatePeriodicPaymentResponse(rawResponse: string) {
    const decrypted = this.decryptAESString(rawResponse);
    return JSON.parse(decrypted) as CreatePeriodicPaymentResponse;
  }

  public parsePeriodicPaymentResponse(rawResponse: string) {
    const decrypted = this.decryptAESString(rawResponse);
    return JSON.parse(decrypted) as PeriodicPaymentResponse;
  }

  private getTimeStamp() {
    return Math.floor(new Date().getTime() / 1000).toString();
  }
}

export default NewebpayClient;
