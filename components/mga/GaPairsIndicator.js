'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import GaPairsManager from './GaPairsManager';

/**
 * GA Pairs Indicator Component - Shows GA pairs status for a file
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 * @param {string} props.fileId - File ID
 * @param {string} props.fileName - File name for display
 */
export default function GaPairsIndicator({ projectId, fileId, fileName }) {
  const { t } = useTranslation();
  const [gaPairs, setGaPairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Load GA pairs status
  useEffect(() => {
    loadGaPairsStatus();
  }, [projectId, fileId]);
  const loadGaPairsStatus = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}/ga-pairs`);
      if (!response.ok) {
        throw new Error('Failed to load GA pairs status');
      }

      const result = await response.json();
      if (result.success) {
        setGaPairs(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load GA pairs status:', error);
    } finally {
      setLoading(false);
    }
  };

  // 修复：正确计算激活的GA对数量
  const activePairs = gaPairs.filter(pair => pair.isActive);
  const hasGaPairs = gaPairs.length > 0;

  const handleGaPairsChange = (newGaPairs) => {
    setGaPairs(newGaPairs || []);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="textSecondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {hasGaPairs ? (
        <>
          <Chip
            icon={<PsychologyIcon />}
            label={`${activePairs.length}/${gaPairs.length} GA Pairs`}
            size="small"
            color={activePairs.length > 0 ? 'primary' : 'default'}
            variant={activePairs.length > 0 ? 'filled' : 'outlined'}
          />
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => setDetailsOpen(true)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <Tooltip title="Generate GA Pairs">
          <IconButton
            size="small"
            onClick={() => setDetailsOpen(true)}
            color="primary"
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          GA Pairs for {fileName}
        </DialogTitle>
        <DialogContent>
          <GaPairsManager
            projectId={projectId}
            fileId={fileId}
            onGaPairsChange={handleGaPairsChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
