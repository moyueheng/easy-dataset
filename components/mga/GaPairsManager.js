'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AutoFixHigh as AutoFixHighIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * GA Pairs Manager Component
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 * @param {string} props.fileId - File ID
 * @param {Function} props.onGaPairsChange - Callback when GA pairs change
 */
export default function GaPairsManager({ projectId, fileId, onGaPairsChange }) {
  const { t } = useTranslation();
  const [gaPairs, setGaPairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newGaPair, setNewGaPair] = useState({ goal: '', approach: '', isActive: true });

  useEffect(() => {
    loadGaPairs();
  }, [projectId, fileId]);

  const loadGaPairs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}/ga-pairs`);
      
      // 检查响应状态
      if (!response.ok) {
        if (response.status === 404) {
          // API路由不存在，可能是开发环境问题
          console.warn('GA Pairs API not found, using empty data');
          setGaPairs([]);
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to load GA pairs`);
      }

      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format');
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        console.warn('Empty response, using empty GA pairs data');
        setGaPairs([]);
        return;
      }

      const result = JSON.parse(responseText);
      console.log('Load GA pairs result:', result);
      
      if (result.success) {
        setGaPairs(result.data || []);
        onGaPairsChange?.(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load GA pairs');
      }
    } catch (error) {
      console.error('Load GA pairs error:', error);
      
      // 如果是网络错误或API不可用，设置空数据但不显示错误
      if (error.message.includes('fetch') || error.message.includes('404')) {
        setGaPairs([]);
      } else {
        setError(`Unable to load GA pairs: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateGaPairs = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      console.log('Starting GA pairs generation...');
      
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}/ga-pairs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          regenerate: true
        })
      });

      console.log('Generate response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to generate GA pairs';
        
        try {
          const errorResult = await response.json();
          console.error('Generate error response:', errorResult);
          
          if (response.status === 404) {
            errorMessage = 'GA Pairs generation service is not available. Please check your API configuration.';
          } else if (response.status === 400) {
            if (errorResult.error?.includes('No active AI model')) {
              errorMessage = 'Please configure an AI model in settings before generating GA pairs.';
            } else if (errorResult.error?.includes('content might be too short')) {
              errorMessage = 'The file content is too short or not suitable for GA pair generation.';
            } else {
              errorMessage = errorResult.error || errorMessage;
            }
          } else if (response.status === 500) {
            if (errorResult.error?.includes('model configuration') || errorResult.error?.includes('Module not found')) {
              errorMessage = 'AI model configuration error. The required dependencies may not be installed.';
            } else {
              errorMessage = errorResult.error || 'Internal server error occurred.';
            }
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Server error (${response.status}). Please try again later.`;
        }
        
        throw new Error(errorMessage);
      }

      // 处理成功响应
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from generation service');
      }

      const result = JSON.parse(responseText);
      console.log('Generate GA pairs result:', result);
      
      if (result.success) {
        setGaPairs(result.data || []);
        onGaPairsChange?.(result.data || []);
        setSuccess(`Successfully generated ${result.data?.length || 0} Genre-Audience pairs`);
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generate GA pairs error:', error);
      setError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const saveGaPairs = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}/ga-pairs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          updates: gaPairs.map((pair, index) => ({
            id: pair.id || `temp_${index}`,
            ...pair
          }))
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save GA pairs';
        
        if (response.status === 404) {
          errorMessage = 'GA Pairs save service is not available.';
        } else {
          try {
            const errorResult = await response.json();
            errorMessage = errorResult.error || errorMessage;
          } catch (parseError) {
            errorMessage = `Server error (${response.status})`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      const result = responseText ? JSON.parse(responseText) : { success: true };
      
      if (result.success) {
        setSuccess('Genre-Audience pairs saved successfully');
        onGaPairsChange?.(gaPairs);
      } else {
        throw new Error(result.error || 'Save operation failed');
      }
    } catch (error) {
      console.error('Save GA pairs error:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGaPairChange = (index, field, value) => {
    const updatedGaPairs = [...gaPairs];
    updatedGaPairs[index] = { ...updatedGaPairs[index], [field]: value };
    setGaPairs(updatedGaPairs);
  };

  const handleDeleteGaPair = (index) => {
    const updatedGaPairs = gaPairs.filter((_, i) => i !== index);
    setGaPairs(updatedGaPairs);
    onGaPairsChange?.(updatedGaPairs);
  };

  const handleAddGaPair = () => {
    // 修正：改为Genre-Audience字段
    if (!newGaPair.genre?.trim() || !newGaPair.audience?.trim()) {
      setError('Genre and Audience are required');
      return;
    }

    const updatedGaPairs = [...gaPairs, { 
      ...newGaPair, 
      id: Date.now().toString() // 临时ID
    }];
    setGaPairs(updatedGaPairs);
    onGaPairsChange?.(updatedGaPairs);
    
    // 重置表单并关闭对话框
    setNewGaPair({ genre: '', audience: '', isActive: true });
    setAddDialogOpen(false);
    setSuccess('Genre-Audience pair added successfully');
  };

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(resetMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading GA pairs...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header with action buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Genre-Audience Pairs Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* 修改：右上角按钮改为手动添加GA对 */}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            disabled={generating || saving}
          >
            Add GA Pair
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveGaPairs}
            disabled={generating || saving || gaPairs.length === 0}
          >
            {saving ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={resetMessages}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={resetMessages}>
          {success}
        </Alert>
      )}

      {/* Generate GA Pairs Section - 只在没有GA对时显示 */}
      {gaPairs.length === 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No Genre-Audience Pairs Found
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 2 }}>
              Generate AI-powered Genre-Audience pairs for this file
            </Typography>
            <Button
              variant="contained"
              startIcon={generating ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
              onClick={generateGaPairs}
              disabled={generating}
              size="large"
            >
              {generating ? 'Generating...' : 'Generate Genre-Audience Pairs'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* GA Pairs List */}
      {gaPairs.length > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Active Genre-Audience Pairs ({gaPairs.filter(pair => pair.isActive).length}/{gaPairs.length})
          </Typography>
          
          <Grid container spacing={2}>
            {gaPairs.map((pair, index) => (
              <Grid item xs={12} key={pair.id || index}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="subtitle2" color="primary">
                        Genre-Audience Pair #{index + 1}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={pair.isActive}
                              onChange={(e) => handleGaPairChange(index, 'isActive', e.target.checked)}
                              size="small"
                            />
                          }
                          label="Active"
                        />
                        {/* 添加删除按钮 */}
                        <Tooltip title="Delete GA Pair">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteGaPair(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="Genre"
                        value={pair.genreTitle || pair.genre || ''}
                        onChange={(e) => handleGaPairChange(index, 'genreTitle', e.target.value)}
                        multiline
                        rows={2}
                        fullWidth
                        disabled={!pair.isActive}
                      />
                      <TextField
                        label="Genre Description"
                        value={pair.genreDesc || ''}
                        onChange={(e) => handleGaPairChange(index, 'genreDesc', e.target.value)}
                        multiline
                        rows={2}
                        fullWidth
                        disabled={!pair.isActive}
                      />
                      <TextField
                        label="Audience"
                        value={pair.audienceTitle || pair.audience || ''}
                        onChange={(e) => handleGaPairChange(index, 'audienceTitle', e.target.value)}
                        multiline
                        rows={2}
                        fullWidth
                        disabled={!pair.isActive}
                      />
                      <TextField
                        label="Audience Description"
                        value={pair.audienceDesc || ''}
                        onChange={(e) => handleGaPairChange(index, 'audienceDesc', e.target.value)}
                        multiline
                        rows={2}
                        fullWidth
                        disabled={!pair.isActive}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {/* 在GA对列表下方也添加生成按钮 */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="outlined"
              startIcon={generating ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
              onClick={generateGaPairs}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate More Genre-Audience Pairs'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Add GA Pair Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Genre-Audience Pair</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Genre"
              value={newGaPair.genre || ''}
              onChange={(e) => setNewGaPair({ ...newGaPair, genre: e.target.value })}
              multiline
              rows={3}
              fullWidth
              placeholder="Describe the genre or category..."
            />
            <TextField
              label="Audience"
              value={newGaPair.audience || ''}
              onChange={(e) => setNewGaPair({ ...newGaPair, audience: e.target.value })}
              multiline
              rows={3}
              fullWidth
              placeholder="Describe the target audience..."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newGaPair.isActive}
                  onChange={(e) => setNewGaPair({ ...newGaPair, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddGaPair} variant="contained">
            Add Genre-Audience Pair
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
