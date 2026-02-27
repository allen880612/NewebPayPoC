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
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AddIcon from '@mui/icons-material/Add';
import type { OrderWithTransaction, OrderStatus, QueryResult } from '@/lib/newebpay/types';

interface OrderListProps {
    orders: OrderWithTransaction[];
    loading: boolean;
    error: string | null;
    smartRefundEnabled: boolean;
    onRefresh: () => void;
    onRefund: (order: OrderWithTransaction) => void;
    onSmartRefund: (order: OrderWithTransaction) => void;
    onAddToQueue: (order: OrderWithTransaction) => void;
    onCapture: (order: OrderWithTransaction) => void;
    onQuery: (order: OrderWithTransaction) => void;
    refundingOrderNo: string | null;
    capturingOrderNo: string | null;
    queryingOrderNo: string | null;
    queryResults: Record<string, QueryResult>;
}

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
    pending: { label: '待付款', color: 'default' },
    paid: { label: '已付款', color: 'success' },
    refunding: { label: '退款中', color: 'warning' },
    refunded: { label: '已退款', color: 'default' },
    cancelled: { label: '已取消', color: 'default' },
    failed: { label: '失敗', color: 'error' },
};

function getCloseStatusText(status: number): string {
    switch (status) {
        case 0: return '未請款';
        case 1: return '等待請款';
        case 2: return '請款處理中';
        case 3: return '請款完成';
        default: return `未知(${status})`;
    }
}

function getCloseStatusColor(status: number): 'default' | 'warning' | 'info' | 'success' {
    switch (status) {
        case 0: return 'default';
        case 1: return 'warning';
        case 2: return 'info';
        case 3: return 'success';
        default: return 'default';
    }
}

function getBackStatusText(status: number): string {
    switch (status) {
        case 0: return '未退款';
        case 1: return '等待退款';
        case 2: return '退款處理中';
        case 3: return '退款完成';
        default: return `未知(${status})`;
    }
}

function getBackStatusColor(status: number): 'default' | 'warning' | 'info' | 'success' {
    switch (status) {
        case 0: return 'default';
        case 1: return 'warning';
        case 2: return 'info';
        case 3: return 'success';
        default: return 'default';
    }
}

export function OrderList({
    orders,
    loading,
    error,
    smartRefundEnabled,
    onRefresh,
    onRefund,
    onSmartRefund,
    onAddToQueue,
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
                        const tx = order.transaction;
                        const queryResult = queryResults[order.merchantOrderNo];
                        const isQuerying = queryingOrderNo === order.merchantOrderNo;
                        const isRefunding = refundingOrderNo === order.merchantOrderNo;
                        const isCapturing = capturingOrderNo === order.merchantOrderNo;
                        const statusConfig = ORDER_STATUS_CONFIG[order.status];

                        // Determine button states from transaction or query result
                        const closeStatus = queryResult?.closeStatus ?? tx?.closeStatus ?? 0;
                        const backStatus = queryResult?.backStatus ?? tx?.backStatus ?? 0;
                        const canRefund = queryResult?.canRefund === true || (closeStatus === 3 && backStatus === 0);
                        const canCapture = closeStatus === 0;

                        return (
                            <Card key={order.merchantOrderNo} variant="outlined">
                                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                            {/* Order header */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <Typography variant="body2" fontFamily="monospace" fontWeight={500}>
                                                    {order.merchantOrderNo}
                                                </Typography>
                                                <Chip
                                                    label={statusConfig.label}
                                                    size="small"
                                                    color={statusConfig.color}
                                                    variant={order.status === 'paid' ? 'filled' : 'outlined'}
                                                />
                                            </Box>

                                            {/* Transaction details */}
                                            {tx && (
                                                <>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                        藍新序號: {tx.tradeNo}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {tx.payTime} {tx.card4No && `| 卡號末四碼: ${tx.card4No}`}
                                                    </Typography>

                                                    {/* CloseStatus / BackStatus chips */}
                                                    <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                            <Chip
                                                                label={`請款: ${getCloseStatusText(closeStatus)}`}
                                                                size="small"
                                                                color={getCloseStatusColor(closeStatus)}
                                                                variant="outlined"
                                                            />
                                                            <Chip
                                                                label={`退款: ${getBackStatusText(backStatus)}`}
                                                                size="small"
                                                                color={getBackStatusColor(backStatus)}
                                                                variant="outlined"
                                                            />
                                                        </Stack>
                                                    </Box>
                                                </>
                                            )}

                                            {/* Query result info messages */}
                                            {queryResult && order.status === 'paid' && (
                                                <Box sx={{ mt: 1 }}>
                                                    {!canRefund && closeStatus === 0 && (
                                                        <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                                                            尚未請款，請先點擊「請款」按鈕或等待 21:00 批次處理
                                                        </Typography>
                                                    )}
                                                    {!canRefund && closeStatus !== 0 && closeStatus !== 3 && (
                                                        <Typography variant="caption" color="info.main" sx={{ display: 'block' }}>
                                                            請款處理中，請等待 21:00 批次處理完成
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Right side: amount + actions */}
                                        <Box sx={{ textAlign: 'right', ml: 2 }}>
                                            <Typography variant="h6" fontWeight={700} color="primary.main">
                                                NT$ {order.amount.toLocaleString()}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {order.itemDesc}
                                            </Typography>

                                            {order.status === 'paid' && (
                                                <Stack direction="row" spacing={1} sx={{ mt: 1 }} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
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
                                                    {smartRefundEnabled ? (
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            size="small"
                                                            startIcon={isRefunding ? <CircularProgress size={14} color="inherit" /> : <AutoFixHighIcon />}
                                                            onClick={() => onSmartRefund(order)}
                                                            disabled={isRefunding}
                                                        >
                                                            {isRefunding ? '處理中...' : '智慧退款'}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            size="small"
                                                            startIcon={<AddIcon />}
                                                            onClick={() => onAddToQueue(order)}
                                                            disabled={isRefunding}
                                                        >
                                                            加入退款佇列
                                                        </Button>
                                                    )}
                                                </Stack>
                                            )}

                                            {order.status === 'refunded' && tx?.refundCompletedAt && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                                    退款時間: {new Date(tx.refundCompletedAt).toLocaleString('zh-TW')}
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
