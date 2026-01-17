export const NEWEBPAY_CONFIG = {
    // MPG URLs (付款)
    TEST_MPG_URL: 'https://ccore.newebpay.com/MPG/mpg_gateway',
    PROD_MPG_URL: 'https://core.newebpay.com/MPG/mpg_gateway',

    // Credit Card Close URLs (請款/退款)
    TEST_CLOSE_URL: 'https://ccore.newebpay.com/API/CreditCard/Close',
    PROD_CLOSE_URL: 'https://core.newebpay.com/API/CreditCard/Close',

    // Query URLs (交易查詢)
    TEST_QUERY_URL: 'https://ccore.newebpay.com/API/QueryTradeInfo',
    PROD_QUERY_URL: 'https://core.newebpay.com/API/QueryTradeInfo',

    // API 版本
    VERSION: '2.0',           // MPG 版本
    CLOSE_VERSION: '1.1',     // 請款/退款 API 版本
    QUERY_VERSION: '1.3',     // 查詢 API 版本

    // 回應格式
    RESPOND_TYPE: 'JSON',

    // 測試卡號
    TEST_CARD: {
        NUMBER: '4000-2211-1111-1111',
        EXPIRY: '12/30', // 任意未過期日期
        CVV: '222',
    },
} as const;

// 判斷是否為測試環境
export const isTestEnv = () => {
    return process.env.NODE_ENV !== 'production' ||
        process.env.NEWEBPAY_API_URL?.includes('ccore');
};

// 取得 MPG URL
export const getMpgUrl = () => {
    return isTestEnv()
        ? NEWEBPAY_CONFIG.TEST_MPG_URL
        : NEWEBPAY_CONFIG.PROD_MPG_URL;
};

// 取得 Close URL (請款/退款)
export const getCloseUrl = () => {
    return isTestEnv()
        ? NEWEBPAY_CONFIG.TEST_CLOSE_URL
        : NEWEBPAY_CONFIG.PROD_CLOSE_URL;
};

// 取得 Query URL (交易查詢)
export const getQueryUrl = () => {
    return isTestEnv()
        ? NEWEBPAY_CONFIG.TEST_QUERY_URL
        : NEWEBPAY_CONFIG.PROD_QUERY_URL;
};
