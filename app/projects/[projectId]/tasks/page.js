'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
  LinearProgress,
  Stack
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TaskIcon from '@mui/icons-material/Task';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';

// 任务状态映射
const TASK_STATUS = {
  0: { label: '处理中', color: 'warning' },
  1: { label: '已完成', color: 'success' },
  2: { label: '失败', color: 'error' },
  3: { label: '已中断', color: 'default' }
};

// 任务类型映射
const TASK_TYPES = {
  'text-processing': '文献处理',
  'question-generation': '问题生成',
  'answer-generation': '答案生成',
  'data-distillation': '数据蒸馏'
};

export default function TasksPage({ params }) {
  const { projectId } = params;
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // 获取任务列表
  const fetchTasks = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      // 构建查询参数
      let url = `/api/projects/${projectId}/tasks/list`;
      const queryParams = [];

      if (statusFilter !== 'all') {
        queryParams.push(`status=${statusFilter}`);
      }

      if (typeFilter !== 'all') {
        queryParams.push(`taskType=${typeFilter}`);
      }

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      const response = await axios.get(url);
      if (response.data?.code === 0) {
        setTasks(response.data.data || []);
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
      toast.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化和过滤器变更时获取任务列表
  useEffect(() => {
    fetchTasks();

    // 定时刷新处理中的任务
    const intervalId = setInterval(() => {
      if (statusFilter === 'all' || statusFilter === '0') {
        fetchTasks();
      }
    }, 5000); // 每5秒更新一次处理中的任务

    return () => clearInterval(intervalId);
  }, [projectId, statusFilter, typeFilter]);

  // 删除任务
  const handleDeleteTask = async taskId => {
    if (!confirm('确认删除该任务？')) return;

    try {
      const response = await axios.delete(`/api/projects/${projectId}/tasks/${taskId}`);
      if (response.data?.code === 0) {
        toast.success('任务已删除');
        fetchTasks();
      } else {
        toast.error('删除任务失败');
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      toast.error('删除任务失败');
    }
  };

  // 中断任务
  const handleAbortTask = async taskId => {
    if (!confirm('确认中断该任务？任务将停止执行。')) return;

    try {
      const response = await axios.patch(`/api/projects/${projectId}/tasks/${taskId}`, {
        status: 3, // 3 表示已中断
        detail: '任务已被手动中断',
        note: '任务已被手动中断'
      });

      if (response.data?.code === 0) {
        toast.success('任务已中断');
        fetchTasks();
      } else {
        toast.error('中断任务失败');
      }
    } catch (error) {
      console.error('中断任务失败:', error);
      toast.error('中断任务失败');
    }
  };

  // 格式化日期
  const formatDate = dateString => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: i18n.language === 'zh-CN' ? zhCN : enUS
    });
  };

  // 渲染任务状态
  const renderTaskStatus = status => {
    const statusInfo = TASK_STATUS[status] || { label: '未知', color: 'default' };
    return <Chip label={statusInfo.label} color={statusInfo.color} size="small" />;
  };

  // 渲染任务进度
  const renderTaskProgress = task => {
    if (task.totalCount === 0) return '-';

    const progress = (task.completedCount / task.totalCount) * 100;

    return (
      <Stack direction="column" spacing={0.5}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3, width: 120 }} />
        <Typography variant="caption" color="text.secondary">
          {task.completedCount} / {task.totalCount} ({Math.round(progress)}%)
        </Typography>
      </Stack>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          <TaskIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          任务管理中心
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* 状态筛选 */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>任务状态</InputLabel>
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              input={<OutlinedInput label="任务状态" />}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="0">处理中</MenuItem>
              <MenuItem value="1">已完成</MenuItem>
              <MenuItem value="2">失败</MenuItem>
            </Select>
          </FormControl>

          {/* 类型筛选 */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>任务类型</InputLabel>
            <Select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              input={<OutlinedInput label="任务类型" />}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="text-processing">文献处理</MenuItem>
              <MenuItem value="question-generation">问题生成</MenuItem>
              <MenuItem value="answer-generation">答案生成</MenuItem>
              <MenuItem value="data-distillation">数据蒸馏</MenuItem>
            </Select>
          </FormControl>

          {/* 刷新按钮 */}
          <Tooltip title="刷新任务列表">
            <IconButton onClick={fetchTasks} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 任务表格 */}
      <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>任务类型</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>进度</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>完成时间</TableCell>
              <TableCell>使用模型</TableCell>
              <TableCell>任务详情</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    加载任务列表...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1">暂无任务记录</Typography>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map(task => {
                // 解析模型信息
                let modelInfo = '';
                try {
                  const parsedModel = JSON.parse(task.modelInfo);
                  modelInfo = parsedModel.modelName || parsedModel.name || '-';
                } catch (error) {
                  modelInfo = task.modelInfo || '-';
                }

                return (
                  <TableRow key={task.id}>
                    <TableCell>{TASK_TYPES[task.taskType] || task.taskType}</TableCell>
                    <TableCell>{renderTaskStatus(task.status)}</TableCell>
                    <TableCell>{renderTaskProgress(task)}</TableCell>
                    <TableCell>{formatDate(task.createAt)}</TableCell>
                    <TableCell>{task.endTime ? formatDate(task.endTime) : '-'}</TableCell>
                    <TableCell>{modelInfo}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 150,
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}
                        title={task.detail}
                      >
                        {task.detail || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {/* 只在任务处理中时显示中断按钮 */}
                      {task.status === 0 ? (
                        <Tooltip title="中断任务" arrow>
                          <IconButton size="small" onClick={() => handleAbortTask(task.id)}>
                            <StopCircleIcon fontSize="small" color="warning" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="删除任务" arrow>
                          <IconButton size="small" onClick={() => handleDeleteTask(task.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
