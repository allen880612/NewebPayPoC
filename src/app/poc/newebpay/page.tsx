'use client';

import { useState } from 'react';
import {
    Box,
    Container,
    Stepper,
    Step,
    StepLabel,
    Card,
    CardContent,
    CardMedia,
    Typography,
    Button,
    Chip,
    Stack,
    Alert,
    Divider,
    CircularProgress,
    Fade,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentIcon from '@mui/icons-material/Payment';
import { PaymentForm } from '@/components/payment/PaymentForm';
import type { CreatePaymentResponse } from '@/lib/newebpay/types';

type CheckoutStep = 'PRODUCT' | 'CONFIRM' | 'PROCESSING';

const MOCK_PRODUCT = {
    id: 'course_001',
    name: '線上課程 - React 進階實戰',
    description: '包含 20 小時影片 + 專案實作',
    originalPrice: 1500,
    discounts: [
        { name: '早鳥優惠 (9折)', amount: 150 },
        { name: '首次購課優惠 (-150)', amount: 150 },
    ]
};

const FINAL_PRICE = MOCK_PRODUCT.originalPrice - MOCK_PRODUCT.discounts.reduce((acc, curr) => acc + curr.amount, 0);

const steps = ['選擇商品', '確認訂單', '付款'];

function getActiveStep(step: CheckoutStep): number {
    switch (step) {
        case 'PRODUCT': return 0;
        case 'CONFIRM': return 1;
        case 'PROCESSING': return 2;
        default: return 0;
    }
}

export default function NewebPayPoCPage() {
    const [step, setStep] = useState<CheckoutStep>('PRODUCT');
    const [paymentData, setPaymentData] = useState<CreatePaymentResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const generateOrderId = () => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `ORD${timestamp}${random}`.substring(0, 20);
    };

    const handleProceedToConfirm = () => {
        setStep('CONFIRM');
    };

    const handleConfirmPayment = async () => {
        setStep('PROCESSING');
        setError(null);

        try {
            const orderId = generateOrderId();

            const response = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    amount: FINAL_PRICE,
                    itemDesc: MOCK_PRODUCT.name,
                    email: 'test@example.com',
                }),
            });

            if (!response.ok) {
                throw new Error('建立訂單失敗');
            }

            const data: CreatePaymentResponse = await response.json();
            setPaymentData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStep('CONFIRM');
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6, px: 2 }}>
            <Container maxWidth="sm">
                {/* Stepper */}
                <Stepper activeStep={getActiveStep(step)} alternativeLabel sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* Main Content Card */}
                <Card elevation={3}>
                    <CardContent sx={{ p: 3 }}>
                        {/* Error Alert */}
                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {error}
                            </Alert>
                        )}

                        {/* STEP 1: Product View */}
                        <Fade in={step === 'PRODUCT'} unmountOnExit>
                            <Box sx={{ display: step === 'PRODUCT' ? 'block' : 'none' }}>
                                <CardMedia
                                    component="img"
                                    height="200"
                                    image="https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=1000"
                                    alt="Product"
                                    sx={{ borderRadius: 2, mb: 3 }}
                                />

                                <Typography variant="h5" gutterBottom>
                                    {MOCK_PRODUCT.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    {MOCK_PRODUCT.description}
                                </Typography>

                                <Divider sx={{ mb: 3 }} />

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
                                    <Stack direction="column" spacing={1}>
                                        <Chip
                                            label="早鳥優惠"
                                            size="small"
                                            color="error"
                                            variant="outlined"
                                        />
                                        <Chip
                                            label="首次購課"
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </Stack>

                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography
                                            variant="body2"
                                            sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
                                        >
                                            原價 NT$ {MOCK_PRODUCT.originalPrice.toLocaleString()}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, justifyContent: 'flex-end' }}>
                                            <Typography variant="body2" color="error.main" fontWeight={500}>
                                                特價
                                            </Typography>
                                            <Typography variant="h4" color="error.main" fontWeight={700}>
                                                NT$ {FINAL_PRICE.toLocaleString()}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    fullWidth
                                    startIcon={<ShoppingCartIcon />}
                                    onClick={handleProceedToConfirm}
                                    sx={{ py: 1.5 }}
                                >
                                    立即購買
                                </Button>
                            </Box>
                        </Fade>

                        {/* STEP 2: Confirm View */}
                        <Fade in={step === 'CONFIRM'} unmountOnExit>
                            <Box sx={{ display: step === 'CONFIRM' ? 'block' : 'none' }}>
                                <Typography variant="h6" gutterBottom sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
                                    課程內容
                                </Typography>
                                <Stack spacing={2} sx={{ mb: 3, mt: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography color="text.secondary">課程名稱</Typography>
                                        <Typography fontWeight={500}>{MOCK_PRODUCT.name}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography color="text.secondary">課程說明</Typography>
                                        <Typography variant="body2" sx={{ textAlign: 'right' }}>
                                            {MOCK_PRODUCT.description}
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Typography variant="h6" gutterBottom sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
                                    訂單摘要
                                </Typography>
                                <Stack spacing={2} sx={{ mb: 3, mt: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography color="text.secondary">商品原價</Typography>
                                        <Typography>NT$ {MOCK_PRODUCT.originalPrice.toLocaleString()}</Typography>
                                    </Box>
                                    {MOCK_PRODUCT.discounts.map((discount, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography color="success.main">{discount.name}</Typography>
                                            <Typography color="success.main">- NT$ {discount.amount.toLocaleString()}</Typography>
                                        </Box>
                                    ))}
                                    <Divider />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography fontWeight={700}>應付總額</Typography>
                                        <Typography variant="h5" color="error.main" fontWeight={700}>
                                            NT$ {FINAL_PRICE.toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" spacing={2}>
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        startIcon={<ArrowBackIcon />}
                                        onClick={() => setStep('PRODUCT')}
                                        sx={{ flex: 1 }}
                                    >
                                        上一步
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<PaymentIcon />}
                                        onClick={handleConfirmPayment}
                                        sx={{ flex: 2 }}
                                    >
                                        確認付款
                                    </Button>
                                </Stack>
                            </Box>
                        </Fade>

                        {/* STEP 3: Processing View */}
                        <Fade in={step === 'PROCESSING'} unmountOnExit>
                            <Box sx={{
                                display: step === 'PROCESSING' ? 'flex' : 'none',
                                flexDirection: 'column',
                                alignItems: 'center',
                                py: 4
                            }}>
                                <CircularProgress size={64} thickness={4} sx={{ mb: 3 }} />
                                <Typography variant="h6" fontWeight={600}>
                                    正在連接銀行端...
                                </Typography>
                                <Typography color="text.secondary" sx={{ mt: 1 }}>
                                    請勿關閉視窗，即將跳轉至付款頁面
                                </Typography>

                                {paymentData && (
                                    <PaymentForm paymentData={paymentData} autoSubmit={true} />
                                )}
                            </Box>
                        </Fade>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}
