'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import type { CreatePaymentResponse } from '@/lib/newebpay/types';

interface PaymentFormProps {
    paymentData: CreatePaymentResponse;
    autoSubmit?: boolean;
}

export function PaymentForm({ paymentData, autoSubmit = false }: PaymentFormProps) {
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (autoSubmit && formRef.current) {
            formRef.current.submit();
        }
    }, [autoSubmit]);

    return (
        <form ref={formRef} method="POST" action={paymentData.PaymentUrl} style={{ display: autoSubmit ? 'none' : 'block' }}>
            <input type="hidden" name="MerchantID" value={paymentData.MerchantID} />
            <input type="hidden" name="TradeInfo" value={paymentData.TradeInfo} />
            <input type="hidden" name="TradeSha" value={paymentData.TradeSha} />
            <input type="hidden" name="Version" value={paymentData.Version} />

            {!autoSubmit && (
                <Button
                    type="submit"
                    variant="contained"
                    color="success"
                    fullWidth
                    startIcon={<CreditCardIcon />}
                    sx={{ py: 1.5 }}
                >
                    前往藍新金流付款
                </Button>
            )}
        </form>
    );
}
