'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { selectedModelInfoAtom } from '@/lib/store';
import { useAtomValue } from 'jotai/index';
import i18n from '@/lib/i18n';
import axios from 'axios';

/**
 * PDF处理的自定义Hook
 * @param {string} projectId - 项目ID
 * @returns {Object} - PDF处理状态和操作方法
 */
export default function usePdfProcessing(projectId) {
  const { t } = useTranslation();
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    percentage: 0,
    questionCount: 0
  });
  const model = useAtomValue(selectedModelInfoAtom);

  /**
   * 重置进度状态
   */
  const resetProgress = useCallback(() => {
    setTimeout(() => {
      setProgress({
        total: 0,
        completed: 0,
        percentage: 0,
        questionCount: 0
      });
    }, 1000); // 延迟重置，让用户看到完成的进度
  }, []);

  /**
   * 处理PDF文件
   * @param {Array} pdfFiles - PDF文件列表
   * @param {string} pdfStrategy - PDF处理策略
   * @param {string} selectedViosnModel - 选定的视觉模型
   * @param {Function} setError - 设置错误信息的函数
   */
  const handlePdfProcessing = useCallback(
    async (pdfFiles, pdfStrategy, selectedViosnModel, setError) => {
      try {
        setPdfProcessing(true);
        setError && setError(null);

        // 重置进度：基于新上传的文件数量
        setProgress({
          total: pdfFiles.length,
          completed: 0,
          percentage: 0,
          questionCount: 0
        });

        const currentLanguage = i18n.language === 'zh-CN' ? '中文' : 'en';

        //获取到视觉策略要使用的模型
        const availableModels = JSON.parse(localStorage.getItem('modelConfigList'));
        const vsionModel = availableModels.find(m => m.id === selectedViosnModel);

        // 为每个PDF文件创建后台任务
        for (const file of pdfFiles) {
          debugger;
          const response = await axios.post(`/api/projects/${projectId}/tasks/list`, {
            taskType: 'pdf-processing',
            modelInfo: vsionModel,
            language: i18n.language,
            detail: 'PDF处理任务',
            note: {
              textModel: localStorage.getItem('selectedModelInfo'),
              projectId,
              file: file,
              strategy: pdfStrategy,
              language: currentLanguage,
            }
          });

          if (response.data?.code !== 0) {
            throw new Error(t('textSplit.pdfProcessingFailed') + (response.data?.error || ''));
          }

          // 更新进度状态
          setProgress(prev => {
            const completed = prev.completed + 1;
            const percentage = Math.round((completed / prev.total) * 100);
            return {
              ...prev,
              completed,
              percentage
            };
          });
        }
      } catch (error) {
        console.error(t('textSplit.pdfProcessingFailed'), error);
        setError && setError({ severity: 'error', message: error.message });
      } finally {
        setPdfProcessing(false);
        // 重置进度状态
        resetProgress();
      }
    },
    [projectId, t, resetProgress]
  );

  return {
    pdfProcessing,
    progress,
    setPdfProcessing,
    setProgress,
    handlePdfProcessing,
    resetProgress
  };
}
