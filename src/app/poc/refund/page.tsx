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
    Chip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import Link from 'next/link';
import { OrderList } from '@/components/refund/OrderList';
import { ManualRefundForm } from '@/components/refund/ManualRefundForm';
import { RefundResultDialog } from '@/components/refund/RefundResultDialog';
import { SmartRefundResultDialog } from '@/components/refund/SmartRefundResultDialog';
import type { SmartRefundResult } from '@/lib/newebpay/smart-refund';
import { BatchRefundPanel } from '@/components/refund/BatchRefundPanel';
import type { OrderWithTransaction, RefundResult, QueryResult, CaptureResult } from '@/lib/newebpay/types';

export default function RefundPoCPage() {
    const [tab, setTab] = useState(0);
    const [orders, setOrders] = useState<OrderWithTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refundingOrderNo, setRefundingOrderNo] = useState<string | null>(null);
    const [smartRefundOrderNo, setSmartRefundOrderNo] = useState<string | null>(null);
    const [refundResult, setRefundResult] = useState<RefundResult | null>(null);
    const [smartRefundResult, setSmartRefundResult] = useState<SmartRefundResult | null>(null);
    const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
    const [queryingOrderNo, setQueryingOrderNo] = useState<string | null>(null);
    const [capturingOrderNo, setCapturingOrderNo] = useState<string | null>(null);
    const [queryResults, setQueryResults] = useState<Record<string, QueryResult>>({});
    const [smartRefundEnabled, setSmartRefundEnabled] = useState(true);
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        orderNo: string;
        amount: number;
        onConfirm: () => void;
    } | null>(null);

    // 取得設定
    useEffect(() => {
        // Use NEXT_PUBLIC env var for smart refund setting
        const envVal = process.env.NEXT_PUBLIC_SMART_REFUND;
        if (envVal !== undefined) {
            setSmartRefundEnabled(envVal !== 'false');
        }
    }, []);

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
    const handleQuery = async (order: OrderWithTransaction) => {
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

    // 執行傳統退款 (從訂單列表)
    const handleRefund = async (order: OrderWithTransaction) => {
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

    // 智慧退款（帶確認）
    const handleSmartRefundWithConfirm = (order: OrderWithTransaction) => {
        setConfirmDialog({
            open: true,
            orderNo: order.merchantOrderNo,
            amount: order.amount,
            onConfirm: () => {
                setConfirmDialog(null);
                handleSmartRefund(order);
            },
        });
    };

    // 智慧退款
    const handleSmartRefund = async (order: OrderWithTransaction) => {
        setRefundingOrderNo(order.merchantOrderNo);
        setSmartRefundOrderNo(order.merchantOrderNo);

        try {
            const response = await fetch('/api/payment/smart-refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantOrderNo: order.merchantOrderNo,
                }),
            });

            const result: SmartRefundResult = await response.json();
            setSmartRefundResult(result);

            if (result.success) {
                await fetchOrders();
            }
        } catch (err) {
            setSmartRefundResult({
                success: false,
                decision: { action: 'unknown', description: '請求失敗', canExecute: false },
                steps: [],
                finalMessage: err instanceof Error ? err.message : '智慧退款請求失敗',
            });
        } finally {
            setRefundingOrderNo(null);
        }
    };

    // 加入退款佇列 (非智慧退款模式)
    const handleAddToQueue = async (order: OrderWithTransaction) => {
        setRefundingOrderNo(order.merchantOrderNo);

        try {
            const response = await fetch('/api/payment/refund-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantOrderNo: order.merchantOrderNo,
                    tradeNo: order.transaction?.tradeNo || '',
                    amount: order.amount,
                }),
            });

            const result = await response.json();
            if (result.success !== false) {
                setRefundResult({
                    success: true,
                    status: 'QUEUED',
                    message: '退款請求已加入佇列，將於批次處理時執行',
                    merchantOrderNo: order.merchantOrderNo,
                    amount: order.amount,
                });
            } else {
                setRefundResult({
                    success: false,
                    status: 'QUEUE_ERROR',
                    message: result.message || '加入佇列失敗',
                });
            }
        } catch (err) {
            setRefundResult({
                success: false,
                status: 'REQUEST_ERROR',
                message: err instanceof Error ? err.message : '請求失敗',
            });
        } finally {
            setRefundingOrderNo(null);
        }
    };

    // 執行請款
    const handleCapture = async (order: OrderWithTransaction) => {
        setCapturingOrderNo(order.merchantOrderNo);

        try {
            const response = await fetch('/api/payment/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tradeNo: order.transaction?.tradeNo || '',
                    merchantOrderNo: order.merchantOrderNo,
                    amount: order.amount,
                }),
            });

            const result: CaptureResult = await response.json();
            setCaptureResult(result);

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

    // 手動退款（帶確認）
    const handleManualRefundWithConfirm = async (merchantOrderNo: string, amount: number) => {
        setConfirmDialog({
            open: true,
            orderNo: merchantOrderNo,
            amount,
            onConfirm: () => {
                setConfirmDialog(null);
                handleManualRefund(merchantOrderNo, amount);
            },
        });
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
    const handleCloseRefundResult = () => setRefundResult(null);
    const handleCloseSmartRefundResult = () => setSmartRefundResult(null);
    const handleCloseCaptureResult = () => setCaptureResult(null);

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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            退款管理 (PoC)
                        </Typography>
                        <Chip
                            icon={<AutoFixHighIcon />}
                            label={smartRefundEnabled ? '智慧退款' : '批次退款'}
                            color={smartRefundEnabled ? 'primary' : 'default'}
                            variant="outlined"
                            size="small"
                        />
                    </Box>
                    <Typography color="text.secondary">
                        測試藍新金流信用卡退款 API — 支援智慧退款 / 批次退款
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
                            <Tab label="批次退款" />
                        </Tabs>

                        <Box sx={{ p: 3 }}>
                            {/* Tab 0: 訂單列表 */}
                            {tab === 0 && (
                                <>
                                    <Alert severity="info" sx={{ mb: 3 }}>
                                        {smartRefundEnabled ? (
                                            <>
                                                <strong>智慧退款模式</strong>：系統會自動判斷交易狀態，選擇最佳退款方式（取消授權/取消請款/標準退款）。
                                            </>
                                        ) : (
                                            <>
                                                <strong>批次退款模式</strong>：點擊「加入退款佇列」後，前往「批次退款」頁籤執行。
                                                <br />
                                                <Typography variant="caption" component="span">
                                                    請款批次處理時間：每日 21:00
                                                </Typography>
                                            </>
                                        )}
                                    </Alert>
                                    <OrderList
                                        orders={orders}
                                        loading={loading}
                                        error={error}
                                        smartRefundEnabled={smartRefundEnabled}
                                        onRefresh={fetchOrders}
                                        onRefund={handleRefund}
                                        onSmartRefund={handleSmartRefundWithConfirm}
                                        onAddToQueue={handleAddToQueue}
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
                                    onSubmit={handleManualRefundWithConfirm}
                                    loading={refundingOrderNo !== null}
                                />
                            )}

                            {/* Tab 2: 批次退款 */}
                            {tab === 2 && (
                                <BatchRefundPanel />
                            )}
                        </Box>
                    </CardContent>
                </Card>

                {/* Info */}
                <Box sx={{ mt: 3 }}>
                    <Divider sx={{ my: 2 }} />
                    <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                            <strong>API 端點:</strong> POST /api/payment/refund | POST /api/payment/smart-refund | POST /api/payment/batch-refund
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            <strong>藍新 API:</strong> Close (請款/退款) | Cancel (取消授權) | QueryTradeInfo (查詢)
                        </Typography>
                    </Stack>
                </Box>
            </Container>

            {/* Refund Result Dialog */}
            {refundResult && (
                <RefundResultDialog
                    result={refundResult}
                    onClose={handleCloseRefundResult}
                />
            )}

            {/* Smart Refund Result Dialog */}
            {smartRefundResult && (
                <SmartRefundResultDialog
                    result={smartRefundResult}
                    merchantOrderNo={smartRefundOrderNo || ''}
                    onClose={handleCloseSmartRefundResult}
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

            {/* Refund Confirm Dialog */}
            <Dialog
                open={confirmDialog?.open ?? false}
                onClose={() => setConfirmDialog(null)}
            >
                <DialogTitle>確認退款</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        確定要對訂單 <strong>{confirmDialog?.orderNo}</strong> 執行退款
                        {' '}NT$ {confirmDialog?.amount?.toLocaleString()} ？
                    </DialogContentText>
                    <DialogContentText sx={{ mt: 1, fontSize: '0.85rem', color: 'text.secondary' }}>
                        退款送出後，撤回操作受限於銀行處理時效。
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog(null)}>
                        取消
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmDialog?.onConfirm}
                    >
                        確認退款
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
