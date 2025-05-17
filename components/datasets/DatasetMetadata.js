'use client';

import { Box, Typography, Chip, Tooltip, alpha } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';

/**
 * 数据集元数据展示组件
 */
export default function DatasetMetadata({ currentDataset, onViewChunk }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
        {t('datasets.metadata')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Chip label={`${t('datasets.model')}: ${currentDataset.model}`} variant="outlined" />
        {currentDataset.questionLabel && (
          <Chip label={`${t('common.label')}: ${currentDataset.questionLabel}`} color="primary" variant="outlined" />
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
              onViewChunk({
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
  );
}
