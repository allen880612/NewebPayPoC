'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Chip,
    Stack,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Card,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QueueIcon from '@mui/icons-material/Queue';

// RefundRequest type matching the backend
export interface RefundRequest {
    id: string;
    merchantOrderNo: string;
    tradeNo: string;
    amount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    retryCount: number;
    maxRetries: number;
    requestedAt: string;
    lastAttemptAt?: string;
    lastError?: string;
    completedAt?: string;
}

import type { BatchRefundResult } from '@/lib/newebpay/batch-refund';

const STATUS_CONFIG: Record<RefundRequest['status'], { label: string; color: 'default' | 'warning' | 'success' | 'error' }> = {
    pending: { label: '等待中', color: 'warning' },
    processing: { label: '處理中', color: 'default' },
    completed: { label: '已完成', color: 'success' },
    failed: { label: '失敗', color: 'error' },
};

export function BatchRefundPanel() {
    const [requests, setRequests] = useState<RefundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [executing, setExecuting] = useState(false);
    const [batchResult, setBatchResult] = useState<BatchRefundResult | null>(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/payment/refund-request');
            const data = await response.json();

            if (data.success !== false) {
                setRequests(Array.isArray(data) ? data : data.requests || []);
            } else {
                setError(data.message || '取得退款佇列失敗');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '網路錯誤');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleExecuteBatch = async () => {
        setExecuting(true);
        setBatchResult(null);

        try {
            const response = await fetch('/api/payment/batch-refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const result: BatchRefundResult = await response.json();
            setBatchResult(result);
            await fetchRequests();
        } catch {
            setBatchResult({
                success: false,
                total: 0,
                processed: 0,
                completed: 0,
                failed: 0,
                skipped: 0,
                results: [],
            });
        } finally {
            setExecuting(false);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
                當 <strong>NEWEBPAY_SMART_REFUND=false</strong> 時，退款請求會加入此佇列。
                點擊「執行批次退款」處理所有等待中的退款。
                <br />
                <Typography variant="caption" component="span">
                    正式環境建議使用 cron job 每日 21:00 自動觸發
                </Typography>
            </Alert>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Batch Result */}
            {batchResult && (
                <Alert
                    severity={batchResult.success ? 'success' : 'error'}
                    sx={{ mb: 3 }}
                    onClose={() => setBatchResult(null)}
                >
                    <Typography variant="subtitle2" fontWeight={600}>
                        {batchResult.success ? '批次退款完成' : '批次退款部分失敗'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                        總計: {batchResult.total} 筆 | 處理: {batchResult.processed} 筆 | 成功: {batchResult.completed} 筆 | 失敗: {batchResult.failed} 筆 | 跳過: {batchResult.skipped} 筆
                    </Typography>
                </Alert>
            )}

            {/* Actions Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" color="text.secondary">
                        共 {requests.length} 筆退款請求
                    </Typography>
                    {pendingCount > 0 && (
                        <Chip label={`${pendingCount} 筆等待中`} size="small" color="warning" />
                    )}
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={fetchRequests}
                    >
                        重新整理
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        startIcon={executing ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                        onClick={handleExecuteBatch}
                        disabled={executing || pendingCount === 0}
                    >
                        {executing ? '執行中...' : '執行批次退款'}
                    </Button>
                </Stack>
            </Box>

            {/* Queue List */}
            {requests.length === 0 ? (
                <Card variant="outlined" sx={{ textAlign: 'center', py: 4 }}>
                    <QueueIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                        退款佇列為空
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        退款請求將在訂單列表中點擊「加入退款佇列」後出現
                    </Typography>
                </Card>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>訂單編號</TableCell>
                                <TableCell>藍新序號</TableCell>
                                <TableCell align="right">金額</TableCell>
                                <TableCell>狀態</TableCell>
                                <TableCell>重試</TableCell>
                                <TableCell>建立時間</TableCell>
                                <TableCell>最後錯誤</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {requests.map((req) => {
                                const config = STATUS_CONFIG[req.status];
                                return (
                                    <TableRow key={req.id}>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                                                {req.merchantOrderNo}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                                                {req.tradeNo}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight={500}>
                                                NT$ {req.amount.toLocaleString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={config.label}
                                                size="small"
                                                color={config.color}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {req.retryCount}/{req.maxRetries}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                                                {new Date(req.requestedAt).toLocaleString('zh-TW')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {req.lastError && (
                                                <Typography variant="body2" color="error" fontSize="0.75rem" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {req.lastError}
                                                </Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
