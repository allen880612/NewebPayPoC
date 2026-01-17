'use client';

import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Stack,
    CircularProgress,
    Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentIcon from '@mui/icons-material/Payment';
import type { StoredOrder, QueryResult } from '@/lib/newebpay/types';

interface OrderListProps {
    orders: StoredOrder[];
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
    onRefund: (order: StoredOrder) => void;
    onCapture: (order: StoredOrder) => void;
    onQuery: (order: StoredOrder) => void;
    refundingOrderNo: string | null;
    capturingOrderNo: string | null;
    queryingOrderNo: string | null;
    queryResults: Record<string, QueryResult>;
}

export function OrderList({
    orders,
    loading,
    error,
    onRefresh,
    onRefund,
    onCapture,
    onQuery,
    refundingOrderNo,
    capturingOrderNo,
    queryingOrderNo,
    queryResults,
}: OrderListProps) {
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    共 {orders.length} 筆訂單
                </Typography>
                <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={onRefresh}
                >
                    重新整理
                </Button>
            </Box>

            {orders.length === 0 ? (
                <Card variant="outlined" sx={{ textAlign: 'center', py: 4 }}>
                    <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                        目前沒有訂單紀錄
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        請先到付款頁面完成一筆交易
                    </Typography>
                </Card>
            ) : (
                <Stack spacing={2}>
                    {orders.map((order) => {
                        const queryResult = queryResults[order.merchantOrderNo];
                        const isQuerying = queryingOrderNo === order.merchantOrderNo;
                        const isRefunding = refundingOrderNo === order.merchantOrderNo;
                        const isCapturing = capturingOrderNo === order.merchantOrderNo;
                        const canRefund = queryResult?.canRefund === true;
                        const canCapture = queryResult?.closeStatus === 0; // CloseStatus=0 表示未請款

                        return (
                            <Card key={order.merchantOrderNo} variant="outlined">
                                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <Typography variant="body2" fontFamily="monospace" fontWeight={500}>
                                                    {order.merchantOrderNo}
                                                </Typography>
                                                <Chip
                                                    label={order.status === 'paid' ? '已付款' : '已退款'}
                                                    size="small"
                                                    color={order.status === 'paid' ? 'success' : 'default'}
                                                    variant={order.status === 'paid' ? 'filled' : 'outlined'}
                                                />
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                藍新序號: {order.tradeNo}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {order.payTime} {order.card4No && `| 卡號末四碼: ${order.card4No}`}
                                            </Typography>

                                            {/* 查詢結果狀態顯示 */}
                                            {queryResult && order.status === 'paid' && (
                                                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                                                    <Stack direction="row" spacing={2} flexWrap="wrap">
                                                        <Chip
                                                            label={queryResult.closeStatusText}
                                                            size="small"
                                                            color={queryResult.closeStatus === 3 ? 'success' : 'warning'}
                                                            variant="outlined"
                                                        />
                                                        <Chip
                                                            label={queryResult.backStatusText}
                                                            size="small"
                                                            color={queryResult.backStatus === 0 ? 'default' : 'info'}
                                                            variant="outlined"
                                                        />
                                                    </Stack>
                                                    {!canRefund && queryResult.closeStatus === 0 && (
                                                        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                                                            尚未請款，請先點擊「請款」按鈕或等待 21:00 批次處理
                                                        </Typography>
                                                    )}
                                                    {!canRefund && queryResult.closeStatus !== 0 && queryResult.closeStatus !== 3 && (
                                                        <Typography variant="caption" color="info.main" sx={{ display: 'block', mt: 1 }}>
                                                            請款處理中，請等待 21:00 批次處理完成
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                        <Box sx={{ textAlign: 'right', ml: 2 }}>
                                            <Typography variant="h6" fontWeight={700} color="primary.main">
                                                NT$ {order.amount.toLocaleString()}
                                            </Typography>
                                            {order.status === 'paid' && (
                                                <Stack direction="row" spacing={1} sx={{ mt: 1 }} justifyContent="flex-end" flexWrap="wrap">
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={isQuerying ? <CircularProgress size={14} /> : <SearchIcon />}
                                                        onClick={() => onQuery(order)}
                                                        disabled={isQuerying}
                                                    >
                                                        查詢
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        color="primary"
                                                        size="small"
                                                        startIcon={isCapturing ? <CircularProgress size={14} /> : <PaymentIcon />}
                                                        onClick={() => onCapture(order)}
                                                        disabled={isCapturing || !canCapture}
                                                    >
                                                        請款
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        color="error"
                                                        size="small"
                                                        onClick={() => onRefund(order)}
                                                        disabled={isRefunding || !canRefund}
                                                    >
                                                        {isRefunding ? (
                                                            <CircularProgress size={16} color="inherit" />
                                                        ) : (
                                                            '退款'
                                                        )}
                                                    </Button>
                                                </Stack>
                                            )}
                                            {order.status === 'refunded' && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                                    {order.refundedAt && `退款時間: ${new Date(order.refundedAt).toLocaleString()}`}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Stack>
            )}
        </Box>
    );
}
