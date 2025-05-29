'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import mammoth from 'mammoth';
import { Paper, Alert, Snackbar, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAtomValue } from 'jotai/index';
import { selectedModelInfoAtom } from '@/lib/store';
import UploadArea from './components/UploadArea';
import FileList from './components/FileList';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import PdfProcessingDialog from './components/PdfProcessingDialog';
import DomainTreeActionDialog from './components/DomainTreeActionDialog';
import i18n from '@/lib/i18n';
import TurndownService from 'turndown';

/**
 * File uploader component
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 * @param {Function} props.onUploadSuccess - Upload success callback
 * @param {Function} props.onProcessStart - Process start callback
 */
export default function FileUploader({
  projectId,
  onUploadSuccess,
  onProcessStart,
  onFileDeleted,
  sendToPages,
  setPdfStrategy,
  pdfStrategy,
  selectedViosnModel,
  setSelectedViosnModel,
  setPageLoading
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const selectedModelInfo = useAtomValue(selectedModelInfoAtom);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pdfProcessConfirmOpen, setpdfProcessConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState({});
  const [domainTreeActionOpen, setDomainTreeActionOpen] = useState(false);
  const [domainTreeAction, setDomainTreeAction] = useState('');
  const [isFirstUpload, setIsFirstUpload] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [taskSettings, setTaskSettings] = useState(null);
  const [visionModels, setVisionModels] = useState([]);
  // 设置PDF文件的处理方式
  const handleRadioChange = event => {
    // 传递这个值的原因是setSelectedViosnModel是异步的,PdfProcessingDialog检测到模型变更设置新的值
    // 这里没法及时获取到，会导致提示选中的模型仍然是旧模型
    const modelId = event.target.selectedVision;

    setPdfStrategy(event.target.value);

    if (event.target.value === 'mineru') {
      setSuccessMessage(t('textSplit.mineruSelected'));
    } else if (event.target.value === 'vision') {
      const model = visionModels.find(item => item.id === modelId);
      setSuccessMessage(
        t('textSplit.customVisionModelSelected', {
          name: model.modelName,
          provider: model.projectName
        })
      );
    } else {
      setSuccessMessage(t('textSplit.defaultSelected'));
    }

    setSuccess(true);
  };

  // Load uploaded files list
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  // Fetch uploaded files list
  const fetchUploadedFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/files`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('textSplit.fetchFilesFailed'));
      }

      const data = await response.json();
      setUploadedFiles(data);

      // 判断是否为第一次上传（没有任何文件）
      setIsFirstUpload(data.total === 0);

      //获取到配置信息，用于判断用户是否启用MinerU和视觉大模型
      const taskResponse = await fetch(`/api/projects/${projectId}/tasks`);
      if (!taskResponse.ok) {
        throw new Error(t('settings.fetchTasksFailed'));
      }

      const taskData = await taskResponse.json();

      setTaskSettings(taskData);

      //使用Jotai会出现数据获取的延迟，导致这里模型获取不到，改用localStorage获取模型信息
      const model = JSON.parse(localStorage.getItem('modelConfigList'));

      //过滤出视觉模型
      const visionItems = model.filter(item => item.type === 'vision' && item.apiKey);

      //先默认选择第一个配置的视觉模型
      if (visionItems.length > 0) {
        setSelectedViosnModel(visionItems[0].id);
      }

      setVisionModels(visionItems);
    } catch (error) {
      console.error('获取文件列表出错:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理文件选择
  const handleFileSelect = event => {
    const selectedFiles = Array.from(event.target.files);

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);

    if (oversizedFiles.length > 0) {
      setError(`Max 50MB: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    const validFiles = selectedFiles.filter(
      file =>
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.docx') ||
        file.name.endsWith('.pdf')
    );
    const invalidFiles = selectedFiles.filter(
      file =>
        !file.name.endsWith('.md') &&
        !file.name.endsWith('.txt') &&
        !file.name.endsWith('.docx') &&
        !file.name.endsWith('.pdf')
    );

    if (invalidFiles.length > 0) {
      setError(t('textSplit.unsupportedFormat', { files: invalidFiles.map(f => f.name).join(', ') }));
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
    // If there are PDF files among the uploaded files, let the user choose the way to process the PDF files.
    const hasPdfFiles = selectedFiles.filter(file => file.name.endsWith('.pdf'));
    if (hasPdfFiles.length > 0) {
      setpdfProcessConfirmOpen(true);
      setPdfFiles(hasPdfFiles);
    }
  };

  // 移除文件
  const removeFile = index => {
    // 获取将要被移除的文件信息
    const fileToRemove = files[index];
    // 更新 files 状态，移除该文件
    setFiles(prev => prev.filter((_, i) => i !== index));
    // 如果被移除的文件是 PDF，则同时更新 pdfFiles 状态
    if (fileToRemove && fileToRemove.name.toLowerCase().endsWith('.pdf')) {
      setPdfFiles(prevPdfFiles => prevPdfFiles.filter(pdfFile => pdfFile.name !== fileToRemove.name));
    }
  };

  // 上传文件
  const uploadFiles = async () => {
    if (files.length === 0) return;

    // 如果是第一次上传，直接走默认逻辑
    if (isFirstUpload) {
      handleStartUpload('rebuild');
      return;
    }

    // 否则打开领域树操作选择对话框
    setDomainTreeAction('upload');
    setPendingAction({ type: 'upload' });
    setDomainTreeActionOpen(true);
  };

  // 处理领域树操作选择
  const handleDomainTreeAction = action => {
    setDomainTreeActionOpen(false);

    // 执行挂起的操作
    if (pendingAction && pendingAction.type === 'upload') {
      handleStartUpload(action);
    } else if (pendingAction && pendingAction.type === 'delete') {
      handleDeleteFile(action);
    }

    // 清除挂起的操作
    setPendingAction(null);
  };

  // 开始上传文件
  const handleStartUpload = async domainTreeActionType => {
    setUploading(true);
    setError(null);

    try {
      const uploadedFileInfos = [];

      for (const file of files) {
        let fileContent;
        let fileName = file.name;

        // 如果是 docx 文件，先转换为 markdown
        if (file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const htmlResult = await mammoth.convertToHtml(
            { arrayBuffer },
            {
              convertImage: image => {
                return mammoth.docx.paragraph({
                  children: [
                    mammoth.docx.textRun({
                      text: ''
                    })
                  ]
                });
              }
            }
          );
          const turndownService = new TurndownService();
          fileContent = turndownService.turndown(htmlResult.value);
          console.log(222, fileContent);
          fileName = file.name.replace('.docx', '.md');
        } else {
          // 对于 md 和 txt 文件，直接读取内容
          const reader = new FileReader();
          fileContent = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
          });
          fileName = file.name.replace('.txt', '.md');
        }

        // // 使用自定义请求头发送文件
        const response = await fetch(`/api/projects/${projectId}/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-file-name': encodeURIComponent(fileName)
          },
          body: file.name.endsWith('.docx') ? new TextEncoder().encode(fileContent) : fileContent
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(t('textSplit.uploadFailed') + errorData.error);
        }

        const data = await response.json();
        uploadedFileInfos.push({ fileName: data.fileName, fileId: data.fileId });
      }

      setSuccessMessage(t('textSplit.uploadSuccess', { count: files.length }));
      setSuccess(true);
      setFiles([]);

      await fetchUploadedFiles();

      // 上传成功后，返回文件名列表和选中的模型信息，并传递领域树操作类型
      if (onUploadSuccess) {
        await onUploadSuccess(uploadedFileInfos, pdfFiles, domainTreeActionType);
      }
    } catch (err) {
      setError(err.message || t('textSplit.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  // 打开删除确认对话框
  const openDeleteConfirm = (fileId, fileName) => {
    setFileToDelete({ fileId, fileName });
    setDeleteConfirmOpen(true);
  };

  // 关闭删除确认对话框
  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setFileToDelete(null);
  };

  // 删除文件前确认领域树操作
  const confirmDeleteFile = () => {
    setDeleteConfirmOpen(false);

    // 如果没有其他文件了（删除后会变为空），直接删除
    if (uploadedFiles.total <= 1) {
      handleDeleteFile('keep');
      return;
    }

    // 否则打开领域树操作选择对话框
    setDomainTreeAction('delete');
    setPendingAction({ type: 'delete' });
    setDomainTreeActionOpen(true);
  };

  // 关闭PDF处理框
  const closePdfProcessConfirm = () => {
    setpdfProcessConfirmOpen(false);
  };

  // 处理删除文件
  const handleDeleteFile = async domainTreeActionType => {
    if (!fileToDelete) return;

    try {
      setLoading(true);
      closeDeleteConfirm();

      // 使用 Jotai 状态管理获取模型信息
      const modelInfo = selectedModelInfo || {};

      const response = await fetch(
        `/api/projects/${projectId}/files?fileId=${fileToDelete.fileId}&domainTreeAction=${domainTreeActionType || 'keep'}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          // 在 DELETE 请求中也传递模型信息和语言环境
          body: JSON.stringify({
            model: modelInfo,
            language: i18n.language === 'zh-CN' ? '中文' : 'en'
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('textSplit.deleteFailed'));
      }

      // 刷新文件列表
      await fetchUploadedFiles();

      // 通知父组件文件已删除，需要刷新文本块列表
      if (onFileDeleted) {
        const filesLength = uploadedFiles.total;
        onFileDeleted(fileToDelete, filesLength);
      }

      setSuccessMessage(t('textSplit.deleteSuccess', { fileName: fileToDelete.fileName }));
      setSuccess(true);
    } catch (error) {
      console.error('删除文件出错:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setFileToDelete(null);
    }
  };

  // 关闭错误提示
  const handleCloseError = () => {
    setError(null);
  };

  // 关闭成功提示
  const handleCloseSuccess = () => {
    setSuccess(false);
  };

  const handleSelected = array => {
    sendToPages(array);
  };
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2
      }}
    >
      <Grid container spacing={3}>
        {/* 左侧：上传文件区域 */}
        <Grid item xs={10} md={5} sx={{ maxWidth: '100%', width: '100%' }}>
          <UploadArea
            theme={theme}
            files={files}
            uploading={uploading}
            uploadedFiles={uploadedFiles}
            onFileSelect={handleFileSelect}
            onRemoveFile={removeFile}
            onUpload={uploadFiles}
          />
        </Grid>

        {/* 右侧：已上传文件列表 */}
        <Grid item xs={14} md={7} sx={{ maxWidth: '100%', width: '100%' }}>
          <FileList
            theme={theme}
            files={uploadedFiles}
            loading={loading}
            setPageLoading={setPageLoading}
            sendToFileUploader={handleSelected}
            onDeleteFile={openDeleteConfirm}
            projectId={projectId}
          />
        </Grid>
      </Grid>

      <Snackbar open={!!error} autoHideDuration={2000} onClose={handleCloseError}>
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={success} autoHideDuration={2000} onClose={handleCloseSuccess}>
        <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        fileName={fileToDelete?.fileName}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDeleteFile}
      />

      {/* 领域树操作选择对话框 */}
      <DomainTreeActionDialog
        open={domainTreeActionOpen}
        onClose={() => setDomainTreeActionOpen(false)}
        onConfirm={handleDomainTreeAction}
        isFirstUpload={isFirstUpload}
        action={domainTreeAction}
      />
      {/* 检测到pdf的处理框 */}
      <PdfProcessingDialog
        open={pdfProcessConfirmOpen}
        onClose={closePdfProcessConfirm}
        onRadioChange={handleRadioChange}
        value={pdfStrategy}
        projectId={projectId}
        taskSettings={taskSettings}
        visionModels={visionModels}
        selectedViosnModel={selectedViosnModel}
        setSelectedViosnModel={setSelectedViosnModel}
      />
    </Paper>
  );
}
