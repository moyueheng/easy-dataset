'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { selectedModelInfoAtom } from '@/lib/store';
import { Box, Typography, Paper, Container, Button, CircularProgress, Alert, Tabs, Tab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DistillTreeView from '@/components/distill/DistillTreeView';
import TagGenerationDialog from '@/components/distill/TagGenerationDialog';
import QuestionGenerationDialog from '@/components/distill/QuestionGenerationDialog';
import axios from 'axios';

export default function DistillPage() {
  const { t } = useTranslation();
  const params = useParams();
  const projectId = params.projectId;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [project, setProject] = useState(null);
  const [tags, setTags] = useState([]);
  const selectedModel = useAtomValue(selectedModelInfoAtom);

  // 对话框状态
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedTagPath, setSelectedTagPath] = useState('');

  const treeViewRef = useRef(null);

  // 获取项目信息和标签列表
  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchTags();
    }
  }, [projectId]);

  // 获取项目信息
  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('获取项目信息失败:', error);
      setError(t('common.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  // 获取标签列表
  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}/distill/tags/all`);
      setTags(response.data);
    } catch (error) {
      console.error('获取标签列表失败:', error);
      setError(t('common.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  // 打开生成标签对话框
  const handleOpenTagDialog = (tag = null, tagPath = '') => {
    if (!selectedModel || Object.keys(selectedModel).length === 0) {
      setError(t('distill.selectModelFirst'));
      return;
    }
    setSelectedTag(tag);
    setSelectedTagPath(tagPath);
    setTagDialogOpen(true);
  };

  // 打开生成问题对话框
  const handleOpenQuestionDialog = (tag, tagPath) => {
    if (!selectedModel || Object.keys(selectedModel).length === 0) {
      setError(t('distill.selectModelFirst'));
      return;
    }
    setSelectedTag(tag);
    setSelectedTagPath(tagPath);
    setQuestionDialogOpen(true);
  };

  // 处理标签生成完成
  const handleTagGenerated = () => {
    fetchTags(); // 重新获取标签列表
    setTagDialogOpen(false);
  };

  // 处理问题生成完成
  const handleQuestionGenerated = () => {
    // 关闭对话框
    setQuestionDialogOpen(false);

    // 刷新标签数据
    fetchTags();

    // 如果 treeViewRef 存在且有 fetchQuestionsStats 方法，则调用它刷新问题统计信息
    if (treeViewRef.current && typeof treeViewRef.current.fetchQuestionsStats === 'function') {
      treeViewRef.current.fetchQuestionsStats();
    }
  };

  if (!projectId) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{t('common.projectIdRequired')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            {t('distill.title')}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => handleOpenTagDialog(null)}
            disabled={!selectedModel}
            startIcon={<AddIcon />}
            sx={{ px: 3, py: 1 }}
          >
            {t('distill.generateRootTags')}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4, px: 3, py: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <DistillTreeView
              ref={treeViewRef}
              projectId={projectId}
              tags={tags}
              onGenerateSubTags={handleOpenTagDialog}
              onGenerateQuestions={handleOpenQuestionDialog}
            />
          </Box>
        )}
      </Paper>

      {/* 生成标签对话框 */}
      {tagDialogOpen && (
        <TagGenerationDialog
          open={tagDialogOpen}
          onClose={() => setTagDialogOpen(false)}
          onGenerated={handleTagGenerated}
          projectId={projectId}
          parentTag={selectedTag}
          tagPath={selectedTagPath}
          model={selectedModel}
        />
      )}

      {/* 生成问题对话框 */}
      {questionDialogOpen && (
        <QuestionGenerationDialog
          open={questionDialogOpen}
          onClose={() => setQuestionDialogOpen(false)}
          onGenerated={handleQuestionGenerated}
          projectId={projectId}
          tag={selectedTag}
          tagPath={selectedTagPath}
          model={selectedModel}
        />
      )}
    </Container>
  );
}
