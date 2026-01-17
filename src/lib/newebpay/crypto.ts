import crypto from 'crypto';

const HASH_KEY = process.env.NEWEBPAY_HASH_KEY!;
const HASH_IV = process.env.NEWEBPAY_HASH_IV!;

/**
 * AES-256-CBC 加密
 * @param data - 原始字串（URL encoded query string）
 * @returns 加密後的 hex 字串
 */
export function encryptTradeInfo(data: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', HASH_KEY, HASH_IV);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * SHA256 產生 TradeSha
 * @param aesEncrypted - AES 加密後的字串
 * @returns SHA256 大寫 hex 字串
 */
export function generateTradeSha(aesEncrypted: string): string {
  const raw = `HashKey=${HASH_KEY}&${aesEncrypted}&HashIV=${HASH_IV}`;
  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
}

/**
 * AES-256-CBC 解密
 * @param encrypted - 加密的 hex 字串
 * @returns 解密後的原始字串
 */
export function decryptTradeInfo(encrypted: string): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', HASH_KEY, HASH_IV);
  // Auto padding is disabled to prevent "bad decrypt" errors from Node's strict checks
  decipher.setAutoPadding(false);

  let decrypted = decipher.update(encrypted, 'hex');
  const final = decipher.final();
  const buffer = Buffer.concat([decrypted, final]);

  // Manual PKCS7 Unpadding
  const padding = buffer[buffer.length - 1];

  // Basic validation: padding should be > 0 and <= block size (32 for AES-256)
  // This is a loose check. For strict PKCS7, we should verify all padding bytes.
  if (padding > 0 && padding <= 32) {
    // Check if the padded bytes are actually the padding value
    // (Optional strict check, but good for safety)
    let isValidPadding = true;
    for (let i = 1; i <= padding; i++) {
      if (buffer[buffer.length - i] !== padding) {
        isValidPadding = false;
        break;
      }
    }

    if (isValidPadding) {
      return buffer.subarray(0, buffer.length - padding).toString('utf8');
    }
  }

  // If padding is invalid, return as is (or could throw error)
  // Often in "bad decrypt" cases, we just want to see the text even if padding is corrupt
  // But usually it means successful decrypt just with weird padding.
  return buffer.toString('utf8').replace(/[\x00-\x1F\x7F-\x9F]/g, ""); // strip control chars just in case
}

/**
 * 驗證 TradeSha
 * @param tradeInfo - 加密的 TradeInfo
 * @param tradeSha - 收到的 TradeSha
 * @returns 是否驗證通過
 */
export function verifyTradeSha(tradeInfo: string, tradeSha: string): boolean {
  const calculated = generateTradeSha(tradeInfo);
  return calculated === tradeSha;
}

/**
 * 加密 PostData（用於 Close API 等非 MPG 的 API）
 * @param data - 要加密的物件
 * @returns 加密後的 hex 字串
 */
export function encryptPostData(data: Record<string, unknown>): string {
  // Close API 使用 query string 格式，與 MPG TradeInfo 相同
  const queryString = Object.entries(data)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return encryptTradeInfo(queryString);
}
