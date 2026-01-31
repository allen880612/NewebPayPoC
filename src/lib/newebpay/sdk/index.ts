/**
 * Based on newebpay-mpg-sdk by Wen-Hong Huang
 * Original: https://github.com/depresto/newebpay-mpg-sdk
 * License: MIT
 *
 * Modified for internal use with bug fixes:
 * - Fixed Content-Type from multipart/form-data to x-www-form-urlencoded
 * - Added HashData_ to Close API requests
 * - Replaced axios with native fetch
 */

// Client
export { NewebpayClient } from "./newebpay.client";

// Type re-exports
export type { AddMerchantParams } from "./interfaces/merchant/AddMerchantParams";
export type { ModifyMerchantParams } from "./interfaces/merchant/ModifyMerchantParams";
export type { ChargeMerchantParams } from "./interfaces/merchant/ChargeMerchantParams";
export type { ChargeMerchantResult } from "./interfaces/merchant/ChargeMerchantResult";
export type { CancelCreditCardParams } from "./interfaces/creditCard/CancelCreditCardParams";
export type { CreditCardAgreementTokenParams } from "./interfaces/creditCard/CreditCardAgreementTokenParams";
export type { CreditCardPaymentParams } from "./interfaces/creditCard/CreditCardPaymentParams";
export type { RefundCreditCardParams } from "./interfaces/creditCard/RefundCreditCardParams";
export type { GetPaymentFormHTMLParams } from "./interfaces/mpg/GetPaymentFormHTMLParams";
export type { QueryTradeInfoParams } from "./interfaces/QueryTradeInfoParams";
export type { RefundEWalletParams } from "./interfaces/RefundEWalletParams";
export type { TradeInfo } from "./interfaces/TradeInfo";
export type { TradeInfoResult } from "./interfaces/TradeInfoResult";
export type { CreatePeriodicPaymentHTMLParams } from "./interfaces/period/CreatePeriodicPaymentHTMLParams";
export type { CreatePeriodicPaymentResponse, CreatePeriodicPaymentResult } from "./interfaces/period/CreatePeriodicPaymentResult";
export type { PeriodicPaymentResponse } from "./interfaces/period/PeriodicPaymentResponse";
export type { AlterPeriodicPaymentStatusParams } from "./interfaces/period/AlterPeriodicPaymentStatusParams";
export type { AlterPeriodicPaymentStatusResponse } from "./interfaces/period/AlterPeriodicPaymentStatusResponse";
export type { AlterPeriodicPaymentAmountResponse } from "./interfaces/period/AlterPeriodicPaymentAmountResponse";
export type { AlterPeriodicPaymentAmountParams } from "./interfaces/period/AlterPeriodicPaymentAmountParams";
export type { TokenPaymentParams } from "./interfaces/creditCard/TokenPaymentParams";
export type { TokenPaymentResponse } from "./interfaces/creditCard/TokenPaymentResponse";
export type { QueryTokenStatusParams } from "./interfaces/creditCard/QueryTokenStatusParams";
export type { QueryTokenStatusResponse } from "./interfaces/creditCard/QueryTokenStatusResponse";
export type { UnbindTokenParams } from "./interfaces/creditCard/UnbindTokenParams";
export type { UnbindTokenResponse } from "./interfaces/creditCard/UnbindTokenResponse";
export type { EmbeddedPaymentParams } from "./interfaces/embedded/EmbeddedPaymentParams";
export type { EmbeddedTokenPaymentParams } from "./interfaces/embedded/EmbeddedTokenPaymentParams";

// Runtime exports (functions and types with runtime values)
export {
  type EmbeddedPaymentResponse,
  type EmbeddedPaymentResult,
  type Embedded3DResponse,
  type EmbeddedSuccessResponse,
  is3DResponse,
  isSuccessResponse,
} from "./interfaces/embedded/EmbeddedPaymentResponse";

export { NewebpayClient as default } from "./newebpay.client";
