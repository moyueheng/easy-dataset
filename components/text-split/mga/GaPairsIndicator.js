import { useState, useEffect } from 'react';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import PsychologyIcon from '@mui/icons-material/Psychology';
import Typography from '@mui/material/Typography';

export default function GaPairsIndicator({ projectId, fileId }) {
  const [gaPairsCount, setGaPairsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 获取GA对数量的函数
  const fetchGaPairsCount = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}/ga-pairs`);
      if (response.ok) {
        const data = await response.json();
        setGaPairsCount(data.length || 0);
      } else {
        setGaPairsCount(0);
      }
    } catch (error) {
      console.error('获取GA对数量失败:', error);
      setGaPairsCount(0);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    if (projectId && fileId) {
      fetchGaPairsCount();
    }
  }, [projectId, fileId]);

  // 新增：监听全局刷新事件
  useEffect(() => {
    const handleRefresh = (event) => {
      const { projectId: eventProjectId, fileIds } = event.detail || {};
      
      // 如果事件是针对当前项目，并且包含当前文件ID，则刷新
      if (eventProjectId === projectId && fileIds && fileIds.includes(String(fileId))) {
        console.log(`刷新文件 ${fileId} 的GA对指示器`);
        fetchGaPairsCount();
      }
    };

    window.addEventListener('refreshGaPairsIndicators', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshGaPairsIndicators', handleRefresh);
    };
  }, [projectId, fileId]);

  return (
    <Tooltip title={`已生成 ${gaPairsCount} 个GA对`}>
      <IconButton 
        color={gaPairsCount > 0 ? "success" : "default"}
        size="small"
        onClick={() => {
          // 点击时也可以手动刷新
          fetchGaPairsCount();
        }}
      >
        <PsychologyIcon />
        {gaPairsCount > 0 && (
          <Typography variant="caption" sx={{ ml: 0.5 }}>
            {gaPairsCount}
          </Typography>
        )}
      </IconButton>
    </Tooltip>
  );
}