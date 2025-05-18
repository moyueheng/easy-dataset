'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

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
        for (const file of pdfFiles) {
          const response = await fetch(
            `/api/projects/${projectId}/pdf?fileName=${encodeURIComponent(file.name)}&strategy=${pdfStrategy}&currentLanguage=${currentLanguage}&modelId=${selectedViosnModel}`
          );
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(t('textSplit.pdfProcessingFailed') + errorData.error);
          }
          const data = await response.json();

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
