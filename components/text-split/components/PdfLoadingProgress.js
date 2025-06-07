'use client';

import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { handleLongFileName } from '@/lib/file/file-process';

/**
 * PDF 处理进度展示组件
 *
 * @param {Object} props
 * @param {Object} props.pdfTask - PDF 处理任务信息
 */
export default function PdfLoadingProgress({ pdfTask }) {
  const { t } = useTranslation();

  if (!pdfTask) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '20vh'
      }}
    >
      <CircularProgress />
      <Typography sx={{ mt: 2 }}>{t('textSplit.pdfProcessingLoading')}</Typography>
      <Box sx={{ width: '37%', mt: 1, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mb: 0.5
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('textSplit.pdfPageProcessStatus', {
              fileName: handleLongFileName(pdfTask.courent.fileName),
              total: pdfTask.courent.totalPage,
              completed: pdfTask.courent.processedPage
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {parseInt((pdfTask.courent.processedPage / pdfTask.courent.totalPage) * 100)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(pdfTask.courent.processedPage / pdfTask.courent.totalPage) * 100}
          sx={{ height: 8, borderRadius: 4 }}
        />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mb: 0.5
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('textSplit.pdfProcessStatus', {
              total: pdfTask.totalFiles,
              completed: pdfTask.processedFiles
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {parseInt((pdfTask.processedFiles / pdfTask.totalFiles) * 100)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(pdfTask.processedFiles / pdfTask.totalFiles) * 100}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
    </Box>
  );
}
