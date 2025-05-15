'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  Chip,
  Divider,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import ChunkViewDialog from '@/components/text-split/ChunkViewDialog';
import { useAtomValue } from 'jotai/index';
import { selectedModelInfoAtom } from '@/lib/store';
import axios from 'axios';
import { toast } from 'sonner';

// 编辑区域组件
const EditableField = ({ label, value, multiline = true, editing, onEdit, onChange, onSave, onCancel, onOptimize }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mr: 1 }}>
          {label}
        </Typography>
        {!editing && (
          <>
            <IconButton size="small" onClick={onEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
            {onOptimize && (
              <IconButton size="small" onClick={onOptimize} color="primary">
                <AutoFixHighIcon fontSize="small" />
              </IconButton>
            )}
          </>
        )}
      </Box>
      {editing ? (
        <Box>
          <TextField
            fullWidth
            multiline={multiline}
            rows={multiline ? 10 : 1}
            value={value}
            onChange={onChange}
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="small" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button size="small" variant="contained" onClick={onSave}>
              {t('common.save')}
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography
          variant="body1"
          sx={{
            whiteSpace: 'pre-wrap',
            bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
            p: 2,
            borderRadius: 1
          }}
        >
          {value || t('common.noData')}
        </Typography>
      )}
    </Box>
  );
};

