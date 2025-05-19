'use client';

import React, { useState, useEffect } from 'react';
import { Badge, IconButton, Tooltip, Box, CircularProgress } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// 任务图标组件
export default function TaskIcon({ projectId }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  // 获取项目的未完成任务列表
  const fetchPendingTasks = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}/tasks/list?status=0`);
      if (response.data?.code === 0) {
        setTasks(response.data.data || []);
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化时获取任务列表
  useEffect(() => {
    if (projectId) {
      fetchPendingTasks();

      // 启动轮询
      const intervalId = setInterval(() => {
        fetchPendingTasks();
      }, 10000); // 每10秒轮询一次

      setPolling(true);

      return () => {
        clearInterval(intervalId);
        setPolling(false);
      };
    }
  }, [projectId]);

  // 打开任务列表页面
  const handleOpenTaskList = () => {
    router.push(`/projects/${projectId}/tasks`);
  };

  // 图标渲染逻辑
  const renderTaskIcon = () => {
    if (loading) {
      return <CircularProgress size={20} color="inherit" />;
    }

    const pendingTasks = tasks.filter(task => task.status === 0);

    if (pendingTasks.length > 0) {
      return (
        <Badge badgeContent={pendingTasks.length} color="error">
          <PendingActionsIcon fontSize="small" />
        </Badge>
      );
    }

    return <TaskAltIcon fontSize="small" />;
  };

  // 悬停提示文本
  const getTooltipText = () => {
    const pendingTasks = tasks.filter(task => task.status === 0);

    if (pendingTasks.length > 0) {
      return t('tasks.tooltip.pending', { count: pendingTasks.length });
    }

    return t('tasks.tooltip.completed');
  };

  if (!projectId) return null;

  return (
    <Tooltip title={getTooltipText()}>
      <IconButton
        onClick={handleOpenTaskList}
        size="small"
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          color: 'inherit',
          p: 1,
          borderRadius: 1.5,
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        {renderTaskIcon()}
      </IconButton>
    </Tooltip>
  );
}
