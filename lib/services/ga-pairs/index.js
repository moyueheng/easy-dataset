import { createLlmClient } from '@/lib/llm/core';
import { getModelConfigById } from '@/lib/db/model-config';
import { getGaPrompt } from '@/lib/llm/prompts/gaPrompt';
import { createGaPairs, deleteGaPairsByFileId } from '@/lib/db/ga-pairs';

/**
 * 生成单个文件的 GA 对
 * @param {string} projectId - 项目 ID
 * @param {string} fileId - 文件 ID
 * @param {string} content - 文件内容
 * @param {string} modelConfigId - 模型配置 ID
 * @param {string} language - 生成语言
 * @returns {Promise<Array>} 生成的 GA 对
 */
export async function generateGaPairsForFile(projectId, fileId, content, modelConfigId, language = '中文') {
  try {
    // 获取模型配置
    const modelConfig = await getModelConfigById(modelConfigId);
    if (!modelConfig) {
      throw new Error('Model configuration not found');
    }

    // 创建 LLM 客户端
    const llmClient = createLlmClient(modelConfig);

    // 生成提示词
    const prompt = getGaPrompt({ text: content, language });

    // 调用 LLM API
    const response = await llmClient.chat([
      { role: 'user', content: prompt }
    ]);

    // 解析响应
    let gaData;
    try {
      // 提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      gaData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse GA response:', parseError);
      throw new Error('Failed to parse model response');
    }

    // 验证响应格式
    if (!gaData || typeof gaData !== 'object') {
      throw new Error('Invalid response format');
    }

    // 删除该文件的旧 GA 对
    await deleteGaPairsByFileId(fileId);

    // 转换为数据库格式
    const gaPairs = [];
    for (let i = 1; i <= 5; i++) {
      const audienceKey = `audience_${i}`;
      const genreKey = `genre_${i}`;
      
      if (gaData[audienceKey] && gaData[genreKey]) {
        gaPairs.push({
          projectId,
          fileId,
          pairNumber: i,
          genreTitle: gaData[genreKey].title || `Genre ${i}`,
          genreDesc: gaData[genreKey].description || '',
          audienceTitle: gaData[audienceKey].title || `Audience ${i}`,
          audienceDesc: gaData[audienceKey].description || '',
          isActive: true
        });
      }
    }

    if (gaPairs.length === 0) {
      throw new Error('No valid GA pairs generated');
    }

    // 保存到数据库
    const createdPairs = await createGaPairs(gaPairs);
    return createdPairs;
  } catch (error) {
    console.error('Error generating GA pairs:', error);
    throw error;
  }
}

/**
 * 批量生成多个文件的 GA 对
 * @param {string} projectId - 项目 ID
 * @param {Array} files - 文件列表，每个包含 { id, content }
 * @param {string} modelConfigId - 模型配置 ID
 * @param {string} language - 生成语言
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Array>} 生成结果
 */
export async function batchGenerateGaPairs(projectId, files, modelConfigId, language = '中文', onProgress = null) {
  const results = [];
  let completed = 0;

  for (const file of files) {
    try {
      const gaPairs = await generateGaPairsForFile(
        projectId,
        file.id,
        file.content,
        modelConfigId,
        language
      );
      
      results.push({
        fileId: file.id,
        fileName: file.fileName,
        success: true,
        gaPairs
      });
      
      completed++;
      if (onProgress) {
        onProgress(completed, files.length, file.fileName);
      }
    } catch (error) {
      console.error(`Failed to generate GA pairs for file ${file.id}:`, error);
      results.push({
        fileId: file.id,
        fileName: file.fileName,
        success: false,
        error: error.message
      });
      
      completed++;
      if (onProgress) {
        onProgress(completed, files.length, file.fileName, error.message);
      }
    }
  }

  return results;
}
