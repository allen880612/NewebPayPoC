
// Set dummy env vars for testing before importing crypto
process.env.NEWEBPAY_HASH_KEY = '12345678901234567890123456789012'; // 32 chars
process.env.NEWEBPAY_HASH_IV = '1234567890123456'; // 16 chars

import { encryptTradeInfo, decryptTradeInfo, generateTradeSha, verifyTradeSha } from '../src/lib/newebpay/crypto';

function testCrypto() {
    console.log('Testing Crypto Functions...');

    const originalData = 'MerchantID=TestMerchant&Amt=100&ItemDesc=TestItem';
    console.log('Original:', originalData);

    // 1. Encrypt
    const encrypted = encryptTradeInfo(originalData);
    console.log('Encrypted:', encrypted);

    // 2. Generate SHA
    const sha = generateTradeSha(encrypted);
    console.log('SHA:', sha);

    // 3. Decrypt
    const decrypted = decryptTradeInfo(encrypted);
    console.log('Decrypted:', decrypted);

    if (decrypted !== originalData) {
        console.error('❌ Decryption failed! Mismatch.');
        process.exit(1);
    } else {
        console.log('✅ Decryption verified.');
    }

    // 4. Verify SHA
    const isValid = verifyTradeSha(encrypted, sha);
    if (!isValid) {
        console.error('❌ SHA verification failed!');
        process.exit(1);
    } else {
        console.log('✅ SHA verified.');
    }
}

testCrypto();
