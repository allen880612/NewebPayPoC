'use client';

import {
    Dialog,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    Avatar,
    Paper,
    Stack,
    Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { RefundResult, CaptureResult } from '@/lib/newebpay/types';

interface RefundResultDialogProps {
    result: RefundResult | CaptureResult;
    onClose: () => void;
    title?: string;  // 自訂標題
}

export function RefundResultDialog({ result, onClose, title }: RefundResultDialogProps) {
    const successTitle = title || '退款成功！';
    const failTitle = title || '退款失敗';
    const successDesc = title?.includes('請款') ? '請款已送出處理' : '退款已送出處理';
    const amountLabel = title?.includes('請款') ? '請款金額' : '退款金額';
    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 4, p: 1 }
            }}
        >
            <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
                {result.success ? (
                    <>
                        <Avatar
                            sx={{
                                width: 72,
                                height: 72,
                                bgcolor: 'success.light',
                                mx: 'auto',
                                mb: 2
                            }}
                        >
                            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
                        </Avatar>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            {successTitle}
                        </Typography>
                        <Typography color="text.secondary">
                            {successDesc}
                        </Typography>

                        <Paper
                            variant="outlined"
                            sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}
                        >
                            <Stack spacing={1.5}>
                                {result.merchantOrderNo && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">訂單編號</Typography>
                                        <Typography variant="body2" fontFamily="monospace">{result.merchantOrderNo}</Typography>
                                    </Box>
                                )}
                                {result.tradeNo && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">藍新交易序號</Typography>
                                        <Typography variant="body2" fontFamily="monospace">{result.tradeNo}</Typography>
                                    </Box>
                                )}
                                {result.amount && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">{amountLabel}</Typography>
                                        <Typography variant="body2" fontWeight={500}>
                                            NT$ {result.amount.toLocaleString()}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </Paper>
                    </>
                ) : (
                    <>
                        <Avatar
                            sx={{
                                width: 72,
                                height: 72,
                                bgcolor: 'error.light',
                                mx: 'auto',
                                mb: 2
                            }}
                        >
                            <CancelIcon sx={{ fontSize: 48, color: 'error.main' }} />
                        </Avatar>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            {failTitle}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                            {result.status && (
                                <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                                    錯誤代碼：{result.status}
                                </Typography>
                            )}
                            <Typography fontWeight={500} sx={{ mt: 0.5 }}>
                                {result.message}
                            </Typography>
                        </Box>

                        <Alert
                            severity="error"
                            icon={<WarningAmberIcon />}
                            sx={{ mt: 3, textAlign: 'left' }}
                        >
                            請確認訂單狀態是否正確，或聯繫藍新金流客服
                        </Alert>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button
                    variant="contained"
                    color={result.success ? 'success' : 'inherit'}
                    fullWidth
                    size="large"
                    onClick={onClose}
                    sx={{
                        py: 1.5,
                        ...(result.success ? {} : { bgcolor: 'grey.800', '&:hover': { bgcolor: 'grey.900' } })
                    }}
                >
                    {result.success ? '完成' : '關閉'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
