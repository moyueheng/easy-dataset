import i18n from '@/lib/i18n';

export async function uploadFile({ file, projectId, fileContent, fileName, t }) {
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
  return data;
}

export async function deleteFile({ fileToDelete, projectId, domainTreeActionType, modelInfo, t }) {
  const response = await fetch(
    `/api/projects/${projectId}/files?fileId=${fileToDelete.fileId}&domainTreeAction=${domainTreeActionType || 'keep'}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
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
}
