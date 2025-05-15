'use client';

import {
  Card,
  Box,
  CardActionArea,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import Link from 'next/link';
import { styles } from '@/styles/home';
import DataObjectIcon from '@mui/icons-material/DataObject';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

/**
 * 项目卡片组件
 * @param {Object} props - 组件属性
 * @param {Object} props.project - 项目数据
 * @param {Function} props.onDeleteClick - 删除按钮点击事件处理函数
 */
export default function ProjectCard({ project, onDeleteClick }) {
  const { t } = useTranslation();
  const [processingId, setProcessingId] = useState(false);

  // 打开项目目录
  const handleOpenDirectory = async event => {
    event.stopPropagation();
    event.preventDefault();

    if (processingId) return;

    try {
      setProcessingId(true);

      const response = await fetch('/api/projects/open-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId: project.id })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('migration.openDirectoryFailed'));
      }

      // 成功打开目录，不需要特别处理
    } catch (error) {
      console.error('打开目录错误:', error);
      alert(error.message);
    } finally {
      setProcessingId(false);
    }
  };

  // 处理删除按钮点击
  const handleDeleteClick = event => {
    event.stopPropagation();
    event.preventDefault();
    onDeleteClick(event, project);
  };

  return (
    <Card sx={styles.projectCard}>
      <Link href={`/projects/${project.id}`} passHref style={{ textDecoration: 'none', color: 'inherit' }}>
        <CardActionArea component="div">
          <CardContent sx={{ pt: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 0.5
              }}
            >
              <Typography variant="h5" component="div" fontWeight="600" sx={{ mt: 1 }}>
                {project.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  size="small"
                  label={`${project._count.Questions || 0} ${t('projects.questions')}`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`${project._count.Datasets || 0} ${t('projects.datasets')}`}
                  color="secondary"
                  variant="outlined"
                />
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={styles.projectDescription}>
              {project.description}
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {t('projects.lastUpdated')}: {new Date(project.updateAt).toLocaleDateString('zh-CN')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title={t('projects.viewDetails')}>
                  <IconButton size="small" color="primary" sx={{ mr: 1 }}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('projects.openDirectory')}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={handleOpenDirectory}
                    disabled={processingId}
                    sx={{ mr: 1 }}
                  >
                    <FolderOpenIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <IconButton size="small" color="error" onClick={handleDeleteClick}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>
      </Link>
    </Card>
  );
}
