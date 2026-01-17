'use client';

import { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Alert,
    CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface ManualRefundFormProps {
    onSubmit: (merchantOrderNo: string, amount: number) => Promise<void>;
    loading: boolean;
}

export function ManualRefundForm({ onSubmit, loading }: ManualRefundFormProps) {
    const [merchantOrderNo, setMerchantOrderNo] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // 驗證
        if (!merchantOrderNo.trim()) {
            setError('請輸入訂單編號');
            return;
        }

        const amountNum = parseInt(amount, 10);
        if (isNaN(amountNum) || amountNum <= 0) {
            setError('請輸入有效的金額');
            return;
        }

        await onSubmit(merchantOrderNo.trim(), amountNum);
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3 }}>
                手動輸入模式：直接輸入訂單資訊進行退款，不會驗證本地訂單紀錄。
            </Alert>

            <TextField
                label="訂單編號 (MerchantOrderNo)"
                value={merchantOrderNo}
                onChange={(e) => setMerchantOrderNo(e.target.value)}
                fullWidth
                required
                sx={{ mb: 2 }}
                placeholder="例: ORD1234567890ABCDEF"
                disabled={loading}
            />

            <TextField
                label="退款金額 (NT$)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                required
                type="number"
                sx={{ mb: 3 }}
                placeholder="例: 1200"
                disabled={loading}
                slotProps={{
                    input: { inputProps: { min: 1 } }
                }}
            />

            <Button
                type="submit"
                variant="contained"
                color="error"
                fullWidth
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            >
                {loading ? '處理中...' : '執行退款'}
            </Button>
        </Box>
    );
}
