'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Tabs,
    Tab,
    Divider,
    Alert,
    Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { OrderList } from '@/components/refund/OrderList';
import { ManualRefundForm } from '@/components/refund/ManualRefundForm';
import { RefundResultDialog } from '@/components/refund/RefundResultDialog';
import type { StoredOrder, RefundResult, QueryResult, CaptureResult } from '@/lib/newebpay/types';

export default function RefundPoCPage() {
    const [tab, setTab] = useState(0);
    const [orders, setOrders] = useState<StoredOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refundingOrderNo, setRefundingOrderNo] = useState<string | null>(null);
    const [refundResult, setRefundResult] = useState<RefundResult | null>(null);
    const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
    const [queryingOrderNo, setQueryingOrderNo] = useState<string | null>(null);
    const [capturingOrderNo, setCapturingOrderNo] = useState<string | null>(null);
    const [queryResults, setQueryResults] = useState<Record<string, QueryResult>>({});

    // 載入訂單列表
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/orders');
            const data = await response.json();

            if (data.success) {
                setOrders(data.orders);
            } else {
                setError(data.message || '取得訂單失敗');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '網路錯誤');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // 查詢交易狀態
    const handleQuery = async (order: StoredOrder) => {
        setQueryingOrderNo(order.merchantOrderNo);

        try {
            const response = await fetch('/api/payment/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantOrderNo: order.merchantOrderNo,
                    amount: order.amount,
                }),
            });

            const result: QueryResult = await response.json();
            setQueryResults(prev => ({
                ...prev,
                [order.merchantOrderNo]: result,
            }));
        } catch (err) {
            setQueryResults(prev => ({
                ...prev,
                [order.merchantOrderNo]: {
                    success: false,
                    message: err instanceof Error ? err.message : '查詢請求失敗',
                },
            }));
        } finally {
            setQueryingOrderNo(null);
        }
    };

    // 執行退款 (從訂單列表)
    const handleRefund = async (order: StoredOrder) => {
        setRefundingOrderNo(order.merchantOrderNo);

        try {
            const response = await fetch('/api/payment/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantOrderNo: order.merchantOrderNo,
                    amount: order.amount,
                }),
            });

            const result: RefundResult = await response.json();
            setRefundResult(result);

            // 退款成功後重新載入訂單列表
            if (result.success) {
                await fetchOrders();
            }
        } catch (err) {
            setRefundResult({
                success: false,
                status: 'REQUEST_ERROR',
                message: err instanceof Error ? err.message : '退款請求失敗',
            });
        } finally {
            setRefundingOrderNo(null);
        }
    };

    // 執行請款
    const handleCapture = async (order: StoredOrder) => {
        setCapturingOrderNo(order.merchantOrderNo);

        try {
            const response = await fetch('/api/payment/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tradeNo: order.tradeNo,
                    merchantOrderNo: order.merchantOrderNo,
                    amount: order.amount,
                }),
            });

            const result: CaptureResult = await response.json();
            setCaptureResult(result);

            // 請款成功後重新查詢狀態
            if (result.success) {
                await handleQuery(order);
            }
        } catch (err) {
            setCaptureResult({
                success: false,
                status: 'REQUEST_ERROR',
                message: err instanceof Error ? err.message : '請款請求失敗',
            });
        } finally {
            setCapturingOrderNo(null);
        }
    };

    // 手動退款
    const handleManualRefund = async (merchantOrderNo: string, amount: number) => {
        try {
            const response = await fetch('/api/payment/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantOrderNo,
                    amount,
                    manual: true,
                }),
            });

            const result: RefundResult = await response.json();
            setRefundResult(result);

            // 成功後重新載入（可能有對應的本地訂單）
            if (result.success) {
                await fetchOrders();
            }
        } catch (err) {
            setRefundResult({
                success: false,
                status: 'REQUEST_ERROR',
                message: err instanceof Error ? err.message : '退款請求失敗',
            });
        }
    };

    // 關閉結果 Dialog
    const handleCloseRefundResult = () => {
        setRefundResult(null);
    };

    const handleCloseCaptureResult = () => {
        setCaptureResult(null);
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
            <Container maxWidth="md">
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Button
                        component={Link}
                        href="/poc/newebpay"
                        startIcon={<ArrowBackIcon />}
                        sx={{ mb: 2 }}
                    >
                        返回付款頁面
                    </Button>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        退款測試 (PoC)
                    </Typography>
                    <Typography color="text.secondary">
                        測試藍新金流信用卡退款 API (Close API B032)
                    </Typography>
                </Box>

                {/* Main Card */}
                <Card elevation={3}>
                    <CardContent sx={{ p: 0 }}>
                        {/* Tabs */}
                        <Tabs
                            value={tab}
                            onChange={(_, v) => setTab(v)}
                            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                        >
                            <Tab label="訂單列表" />
                            <Tab label="手動輸入" />
                        </Tabs>

                        <Box sx={{ p: 3 }}>
                            {/* Tab 0: 訂單列表 */}
                            {tab === 0 && (
                                <>
                                    <Alert severity="info" sx={{ mb: 3 }}>
                                        點擊「查詢」確認交易狀態，<strong>CloseStatus=3 (請款完成)</strong> 後才能退款。
                                        <br />
                                        <Typography variant="caption" component="span">
                                            請款批次處理時間：每日 21:00
                                        </Typography>
                                    </Alert>
                                    <OrderList
                                        orders={orders}
                                        loading={loading}
                                        error={error}
                                        onRefresh={fetchOrders}
                                        onRefund={handleRefund}
                                        onCapture={handleCapture}
                                        onQuery={handleQuery}
                                        refundingOrderNo={refundingOrderNo}
                                        capturingOrderNo={capturingOrderNo}
                                        queryingOrderNo={queryingOrderNo}
                                        queryResults={queryResults}
                                    />
                                </>
                            )}

                            {/* Tab 1: 手動輸入 */}
                            {tab === 1 && (
                                <ManualRefundForm
                                    onSubmit={handleManualRefund}
                                    loading={refundingOrderNo !== null}
                                />
                            )}
                        </Box>
                    </CardContent>
                </Card>

                {/* Info */}
                <Box sx={{ mt: 3 }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                        <strong>API 端點:</strong> POST /api/payment/refund
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        <strong>藍新 API:</strong> https://ccore.newebpay.com/API/CreditCard/Close (測試站)
                    </Typography>
                </Box>
            </Container>

            {/* Refund Result Dialog */}
            {refundResult && (
                <RefundResultDialog
                    result={refundResult}
                    onClose={handleCloseRefundResult}
                />
            )}

            {/* Capture Result Dialog */}
            {captureResult && (
                <RefundResultDialog
                    result={captureResult}
                    onClose={handleCloseCaptureResult}
                    title={captureResult.success ? '請款成功' : '請款失敗'}
                />
            )}
        </Box>
    );
}
