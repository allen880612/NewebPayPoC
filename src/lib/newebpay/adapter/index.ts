/**
 * Payment Adapter Factory
 * 根據環境變數決定使用 PoC 或 SDK 實作
 */
import type { PaymentAdapter } from './interface';
import { PocAdapter } from './poc';
import { SdkAdapter } from './sdk';

export type { PaymentAdapter } from './interface';

// Singleton instances
let _pocAdapter: PocAdapter | null = null;
let _sdkAdapter: SdkAdapter | null = null;

/**
 * 取得 Payment Adapter
 * 預設使用 PoC，設定 NEWEBPAY_USE_SDK=true 可切換至 SDK
 *
 * 注意：SDK 目前有已知問題：
 * 1. Content-Type 使用 multipart/form-data，但 NewebPay 要求 x-www-form-urlencoded
 * 2. Close API 缺少 HashData_ 簽章欄位
 * 這導致 Query/Close API 返回 403，待 SDK 修正後再啟用
 */
export function getAdapter(): PaymentAdapter {
    const useSdk = process.env.NEWEBPAY_USE_SDK === 'true';  // 預設 false (使用 PoC)

    if (useSdk) {
        if (!_sdkAdapter) {
            _sdkAdapter = new SdkAdapter();
        }
        console.log(`[Adapter] Using ${_sdkAdapter.getName()}`);
        return _sdkAdapter;
    } else {
        if (!_pocAdapter) {
            _pocAdapter = new PocAdapter();
        }
        console.log(`[Adapter] Using ${_pocAdapter.getName()}`);
        return _pocAdapter;
    }
}

/**
 * 取得目前使用的 Adapter 名稱
 */
export function getAdapterName(): string {
    const useSdk = process.env.NEWEBPAY_USE_SDK === 'true';
    return useSdk ? 'SDK' : 'PoC';
}
