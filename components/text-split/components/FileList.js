'use client';

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Checkbox
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Download from '@mui/icons-material/Download';
import FileIcon from '@mui/icons-material/InsertDriveFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import MarkdownViewDialog from '../MarkdownViewDialog';
import GaPairsIndicator from '../../mga/GaPairsIndicator';

export default function FileList({
  theme,
  files = {},
  loading = false,
  onDeleteFile,
  sendToFileUploader,
  projectId,
  setPageLoading
}) {
  const { t } = useTranslation();
  const [array, setArray] = useState([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewContent, setViewContent] = useState(null);
  const handleCheckboxChange = (fileId, isChecked) => {
    if (isChecked) {
      array.push(fileId);
      setArray(array);
      sendToFileUploader(array);
    } else {
      const newArray = array.filter(item => item !== fileId);
      setArray(newArray);
      sendToFileUploader(newArray);
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
  };

  // 刷新文本块列表
  const refreshTextChunks = () => {
    if (typeof setPageLoading === 'function') {
      setPageLoading(true);
      setTimeout(() => {
        // 可能需要调用父组件的刷新方法
        sendToFileUploader(array);
        setPageLoading(false);
      }, 500);
    }
  };

  const handleViewContent = async fileId => {
    getFileContent(fileId);
    setViewDialogOpen(true);
  };

  const handleDownload = async (fileId, fileName) => {
    setPageLoading(true);
    const text = await getFileContent(fileId);

    // Modify the filename if it ends with .pdf
    let downloadName = fileName || 'download.txt';
    if (downloadName.toLowerCase().endsWith('.pdf')) {
      downloadName = downloadName.slice(0, -4) + '.md';
    }

    const blob = new Blob([text.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setPageLoading(false);
  };

  const getFileContent = async fileId => {
    try {
      const response = await fetch(`/api/projects/${projectId}/preview/${fileId}`);
      if (!response.ok) {
        throw new Error(t('textSplit.fetchChunksFailed'));
      }
      const data = await response.json();
      setViewContent(data);
      return data;
    } catch (error) {
      console.error(t('textSplit.fetchChunksError'), error);
    }
  };

  const formatFileSize = size => {
    if (size < 1024) {
      return size + 'B';
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(2) + 'KB';
    } else if (size < 1024 * 1024 * 1024) {
      return (size / 1024 / 1024).toFixed(2) + 'MB';
    } else {
      return (size / 1024 / 1024 / 1024).toFixed(2) + 'GB';
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        p: 3,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: theme.palette.background.paper,
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}
    >
      <Typography variant="subtitle1" gutterBottom>
        {t('textSplit.uploadedDocuments', { count: files.total })}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : files.total === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            {t('textSplit.noFilesUploaded')}
          </Typography>
        </Box>
      ) : (
        <List sx={{ maxHeight: '200px', overflow: 'auto', width: '100%' }}>
          {files?.data?.map((file, index) => (
            <Box key={index}>
              <ListItem
                secondaryAction={
                  <Box sx={{ display: 'flex' }}>
                    <Checkbox
                      sx={{ mr: 1 }} // 添加一些右边距，使复选框和按钮之间有间隔
                      checked={file.checked} // 假设 `file.checked` 是复选框的状态
                      onChange={e => handleCheckboxChange(file.id, e.target.checked)}
                    />                    <Tooltip title={t('textSplit.viewDetails')}>
                      <IconButton color="primary" onClick={() => handleViewContent(file.id)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <GaPairsIndicator projectId={projectId} fileId={file.id} />
                    <Tooltip title={t('textSplit.download')}>
                      <IconButton color="primary" onClick={() => handleDownload(file.id, file.fileName)}>
                        <Download />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('textSplit.deleteFile')}>
                      <IconButton color="error" onClick={() => onDeleteFile(file.id, file.fileName)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FileIcon color="primary" sx={{ mr: 1 }} />
                  <ListItemText
                    primary={file.fileName}
                    secondary={`${formatFileSize(file.size)} · ${new Date(file.createAt).toLocaleString()}`}
                  />
                </Box>
              </ListItem>
              {index < files.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}
      {/* 文本块详情对话框 */}
      <MarkdownViewDialog
        open={viewDialogOpen}
        text={viewContent}
        onClose={handleCloseViewDialog}
        projectId={projectId}
        onSaveSuccess={refreshTextChunks}
      />
    </Box>
  );
}
