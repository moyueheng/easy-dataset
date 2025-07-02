'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  Card,
  Divider,
  useTheme,
  alpha,
  InputBase,
  Tooltip,
  Checkbox,
  LinearProgress,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useRouter } from 'next/navigation';
import ExportDatasetDialog from '@/components/ExportDatasetDialog';
import { useTranslation } from 'react-i18next';
import { processInParallel } from '@/lib/util/async';
import axios from 'axios';
import { useDebounce } from '@/hooks/useDebounce';

// 数据集列表组件
const DatasetList = ({
  datasets,
  onViewDetails,
  onDelete,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  total,
  selectedIds,
  onSelectAll,
  onSelectItem
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const bgColor = theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light;
  const color =
    theme.palette.mode === 'dark'
      ? theme.palette.getContrastText(theme.palette.primary.main)
      : theme.palette.getContrastText(theme.palette.primary.contrastText);
  return (
    <Card elevation={2}>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table sx={{ minWidth: 750 }}>
          <TableHead>
            <TableRow>
              <TableCell
                padding="checkbox"
                sx={{
                  backgroundColor: bgColor,
                  color: color,
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}
              >
                <Checkbox
                  color="primary"
                  indeterminate={selectedIds.length > 0 && selectedIds.length < total}
                  checked={total > 0 && selectedIds.length === total}
                  onChange={onSelectAll}
                />
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: bgColor,
                  color: color,
                  fontWeight: 'bold',
                  padding: '16px 8px',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}
              >
                {t('datasets.question')}
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: bgColor,
                  color: color,
                  fontWeight: 'bold',
                  padding: '16px 8px',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}
              >
                {t('datasets.createdAt')}
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: bgColor,
                  color: color,
                  fontWeight: 'bold',
                  padding: '16px 8px',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}
              >
                {t('datasets.model')}
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: bgColor,
                  color: color,
                  fontWeight: 'bold',
                  padding: '16px 8px',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}
              >
                {t('datasets.domainTag')}
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: bgColor,
                  color: color,
                  fontWeight: 'bold',
                  padding: '16px 8px',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}
              >
                {t('datasets.cot')}
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: bgColor,
                  color: color,
                  fontWeight: 'bold',
                  padding: '16px 8px',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}
              >
                {t('datasets.answer')}
              </TableCell>
              {/* <TableCell
                  sx={{
                    backgroundColor: bgColor,
                    color: color,
                    fontWeight: 'bold',
                    padding: '16px 8px',
                    borderBottom: `2px solid ${theme.palette.divider}`
                  }}>
                {t('datasets.chunkId')}
              </TableCell> */}
              <TableCell
                sx={{
                  backgroundColor: bgColor,
                  color: color,
                  fontWeight: 'bold',
                  padding: '16px 8px',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}
              >
                {t('common.actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {datasets.map((dataset, index) => (
              <TableRow
                key={dataset.id}
                sx={{
                  '&:nth-of-type(odd)': { backgroundColor: alpha(theme.palette.primary.light, 0.05) },
                  '&:hover': { backgroundColor: alpha(theme.palette.primary.light, 0.1) },
                  cursor: 'pointer'
                }}
                onClick={() => onViewDetails(dataset.id)}
              >
                <TableCell
                  padding="checkbox"
                  sx={{
                    borderLeft: `4px solid ${theme.palette.primary.main}`
                  }}
                >
                  <Checkbox
                    color="primary"
                    checked={selectedIds.includes(dataset.id)}
                    onChange={e => {
                      e.stopPropagation();
                      onSelectItem(dataset.id);
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell
                  sx={{
                    maxWidth: 300,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    py: 2
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {dataset.confirmed}
                    {dataset.confirmed && (
                      <Chip
                        label={t('datasets.confirmed')}
                        size="small"
                        sx={{
                          backgroundColor: alpha(theme.palette.success.main, 0.1),
                          color: theme.palette.success.dark,
                          fontWeight: 'medium',
                          verticalAlign: 'baseline',
                          marginRight: '2px'
                        }}
                      />
                    )}
                    {dataset.question}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(dataset.createAt).toLocaleString('zh-CN')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={dataset.model}
                    size="small"
                    sx={{
                      backgroundColor: alpha(theme.palette.info.main, 0.1),
                      color: theme.palette.info.dark,
                      fontWeight: 'medium'
                    }}
                  />
                </TableCell>
                <TableCell>
                  {dataset.questionLabel ? (
                    <Chip
                      label={dataset.questionLabel}
                      size="small"
                      sx={{
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.dark,
                        fontWeight: 'medium'
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      {t('datasets.noTag')}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={dataset.cot ? t('common.yes') : t('common.no')}
                    size="small"
                    sx={{
                      backgroundColor: dataset.cot
                        ? alpha(theme.palette.success.main, 0.1)
                        : alpha(theme.palette.grey[500], 0.1),
                      color: dataset.cot ? theme.palette.success.dark : theme.palette.grey[700],
                      fontWeight: 'medium'
                    }}
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {dataset.answer}
                  </Typography>
                </TableCell>
                {/* <TableCell sx={{ maxWidth: 200 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                    {dataset.chunkId}
                  </Typography>
                </TableCell> */}
                <TableCell sx={{ width: 120 }}>
                  <Box sx={{ display: 'flex' }}>
                    <Tooltip title={t('datasets.viewDetails')}>
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          onViewDetails(dataset.id);
                        }}
                        sx={{
                          color: theme.palette.primary.main,
                          '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.1) }
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete')}>
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          onDelete(dataset);
                        }}
                        sx={{
                          color: theme.palette.error.main,
                          '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.1) }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {datasets.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    {t('datasets.noData')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Divider />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderTop: `1px solid ${theme.palette.divider}`
        }}
      >
        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          labelRowsPerPage={t('datasets.rowsPerPage')}
          labelDisplayedRows={({ from, to, count }) => t('datasets.pagination', { from, to, count })}
          sx={{
            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
              fontWeight: 'medium'
            },
            border: 'none'
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">{t('common.jumpTo')}:</Typography>
          <TextField
            size="small"
            type="number"
            inputProps={{
              min: 1,
              max: Math.ceil(total / rowsPerPage),
              style: { padding: '4px 8px', width: '50px' }
            }}
            onKeyPress={e => {
              if (e.key === 'Enter') {
                const pageNum = parseInt(e.target.value, 10);
                if (pageNum >= 1 && pageNum <= Math.ceil(total / rowsPerPage)) {
                  onPageChange(null, pageNum - 1);
                  e.target.value = '';
                }
              }
            }}
          />
        </Box>
      </Box>
    </Card>
  );
};

// 删除确认对话框
const DeleteConfirmDialog = ({ open, datasets, onClose, onConfirm, batch, progress, deleting }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const dataset = datasets?.[0];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        elevation: 3,
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight="bold">
          {t('common.confirmDelete')}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 2, pt: 1 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {batch
            ? t('datasets.batchconfirmDeleteMessage', {
                count: datasets.length
              })
            : t('common.confirmDeleteDataSet')}
        </Typography>
        {batch ? (
          ''
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              backgroundColor: alpha(theme.palette.warning.light, 0.1),
              borderColor: theme.palette.warning.light
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
              {t('datasets.question')}：
            </Typography>
            <Typography variant="body2">{dataset?.question}</Typography>
          </Paper>
        )}
        {deleting && progress ? (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1" sx={{ mr: 1 }}>
                {progress.percentage}%
              </Typography>
              <Box sx={{ width: '100%' }}>
                <LinearProgress
                  variant="determinate"
                  value={progress.percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      transitionDuration: '0.1s'
                    }
                  }}
                  color="primary"
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Typography variant="body2">
                {t('datasets.batchDeleteProgress', {
                  completed: progress.completed,
                  total: progress.total
                })}
              </Typography>
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 'medium' }}>
                {t('datasets.batchDeleteCount', { count: progress.datasetCount })}
              </Typography>
            </Box>
          </Box>
        ) : (
          ''
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" sx={{ borderRadius: 2 }}>
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// 主页面组件
export default function DatasetsPage({ params }) {
  const { projectId } = params;
  const router = useRouter();
  const theme = useTheme();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    datasets: null,
    // 是否批量删除
    batch: false,
    // 是否正在删除
    deleting: false
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery);
  const [searchField, setSearchField] = useState('question'); // 新增：筛选字段，默认为问题
  const [exportDialog, setExportDialog] = useState({ open: false });
  const [selectedIds, setselectedIds] = useState([]);
  const [filterConfirmed, setFilterConfirmed] = useState('all');
  const [filterHasCot, setFilterHasCot] = useState('all');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const { t } = useTranslation();
  // 删除进度状态
  const [deleteProgress, setDeteleProgress] = useState({
    total: 0, // 总删除问题数量
    completed: 0, // 已删除完成的数量
    percentage: 0 // 进度百分比
  });

  // 3. 添加打开导出对话框的处理函数
  const handleOpenExportDialog = () => {
    setExportDialog({ open: true });
  };

  // 4. 添加关闭导出对话框的处理函数
  const handleCloseExportDialog = () => {
    setExportDialog({ open: false });
  };

  // 获取数据集列表
  const getDatasetsList = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/projects/${projectId}/datasets?page=${page}&size=${rowsPerPage}&status=${filterConfirmed}&input=${searchQuery}&field=${searchField}&hasCot=${filterHasCot}`
      );
      setDatasets(response.data);
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

  useEffect(() => {
    getDatasetsList();
  }, [projectId, page, rowsPerPage, filterConfirmed, debouncedSearchQuery, searchField, filterHasCot]);

  // 处理页码变化
  const handlePageChange = (event, newPage) => {
    // MUI TablePagination 的页码从 0 开始，而我们的 API 从 1 开始
    setPage(newPage + 1);
  };

  // 处理每页行数变化
  const handleRowsPerPageChange = event => {
    setPage(1);
    setRowsPerPage(parseInt(event.target.value, 10));
  };

  // 打开删除确认框
  const handleOpenDeleteDialog = dataset => {
    setDeleteDialog({
      open: true,
      datasets: [dataset]
    });
  };

  // 关闭删除确认框
  const handleCloseDeleteDialog = () => {
    setDeleteDialog({
      open: false,
      dataset: null
    });
  };

  const handleBatchDeleteDataset = async () => {
    if (selectedIds.length === 0) {
      setSnackbar({
        open: true,
        message: t('datasets.noSelected'),
        severity: 'warning'
      });
      return;
    }

    const datasetsArray = selectedIds.map(id => ({ id }));
    setDeleteDialog({
      open: true,
      datasets: datasetsArray,
      batch: true,
      count: selectedIds.length
    });
  };

  const resetProgress = () => {
    setDeteleProgress({
      total: deleteDialog.count,
      completed: 0,
      percentage: 0
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.batch) {
      setDeleteDialog({
        ...deleteDialog,
        deleting: true
      });
      await handleBatchDelete();
      resetProgress();
    } else {
      const [dataset] = deleteDialog.datasets;
      if (!dataset) return;
      await handleDelete(dataset);
    }
    setselectedIds([]);
    // 刷新数据
    getDatasetsList();
    // 关闭确认框
    handleCloseDeleteDialog();
  };

  // 批量删除数据集
  const handleBatchDelete = async () => {
    try {
      await processInParallel(
        selectedIds,
        async datasetId => {
          await fetch(`/api/projects/${projectId}/datasets?id=${datasetId}`, {
            method: 'DELETE'
          });
        },
        3,
        (cur, total) => {
          setDeteleProgress({
            total,
            completed: cur,
            percentage: Math.floor((cur / total) * 100)
          });
        }
      );

      setSnackbar({
        open: true,
        message: t('datasets.batchDeleteSuccess', { count: selectedIds.length }),
        severity: 'success'
      });
    } catch (error) {
      console.error('批量删除失败:', error);
      setSnackbar({
        open: true,
        message: error.message || t('datasets.batchDeleteFailed'),
        severity: 'error'
      });
    }
  };

  // 删除数据集
  const handleDelete = async dataset => {
    try {
      const response = await fetch(`/api/projects/${projectId}/datasets?id=${dataset.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(t('datasets.deleteFailed'));

      setSnackbar({
        open: true,
        message: t('datasets.deleteSuccess'),
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  // 导出数据集
  const handleExportDatasets = async exportOptions => {
    try {
      let apiUrl = `/api/projects/${projectId}/datasets/export`;
      if (exportOptions.confirmedOnly) {
        apiUrl += `?status=confirmed`;
      }
      const response = await axios.get(apiUrl);
      let dataToExport = response.data;

      // 根据选择的格式转换数据
      let formattedData;
      // 不同文件格式
      let mimeType = 'application/json';

      if (exportOptions.formatType === 'alpaca') {
        // 根据选择的字段类型生成不同的数据格式
        if (exportOptions.alpacaFieldType === 'instruction') {
          // 使用 instruction 字段
          formattedData = dataToExport.map(({ question, answer, cot }) => ({
            instruction: question,
            input: '',
            output:
              cot && exportOptions.includeCOT
                ? `<think>${cot}</think>
${answer}`
                : answer,
            system: exportOptions.systemPrompt || ''
          }));
        } else {
          // 使用 input 字段
          formattedData = dataToExport.map(({ question, answer, cot }) => ({
            instruction: exportOptions.customInstruction || '',
            input: question,
            output:
              cot && exportOptions.includeCOT
                ? `<think>${cot}</think>
${answer}`
                : answer,
            system: exportOptions.systemPrompt || ''
          }));
        }
      } else if (exportOptions.formatType === 'sharegpt') {
        formattedData = dataToExport.map(({ question, answer, cot }) => {
          const messages = [];

          // 添加系统提示词（如果有）
          if (exportOptions.systemPrompt) {
            messages.push({
              role: 'system',
              content: exportOptions.systemPrompt
            });
          }

          // 添加用户问题
          messages.push({
            role: 'user',
            content: question
          });

          // 添加助手回答
          messages.push({
            role: 'assistant',
            content: cot && exportOptions.includeCOT ? `<think>${cot}</think>\n${answer}` : answer
          });

          return { messages };
        });
      } else if (exportOptions.formatType === 'custom') {
        // 处理自定义格式
        const { questionField, answerField, cotField, includeLabels, includeChunk } = exportOptions.customFields;
        formattedData = dataToExport.map(({ question, answer, cot, questionLabel: labels, chunkId }) => {
          const item = {
            [questionField]: question,
            [answerField]: answer
          };

          // 如果有思维链且用户选择包含思维链，则添加思维链字段
          if (cot && exportOptions.includeCOT && cotField) {
            item[cotField] = cot;
          }

          // 如果需要包含标签
          if (includeLabels && labels && labels.length > 0) {
            item.label = labels.split(' ')[1];
          }

          // 如果需要包含文本块
          if (includeChunk && chunkId) {
            item.chunk = chunkId;
          }

          return item;
        });
      }

      // 处理不同的文件格式
      let content;
      let fileExtension;

      if (exportOptions.fileFormat === 'jsonl') {
        // JSONL 格式：每行一个 JSON 对象
        content = formattedData.map(item => JSON.stringify(item)).join('\n');
        fileExtension = 'jsonl';
      } else if (exportOptions.fileFormat === 'csv') {
        // CSV 格式
        const headers = Object.keys(formattedData[0] || {});
        const csvRows = [
          // 添加表头
          headers.join(','),
          // 添加数据行
          ...formattedData.map(item =>
            headers
              .map(header => {
                // 处理包含逗号、换行符或双引号的字段
                let field = item[header]?.toString() || '';
                if (exportOptions.formatType === 'sharegpt') field = JSON.stringify(item[header]);
                if (field.includes(',') || field.includes('\n') || field.includes('"')) {
                  field = `"${field.replace(/"/g, '""')}"`;
                }
                return field;
              })
              .join(',')
          )
        ];
        content = csvRows.join('\n');
        fileExtension = 'csv';
      } else {
        // 默认 JSON 格式
        content = JSON.stringify(formattedData, null, 2);
        fileExtension = 'json';
      }
      // 创建 Blob 对象
      const blob = new Blob([content], { type: mimeType || 'application/json' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const formatSuffix = exportOptions.formatType === 'alpaca' ? 'alpaca' : 'sharegpt';
      a.download = `datasets-${projectId}-${formatSuffix}-${new Date().toISOString().slice(0, 10)}.${fileExtension}`;

      // 触发下载
      document.body.appendChild(a);
      a.click();

      // 清理
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 关闭导出对话框
      handleCloseExportDialog();

      setSnackbar({
        open: true,
        message: '数据集导出成功',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '导出失败: ' + error.message,
        severity: 'error'
      });
    }
  };
  // 查看详情
  const handleViewDetails = id => {
    router.push(`/projects/${projectId}/datasets/${id}`);
  };

  // 关闭提示框
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // 处理全选/取消全选
  const handleSelectAll = async event => {
    if (event.target.checked) {
      // 获取所有符合当前筛选条件的数据，不受分页限制
      const response = await axios.get(
        `/api/projects/${projectId}/datasets?status=${filterConfirmed}&input=${searchQuery}&selectedAll=1`
      );
      setselectedIds(response.data.map(dataset => dataset.id));
    } else {
      setselectedIds([]);
    }
  };

  // 处理单个选择
  const handleSelectItem = id => {
    setselectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '70vh'
          }}
        >
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {t('datasets.loading')}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Card
        elevation={0}
        sx={{
          mb: 4,
          p: 3,
          backgroundColor: alpha(theme.palette.primary.light, 0.05),
          borderRadius: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
              {t('datasets.management')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('datasets.stats', {
                total: datasets.total,
                confirmed: datasets.confirmedCount,
                percentage: datasets.total > 0 ? ((datasets.confirmedCount / datasets.total) * 100).toFixed(2) : 0
              })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Paper
              component="form"
              sx={{
                p: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                width: 400,
                borderRadius: 2
              }}
            >
              <IconButton sx={{ p: '10px' }} aria-label="search">
                <SearchIcon />
              </IconButton>
              <InputBase
                sx={{ ml: 1, flex: 1 }}
                placeholder={t('datasets.searchPlaceholder')}
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                endAdornment={
                  <Select
                    value={searchField}
                    onChange={e => {
                      setSearchField(e.target.value);
                      setPage(1);
                    }}
                    variant="standard"
                    sx={{
                      minWidth: 90,
                      '& .MuiInput-underline:before': { borderBottom: 'none' },
                      '& .MuiInput-underline:after': { borderBottom: 'none' },
                      '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' }
                    }}
                    disableUnderline
                  >
                    <MenuItem value="question">{t('datasets.fieldQuestion')}</MenuItem>
                    <MenuItem value="answer">{t('datasets.fieldAnswer')}</MenuItem>
                    <MenuItem value="cot">{t('datasets.fieldCOT')}</MenuItem>
                    <MenuItem value="questionLabel">{t('datasets.fieldLabel')}</MenuItem>
                  </Select>
                }
              />
            </Paper>
            <Button
              variant="outlined"
              onClick={() => setFilterDialogOpen(true)}
              startIcon={<FilterListIcon />}
              sx={{ borderRadius: 2 }}
            >
              {t('datasets.moreFilters')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              sx={{ borderRadius: 2 }}
              onClick={handleOpenExportDialog}
            >
              {t('export.title')}
            </Button>
          </Box>
        </Box>
      </Card>
      {selectedIds.length ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: '10px',
            gap: 2
          }}
        >
          <Typography variant="body1" color="text.secondary">
            {t('datasets.selected', {
              count: selectedIds.length
            })}
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ borderRadius: 2 }}
            onClick={handleBatchDeleteDataset}
          >
            {t('datasets.batchDelete')}
          </Button>
        </Box>
      ) : (
        ''
      )}

      <DatasetList
        datasets={datasets.data}
        onViewDetails={handleViewDetails}
        onDelete={handleOpenDeleteDialog}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        total={datasets.total}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectItem={handleSelectItem}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        datasets={deleteDialog.datasets || []}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteConfirm}
        batch={deleteDialog.batch}
        progress={deleteProgress}
        deleting={deleteDialog.deleting}
      />
      <ExportDatasetDialog open={exportDialog.open} onClose={handleCloseExportDialog} onExport={handleExportDatasets} />

      {/* 更多筛选对话框 */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('datasets.filtersTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3, mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('datasets.filterConfirmationStatus')}
            </Typography>
            <Select
              value={filterConfirmed}
              onChange={e => setFilterConfirmed(e.target.value)}
              fullWidth
              size="small"
              sx={{ mt: 1 }}
            >
              <MenuItem value="all">{t('datasets.filterAll')}</MenuItem>
              <MenuItem value="confirmed">{t('datasets.filterConfirmed')}</MenuItem>
              <MenuItem value="unconfirmed">{t('datasets.filterUnconfirmed')}</MenuItem>
            </Select>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('datasets.filterCotStatus')}
            </Typography>
            <Select
              value={filterHasCot}
              onChange={e => setFilterHasCot(e.target.value)}
              fullWidth
              size="small"
              sx={{ mt: 1 }}
            >
              <MenuItem value="all">{t('datasets.filterAll')}</MenuItem>
              <MenuItem value="yes">{t('datasets.filterHasCot')}</MenuItem>
              <MenuItem value="no">{t('datasets.filterNoCot')}</MenuItem>
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setFilterConfirmed('all');
              setFilterHasCot('all');
              getDatasetsList();
            }}
          >
            {t('datasets.resetFilters')}
          </Button>
          <Button
            onClick={() => {
              setFilterDialogOpen(false);
              setPage(1); // 重置到第一页
              getDatasetsList();
            }}
            variant="contained"
          >
            {t('datasets.applyFilters')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ExportDatasetDialog
        open={exportDialog.open}
        onClose={handleCloseExportDialog}
        onExport={handleExportDatasets}
        projectId={projectId}
      />
    </Container>
  );
}
