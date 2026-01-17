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
import type { PaymentResult } from '@/lib/newebpay/types';

interface PaymentResultDialogProps {
    result: PaymentResult;
    onClose: () => void;
}

export function PaymentResultDialog({ result, onClose }: PaymentResultDialogProps) {
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
                            付款成功！
                        </Typography>
                        <Typography color="text.secondary">
                            感謝您的購買
                        </Typography>

                        <Paper
                            variant="outlined"
                            sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}
                        >
                            <Stack spacing={1.5}>
                                {result.tradeNo && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">交易序號</Typography>
                                        <Typography variant="body2" fontFamily="monospace">{result.tradeNo}</Typography>
                                    </Box>
                                )}
                                {result.amount && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">付款金額</Typography>
                                        <Typography variant="body2" fontWeight={500}>
                                            NT$ {result.amount.toLocaleString()}
                                        </Typography>
                                    </Box>
                                )}
                                {result.card4No && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">卡號末四碼</Typography>
                                        <Typography variant="body2" fontFamily="monospace">**** {result.card4No}</Typography>
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
                            付款失敗
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                            {result.status && result.status !== 'ERROR' && (
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
                            請確認卡片資訊是否正確，或聯繫發卡銀行
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
                    {result.success ? '完成' : '返回重試'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
