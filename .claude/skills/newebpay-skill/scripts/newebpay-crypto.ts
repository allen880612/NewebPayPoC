/**
 * è—æ–°é‡‘æµ NewebPay åŠ è§£å¯†å·¥å…·
 * 
 * ä½¿ç”¨æ–¹å¼:
 *   npx ts-node newebpay-crypto.ts encrypt <data> <hashKey> <hashIV>
 *   npx ts-node newebpay-crypto.ts decrypt <encrypted> <hashKey> <hashIV>
 *   npx ts-node newebpay-crypto.ts sha256 <aesEncrypted> <hashKey> <hashIV>
 *   npx ts-node newebpay-crypto.ts checkcode <amt> <merchantId> <orderNo> <tradeNo> <hashKey> <hashIV>
 */

import crypto from 'crypto';

// ============ AES-256-CBC åŠ å¯† ============
export function aesEncrypt(data: string, hashKey: string, hashIV: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', hashKey, hashIV);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// ============ AES-256-CBC è§£å¯† ============
export function aesDecrypt(encrypted: string, hashKey: string, hashIV: string): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', hashKey, hashIV);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ============ SHA256 ç°½ç«  (TradeSha) ============
export function sha256Hash(aesEncrypted: string, hashKey: string, hashIV: string): string {
  const raw = `HashKey=${hashKey}&${aesEncrypted}&HashIV=${hashIV}`;
  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
}

// ============ CheckCode ç”¢ç”Ÿ (ç”¨æ–¼é©—è­‰å›žå‚³çµæžœ) ============
export function generateCheckCode(
  amt: number,
  merchantId: string,
  merchantOrderNo: string,
  tradeNo: string,
  hashKey: string,
  hashIV: string
): string {
  // ä¾ç…§ A-Z æŽ’åº: Amt, MerchantID, MerchantOrderNo, TradeNo
  const checkStr = `Amt=${amt}&MerchantID=${merchantId}&MerchantOrderNo=${merchantOrderNo}&TradeNo=${tradeNo}`;
  const raw = `HashIV=${hashIV}&${checkStr}&HashKey=${hashKey}`;
  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
}

// ============ CheckValue ç”¢ç”Ÿ (ç”¨æ–¼æŸ¥è©¢ API) ============
export function generateCheckValue(
  amt: number,
  merchantId: string,
  merchantOrderNo: string,
  hashKey: string,
  hashIV: string
): string {
  // ä¾ç…§ A-Z æŽ’åº: Amt, MerchantID, MerchantOrderNo
  const checkStr = `Amt=${amt}&MerchantID=${merchantId}&MerchantOrderNo=${merchantOrderNo}`;
  const raw = `IV=${hashIV}&${checkStr}&Key=${hashKey}`;
  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
}

// ============ å»ºç«‹ MPG TradeInfo ============
export interface MPGTradeInfoParams {
  MerchantID: string;
  RespondType: 'JSON' | 'String';
  TimeStamp: number;
  Version: string;
  MerchantOrderNo: string;
  Amt: number;
  ItemDesc: string;
  NotifyURL?: string;
  ReturnURL?: string;
  ClientBackURL?: string;
  Email?: string;
  CREDIT?: 0 | 1;
  InstFlag?: string; // '3,6,12' ç­‰
  WEBATM?: 0 | 1;
  VACC?: 0 | 1;
  CVS?: 0 | 1;
  BARCODE?: 0 | 1;
  [key: string]: string | number | undefined;
}

export function buildTradeInfo(params: MPGTradeInfoParams): string {
  const filtered = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return filtered;
}

// ============ è§£æžå›žå‚³çš„ TradeInfo ============
export function parseTradeInfo(decrypted: string): Record<string, string> {
  // URL encoded string or JSON
  if (decrypted.startsWith('{')) {
    return JSON.parse(decrypted);
  }
  
  const result: Record<string, string> = {};
  const pairs = decrypted.split('&');
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    const value = valueParts.join('=');
    result[key] = decodeURIComponent(value);
  }
  return result;
}

// ============ å®Œæ•´ MPG è«‹æ±‚å»ºæ§‹ ============
export interface MPGRequestPayload {
  MerchantID: string;
  TradeInfo: string;
  TradeSha: string;
  Version: string;
  EncryptType?: number;
}

export function buildMPGRequest(
  tradeInfoParams: MPGTradeInfoParams,
  hashKey: string,
  hashIV: string
): MPGRequestPayload {
  const tradeInfoStr = buildTradeInfo(tradeInfoParams);
  const encrypted = aesEncrypt(tradeInfoStr, hashKey, hashIV);
  const sha = sha256Hash(encrypted, hashKey, hashIV);
  
  return {
    MerchantID: tradeInfoParams.MerchantID,
    TradeInfo: encrypted,
    TradeSha: sha,
    Version: tradeInfoParams.Version,
    EncryptType: 0,
  };
}

// ============ CLI åŸ·è¡Œ ============
if (require.main === module) {
  const [, , command, ...args] = process.argv;
  
  switch (command) {
    case 'encrypt': {
      const [data, hashKey, hashIV] = args;
      console.log(aesEncrypt(data, hashKey, hashIV));
      break;
    }
    case 'decrypt': {
      const [encrypted, hashKey, hashIV] = args;
      console.log(aesDecrypt(encrypted, hashKey, hashIV));
      break;
    }
    case 'sha256': {
      const [aesEncrypted, hashKey, hashIV] = args;
      console.log(sha256Hash(aesEncrypted, hashKey, hashIV));
      break;
    }
    case 'checkcode': {
      const [amt, merchantId, orderNo, tradeNo, hashKey, hashIV] = args;
      console.log(generateCheckCode(Number(amt), merchantId, orderNo, tradeNo, hashKey, hashIV));
      break;
    }
    case 'checkvalue': {
      const [amt, merchantId, orderNo, hashKey, hashIV] = args;
      console.log(generateCheckValue(Number(amt), merchantId, orderNo, hashKey, hashIV));
      break;
    }
    default:
      console.log(`
Usage:
  npx ts-node newebpay-crypto.ts encrypt <data> <hashKey> <hashIV>
  npx ts-node newebpay-crypto.ts decrypt <encrypted> <hashKey> <hashIV>
  npx ts-node newebpay-crypto.ts sha256 <aesEncrypted> <hashKey> <hashIV>
  npx ts-node newebpay-crypto.ts checkcode <amt> <merchantId> <orderNo> <tradeNo> <hashKey> <hashIV>
  npx ts-node newebpay-crypto.ts checkvalue <amt> <merchantId> <orderNo> <hashKey> <hashIV>
      `);
  }
}
