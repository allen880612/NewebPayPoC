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
    Stepper,
    Step,
    StepLabel,
    Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import type { SmartRefundResult } from '@/lib/newebpay/smart-refund';

interface SmartRefundResultDialogProps {
    result: SmartRefundResult;
    merchantOrderNo: string;
    onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
    cancel_auth: '取消授權',
    cancel_capture: '取消請款',
    standard_refund: '標準退款',
    refund_pending: '退款佇列中',
    refund_processing: '退款處理中',
    already_refunded: '已退款',
    unknown: '未知',
};

export function SmartRefundResultDialog({ result, merchantOrderNo, onClose }: SmartRefundResultDialogProps) {
    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 4, p: 1 }
            }}
        >
            <DialogContent sx={{ pt: 4 }}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Avatar
                        sx={{
                            width: 72,
                            height: 72,
                            bgcolor: result.success ? 'success.light' : 'error.light',
                            mx: 'auto',
                            mb: 2,
                        }}
                    >
                        {result.success ? (
                            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
                        ) : (
                            <CancelIcon sx={{ fontSize: 48, color: 'error.main' }} />
                        )}
                    </Avatar>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        {result.success ? '智慧退款完成' : '智慧退款失敗'}
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                        {merchantOrderNo}
                    </Typography>
                </Box>

                {/* Decision */}
                <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <AutoFixHighIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={600}>
                            決策
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            label={ACTION_LABELS[result.decision.action] || result.decision.action}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                        <Typography variant="body2" color="text.secondary">
                            {result.decision.description}
                        </Typography>
                    </Stack>
                </Paper>

                {/* Steps */}
                {result.steps.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                            執行步驟
                        </Typography>
                        <Stepper activeStep={result.steps.length} orientation="vertical">
                            {result.steps.map((step, index) => (
                                <Step key={index} completed={step.success}>
                                    <StepLabel
                                        error={!step.success}
                                        optional={
                                            <Typography variant="caption" color={step.success ? 'text.secondary' : 'error'}>
                                                {step.message}
                                            </Typography>
                                        }
                                    >
                                        {step.name}
                                    </StepLabel>
                                </Step>
                            ))}
                        </Stepper>
                    </Box>
                )}

                {/* Final Message */}
                {result.finalMessage && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                            最終狀態
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {result.finalMessage}
                        </Typography>
                    </Paper>
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
                        ...(result.success ? {} : { bgcolor: 'grey.800', '&:hover': { bgcolor: 'grey.900' } }),
                    }}
                >
                    {result.success ? '完成' : '關閉'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
