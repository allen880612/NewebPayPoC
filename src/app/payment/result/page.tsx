'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { PaymentResultDialog } from '@/components/payment/PaymentResultDialog';
import type { PaymentResult } from '@/lib/newebpay/types';

function PaymentResultContent() {
    const searchParams = useSearchParams();
    const [result, setResult] = useState<PaymentResult | null>(null);
    const [showDialog, setShowDialog] = useState(false);

    useEffect(() => {
        const status = searchParams.get('Status');
        const message = searchParams.get('Message');
        const tradeNo = searchParams.get('TradeNo');
        const amount = searchParams.get('Amt');
        const card4No = searchParams.get('Card4No');

        console.log('Page Result Params:', { status, message });

        if (!status) {
            return;
        }

        if (status === 'SUCCESS') {
            setResult({
                success: true,
                status: status,
                message: message || '付款成功',
                tradeNo: tradeNo || '',
                amount: amount ? Number(amount) : undefined,
                card4No: card4No || undefined,
            });
        } else {
            setResult({
                success: false,
                status: status,
                message: message || '付款失敗 (Unknown Error)',
            });
        }

        setShowDialog(true);
    }, [searchParams]);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2
            }}
        >
            {!showDialog ? (
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={48} />
                    <Typography color="text.secondary" sx={{ mt: 2 }}>
                        等待付款結果...
                    </Typography>
                </Box>
            ) : (
                <PaymentResultDialog
                    result={result!}
                    onClose={() => {
                        window.location.href = '/poc/newebpay';
                    }}
                />
            )}
        </Box>
    );
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={
            <Box
                sx={{
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <CircularProgress size={48} />
            </Box>
        }>
            <PaymentResultContent />
        </Suspense>
    );
}
