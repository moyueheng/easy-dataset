import { useState, useEffect } from 'react';

// 存储PDF处理状态的共享对象
const pdfProcessingSubscribers = {
  value: false,
  listeners: new Set(),
};

// 存储PDF任务信息的共享对象
const pdfTaskSubscribers = {
  value: null,
  listeners: new Set(),
};

/**
 * 自定义hook，用于在组件间共享PDF处理任务的状态
 * @returns {Object} 包含taskPdfProcessing状态和setTaskPdfProcessing方法，以及task对象和setTask方法
 */
export default function usePdfProcessingStatus() {
  const [taskPdfProcessing, setTaskPdfProcessing] = useState(pdfProcessingSubscribers.value);
  const [task, setTask] = useState(pdfTaskSubscribers.value);

  useEffect(() => {
    // 添加当前组件为订阅者
    const updateProcessingState = (newValue) => setTaskPdfProcessing(newValue);
    const updateTaskState = (newTask) => setTask(newTask);
    
    pdfProcessingSubscribers.listeners.add(updateProcessingState);
    pdfTaskSubscribers.listeners.add(updateTaskState);

    // 组件卸载时清理
    return () => {
      pdfProcessingSubscribers.listeners.delete(updateProcessingState);
      pdfTaskSubscribers.listeners.delete(updateTaskState);
    };
  }, []);

  // 共享的setState函数
  const setSharedPdfProcessing = (newValue) => {
    pdfProcessingSubscribers.value = newValue;
    // 通知所有订阅者
    pdfProcessingSubscribers.listeners.forEach(listener => listener(newValue));
  };

  // 共享的setTask函数
  const setSharedTask = (newTask) => {
    pdfTaskSubscribers.value = newTask;
    // 通知所有订阅者
    pdfTaskSubscribers.listeners.forEach(listener => listener(newTask));
  };

  return {
    taskPdfProcessing,
    task,
    setTaskPdfProcessing: setSharedPdfProcessing,
    setTask: setSharedTask
  };
}
