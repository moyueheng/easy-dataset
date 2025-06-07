'use client';

import axios from 'axios';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Box, Tabs, Tab, Alert, AlertTitle } from '@mui/material';
import FileUploader from '@/components/text-split/FileUploader';
import LoadingBackdrop from '@/components/text-split/LoadingBackdrop';
import PdfSettings from '@/components/text-split/PdfSettings';
import ChunkList from '@/components/text-split/ChunkList';
import DomainAnalysis from '@/components/text-split/DomainAnalysis';
import useTaskSettings from '@/hooks/useTaskSettings';
import { useAtomValue } from 'jotai/index';
import { selectedModelInfoAtom } from '@/lib/store';
import useChunks from './useChunks';
import useQuestionGeneration from './useQuestionGeneration';
import useFileProcessing from './useFileProcessing';
import useFileProcessingStatus from '@/hooks/useFileProcessingStatus';
import { toast } from 'sonner';

export default function TextSplitPage({ params }) {
  const { t } = useTranslation();
  const { projectId } = params;
  const [activeTab, setActiveTab] = useState(0);
  const { taskSettings } = useTaskSettings(projectId);
  const [pdfStrategy, setPdfStrategy] = useState('default');
  const [questionFilter, setQuestionFilter] = useState('all'); // 'all', 'generated', 'ungenerated'
  const [selectedViosnModel, setSelectedViosnModel] = useState('');
  const selectedModelInfo = useAtomValue(selectedModelInfoAtom);
  const { taskFileProcessing, task } = useFileProcessingStatus();

  // 使用自定义hooks
  const { chunks, tocData, loading, fetchChunks, handleDeleteChunk, handleEditChunk, updateChunks, setLoading } =
    useChunks(projectId, questionFilter);

  const {
    processing,
    progress: questionProgress,
    handleGenerateQuestions
  } = useQuestionGeneration(projectId, taskSettings);

  const { fileProcessing, progress: pdfProgress, handleFileProcessing } = useFileProcessing(projectId);

  // 当前页面使用的进度状态
  const progress = processing ? questionProgress : pdfProgress;

  // 加载文本块数据
  useEffect(() => {
    fetchChunks('all');
  }, [fetchChunks, taskFileProcessing]);

  /**
   * 对上传后的文件进行处理
   */
  const handleUploadSuccess = async (fileNames, pdfFiles, domainTreeAction) => {
    try {
      await handleFileProcessing(fileNames, pdfStrategy, selectedViosnModel, domainTreeAction);
      location.reload();
    } catch (error) {
      toast.error('File upload failed' + error.message || '');
    }
  };

  // 包装生成问题的处理函数
  const onGenerateQuestions = async chunkIds => {
    await handleGenerateQuestions(chunkIds, selectedModelInfo, fetchChunks);
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    if (questionFilter !== 'all') {
      url.searchParams.set('filter', questionFilter);
    } else {
      url.searchParams.delete('filter');
    }
    window.history.replaceState({}, '', url);
    fetchChunks(questionFilter);
  }, [questionFilter]);

  const handleSelected = array => {
    if (array.length > 0) {
      axios.post(`/api/projects/${projectId}/chunks`, { array }).then(response => {
        updateChunks(response.data);
      });
    } else {
      fetchChunks();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8, position: 'relative' }}>
      {/* 文件上传组件 */}
      <FileUploader
        projectId={projectId}
        onUploadSuccess={handleUploadSuccess}
        onFileDeleted={fetchChunks}
        setPageLoading={setLoading}
        sendToPages={handleSelected}
        setPdfStrategy={setPdfStrategy}
        pdfStrategy={pdfStrategy}
        selectedViosnModel={selectedViosnModel}
        setSelectedViosnModel={setSelectedViosnModel}
        taskFileProcessing={taskFileProcessing}
        fileTask={task}
      >
        <PdfSettings
          pdfStrategy={pdfStrategy}
          setPdfStrategy={setPdfStrategy}
          selectedViosnModel={selectedViosnModel}
          setSelectedViosnModel={setSelectedViosnModel}
        />
      </FileUploader>

      {/* 标签页 */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(event, newValue) => {
            setActiveTab(newValue);
          }}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab label={t('textSplit.tabs.smartSplit')} />
          <Tab label={t('textSplit.tabs.domainAnalysis')} />
        </Tabs>

        {/* 智能分割标签内容 */}
        {activeTab === 0 && (
          <ChunkList
            projectId={projectId}
            chunks={chunks}
            onDelete={handleDeleteChunk}
            onEdit={handleEditChunk}
            onGenerateQuestions={onGenerateQuestions}
            loading={loading}
            questionFilter={questionFilter}
            setQuestionFilter={setQuestionFilter}
            selectedModel={selectedModelInfo}
          />
        )}

        {/* 领域分析标签内容 */}
        {activeTab === 1 && <DomainAnalysis projectId={projectId} toc={tocData} loading={loading} />}
      </Box>

      {/* 加载中蒙版 */}
      <LoadingBackdrop open={loading} title={t('textSplit.loading')} description={t('textSplit.fetchingDocuments')} />

      {/* 处理中蒙版 */}
      <LoadingBackdrop open={processing} title={t('textSplit.processing')} progress={progress} />

      {/* 文件处理进度蒙版 */}
      <LoadingBackdrop open={fileProcessing} title={t('textSplit.pdfProcessing')} progress={progress} />
    </Container>
  );
}