// AI优化对话框组件
const OptimizeDialog = ({ open, onClose, onConfirm, loading }) => {
  const [advice, setAdvice] = useState('');
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm(advice);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('datasets.aiOptimize')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('datasets.aiOptimizeAdvice')}
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={advice}
          onChange={e => setAdvice(e.target.value)}
          placeholder={t('datasets.aiOptimizeAdvicePlaceholder')}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!advice.trim() || loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? t('common.loading') : t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function DatasetDetailsPage({ params }) {
  const { projectId, datasetId } = params;
  const router = useRouter();
  // 获取数据集列表（用于导航）
  const [datasets, setDatasets] = useState([]);
  const [currentDataset, setCurrentDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [editingCot, setEditingCot] = useState(false);
  const [answerValue, setAnswerValue] = useState('');
  const [cotValue, setCotValue] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [confirming, setConfirming] = useState(false);
  const [optimizeDialog, setOptimizeDialog] = useState({
    open: false,
    loading: false
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewChunk, setViewChunk] = useState(null);
  const [datasetsAllCount, setDatasetsAllCount] = useState(0);
  const [datasetsConfirmCount, setDatasetsConfirmCount] = useState(0);
  const theme = useTheme();
  const model = useAtomValue(selectedModelInfoAtom);
  const { t } = useTranslation();
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => {
    const storedValue = localStorage.getItem('shortcutsEnabled');
    return storedValue !== null ? storedValue === 'true' : false;
  });

  // 获取数据集详情
  const fetchDatasets = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/datasets/${datasetId}`);
      if (!response.ok) throw new Error(t('datasets.fetchFailed'));
      const data = await response.json();
      setCurrentDataset(data.datasets);
      setCotValue(data.datasets?.cot);
      setAnswerValue(data.datasets?.answer);
      setDatasetsAllCount(data.total);
      setDatasetsConfirmCount(data.confirmedCount);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      const response = await fetch(`/api/projects/${projectId}/datasets?id=${datasetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmed: true
        })
      });

      if (!response.ok) {
        throw new Error(t('common.failed'));
      }

      setCurrentDataset(prev => ({ ...prev, confirmed: true }));

      setSnackbar({
        open: true,
        message: t('common.success'),
        severity: 'success'
      });

      // 导航到下一个数据集
      handleNavigate('next');
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || t('common.failed'),
        severity: 'error'
      });
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [projectId, datasetId]);

  // 导航到其他数据集
  const handleNavigate = async direction => {
    const response = await axios.get(`/api/projects/${projectId}/datasets/${datasetId}?operateType=${direction}`);
    if (response.data) {
      router.push(`/projects/${projectId}/datasets/${response.data.id}`);
    } else {
      toast.warning(`已经是${direction === 'next' ? '最后' : '第'}一条数据了`);
    }
  };

  // 保存编辑
  const handleSave = async (field, value) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/datasets?id=${datasetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [field]: value
        })
      });

      if (!response.ok) {
        throw new Error(t('common.failed'));
      }

      const data = await response.json();
      setCurrentDataset(prev => ({ ...prev, [field]: value }));

      setSnackbar({
        open: true,
        message: t('common.success'),
        severity: 'success'
      });

      // 重置编辑状态
      if (field === 'answer') setEditingAnswer(false);
      if (field === 'cot') setEditingCot(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || t('common.failed'),
        severity: 'error'
      });
    }
  };

  // 删除数据集
  const handleDelete = async () => {
    if (!confirm(t('datasets.confirmDeleteMessage'))) return;

    try {
      // 尝试获取下一个数据集，在删除前先确保有可导航的目标
      const nextResponse = await axios.get(`/api/projects/${projectId}/datasets/${datasetId}?operateType=next`);
      const hasNextDataset = !!nextResponse.data;
      const nextDatasetId = hasNextDataset ? nextResponse.data.id : null;

      // 删除当前数据集
      const deleteResponse = await fetch(`/api/projects/${projectId}/datasets?id=${datasetId}`, {
        method: 'DELETE'
      });

      if (!deleteResponse.ok) {
        throw new Error(t('common.failed'));
      }

      // 导航逻辑：有下一个就跳转下一个，没有则返回列表页
      if (hasNextDataset) {
        router.push(`/projects/${projectId}/datasets/${nextDatasetId}`);
      } else {
        // 没有更多数据集，返回列表页面
        router.push(`/projects/${projectId}/datasets`);
      }

      toast.success(t('common.deleteSuccess'));
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || t('common.failed'),
        severity: 'error'
      });
    }
  };

  // 打开优化对话框
  const handleOpenOptimizeDialog = () => {
    setOptimizeDialog({
      open: true,
      loading: false
    });
  };

  // 关闭优化对话框
  const handleCloseOptimizeDialog = () => {
    if (optimizeDialog.loading) return;
    setOptimizeDialog({
      open: false,
      loading: false
    });
  };

  // 查看文本块详情
  const handleViewChunk = async chunkContent => {
    try {
      setViewChunk(chunkContent);
      setViewDialogOpen(true);
    } catch (error) {
      console.error(t('textSplit.fetchChunkError'), error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
      setViewDialogOpen(false);
    }
  };

  // 关闭文本块详情对话框
  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
  };

  // 提交优化请求
  const handleOptimize = async advice => {
    if (!model) {
      setSnackbar({
        open: true,
        message: '请先选择模型，可以在顶部导航栏选择',
        severity: 'error'
      });
      setOptimizeDialog(prev => ({ ...prev, open: false }));
      return;
    }

    try {
      setOptimizeDialog(prev => ({ ...prev, loading: true }));
      const language = i18n.language === 'zh-CN' ? '中文' : 'en';
      const response = await fetch(`/api/projects/${projectId}/datasets/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          datasetId,
          model,
          advice,
          language
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '优化失败');
      }

      // 优化成功后，重新查询数据以获取最新状态
      await fetchDatasets();

      setSnackbar({
        open: true,
        message: 'AI智能优化成功',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || '优化失败',
        severity: 'error'
      });
    } finally {
      setOptimizeDialog({
        open: false,
        loading: false
      });
    }
  };

  // 快捷键状态变化
  useEffect(() => {
    localStorage.setItem('shortcutsEnabled', shortcutsEnabled);
  }, [shortcutsEnabled]);

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = event => {
      if (!shortcutsEnabled) return;
      switch (event.key) {
        case 'ArrowLeft': // 上一个
          handleNavigate('prev');
          break;
        case 'ArrowRight': // 下一个
          handleNavigate('next');
          break;
        case 'y': // 确认
        case 'Y':
          if (!confirming && !dataset?.confirmed) {
            handleConfirm();
          }
          break;
        case 'd': // 删除
        case 'D':
          handleDelete();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcutsEnabled, confirming, currentDataset]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!currentDataset) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{t('datasets.noData')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* 顶部导航栏 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button startIcon={<NavigateBeforeIcon />} onClick={() => router.push(`/projects/${projectId}/datasets`)}>
              {t('common.backToList')}
            </Button>
            <Divider orientation="vertical" flexItem />
            <Typography variant="h6">{t('datasets.datasetDetail')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('datasets.stats', {
                total: datasetsAllCount,
                confirmed: datasetsConfirmCount,
                percentage: ((datasetsConfirmCount / datasetsAllCount) * 100).toFixed(2)
              })}
            </Typography>
          </Box>
          {/* 快捷键启用选项 */}
          {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">{t('datasets.enableShortcuts')}</Typography>
            <Tooltip title={t('datasets.shortcutsHelp')}>
              <IconButton size="small" color="info">
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>?</Typography>
              </IconButton>
            </Tooltip>
            <Button
              variant={shortcutsEnabled ? 'contained' : 'outlined'}
              onClick={() => setShortcutsEnabled((prev) => !prev)}
            >
              {shortcutsEnabled ? t('common.enabled') : t('common.disabled')}
            </Button>
          </Box> */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => handleNavigate('prev')}>
              <NavigateBeforeIcon />
            </IconButton>
            <IconButton onClick={() => handleNavigate('next')}>
              <NavigateNextIcon />
            </IconButton>
            <Divider orientation="vertical" flexItem />
            <Button
              variant="contained"
              color="primary"
              disabled={confirming || currentDataset.confirmed}
              onClick={handleConfirm}
              sx={{ mr: 1 }}
            >
              {confirming ? (
                <CircularProgress size={24} />
              ) : currentDataset.confirmed ? (
                t('datasets.confirmed')
              ) : (
                t('datasets.confirmSave')
              )}
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* 主要内容 */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
            {t('datasets.question')}
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {currentDataset.question}
          </Typography>
        </Box>

        <EditableField
          label={t('datasets.answer')}
          value={answerValue}
          editing={editingAnswer}
          onEdit={() => setEditingAnswer(true)}
          onChange={e => setAnswerValue(e.target.value)}
          onSave={() => handleSave('answer', answerValue)}
          onCancel={() => {
            setEditingAnswer(false);
            setAnswerValue(currentDataset.answer);
          }}
          onOptimize={handleOpenOptimizeDialog}
        />

        <EditableField
          label={t('datasets.cot')}
          value={cotValue}
          editing={editingCot}
          onEdit={() => setEditingCot(true)}
          onChange={e => setCotValue(e.target.value)}
          onSave={() => handleSave('cot', cotValue)}
          onCancel={() => {
            setEditingCot(false);
            setCotValue(currentDataset.cot || '');
          }}
        />

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
            {t('datasets.metadata')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={`${t('datasets.model')}: ${currentDataset.model}`} variant="outlined" />
            {currentDataset.questionLabel && (
              <Chip
                label={`${t('common.label')}: ${currentDataset.questionLabel}`}
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label={`${t('datasets.createdAt')}: ${new Date(currentDataset.createAt).toLocaleString('zh-CN')}`}
              variant="outlined"
            />
            <Tooltip title={t('textSplit.viewChunk')}>
              <Chip
                label={`${t('datasets.chunkId')}: ${currentDataset.chunkName}`}
                variant="outlined"
                color="info"
                onClick={() =>
                  handleViewChunk({
                    name: currentDataset.chunkName,
                    content: currentDataset.chunkContent
                  })
                }
                sx={{ cursor: 'pointer' }}
              />
            </Tooltip>
            {currentDataset.confirmed && (
              <Chip
                label={t('datasets.confirmed')}
                sx={{
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  color: theme.palette.success.dark,
                  fontWeight: 'medium'
                }}
              />
            )}
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* AI优化对话框 */}
      <OptimizeDialog
        open={optimizeDialog.open}
        onClose={handleCloseOptimizeDialog}
        onConfirm={handleOptimize}
        loading={optimizeDialog.loading}
      />

      {/* 文本块详情对话框 */}
      <ChunkViewDialog open={viewDialogOpen} chunk={viewChunk} onClose={handleCloseViewDialog} />
    </Container>
  );
}
