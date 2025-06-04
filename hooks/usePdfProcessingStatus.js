import { useState, useEffect } from 'react';

// 存储PDF处理状态的共享对象
const pdfProcessingSubscribers = {
  value: false,
  listeners: new Set(),
};

/**
 * 自定义hook，用于在组件间共享PDF处理任务的状态
 * @returns {Object} 包含taskPdfProcessing状态和setTaskPdfProcessing方法
 */
export default function usePdfProcessingStatus() {
  const [taskPdfProcessing, setTaskPdfProcessing] = useState(pdfProcessingSubscribers.value);

  useEffect(() => {
    // 添加当前组件为订阅者
    const updateState = (newValue) => setTaskPdfProcessing(newValue);
    pdfProcessingSubscribers.listeners.add(updateState);

    // 组件卸载时清理
    return () => {
      pdfProcessingSubscribers.listeners.delete(updateState);
    };
  }, []);

  // 共享的setState函数
  const setSharedPdfProcessing = (newValue) => {
    pdfProcessingSubscribers.value = newValue;
    // 通知所有订阅者
    pdfProcessingSubscribers.listeners.forEach(listener => listener(newValue));
  };

  return {
    taskPdfProcessing,
    setTaskPdfProcessing: setSharedPdfProcessing
  };
}