import { getProjectRoot } from '@/lib/db/base';
import { getTaskConfig } from '@/lib/db/projects';
import convertPrompt from '@/lib/llm/prompts/pdfToMarkdown';
import convertPromptEn from '@/lib/llm/prompts/pdfToMarkdownEn';
import reTitlePrompt from '@/lib/llm/prompts/optimalTitle';
import reTitlePromptEn from '@/lib/llm/prompts/optimalTitleEn';
import path from 'path';
import { getModelConfigByProjectId } from '@/lib/db/model-config';
import { parsePdf } from '@tiny-tool/pdf2md';

class VisionStrategy {
  constructor(processor) {
    this.processor = processor;
  }

  async process(projectId, fileName, options) {
    try {
      const { updateTask, taskId } = options;
      
      console.log('正在执行Vision转换策略......');
      
      // 更新任务状态
      if (updateTask && taskId) {
        await updateTask(taskId, {
          detail: '正在使用Vision策略处理PDF...',
          note: 'Vision策略处理中'
        });
      }

      // 获取项目路径
      const projectRoot = await getProjectRoot();
      const projectPath = path.join(projectRoot, projectId);
      const filePath = path.join(projectPath, 'files', fileName);
      
      // 获取项目配置
      const taskConfig = await getTaskConfig(projectId);
      const modelConfig = await getModelConfigByProjectId(projectId);
      const visionId = options.visionModelId;

      if (!visionId) {
        throw new Error('请检查是否配置PDF转换视觉大模型');
      }

      const model = modelConfig.find(item => item.id === visionId);
      if (!model) {
        throw new Error('请检查是否配置PDF转换视觉大模型');
      }

      if (model.type !== 'vision') {
        throw new Error(`${model.modelName}(${model.providerName}) 此模型不是视觉大模型，请检查【模型配置】`);
      }

      if (!model.apiKey) {
        throw new Error(`${model.modelName}(${model.providerName}) 此模型未配置API密钥，请检查【模型配置】`);
      }

      // 配置API端点
      let baseUrl = model.endpoint;
      if (model.modelId.startsWith('gpt-4') || model.modelId.startsWith('gpt-3.5') || 
          model.modelId.startsWith('doubao')) {
        if (!baseUrl.includes('/chat/completions')) {
          baseUrl = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
        }
      }

      const convert = options.language === 'en' ? convertPromptEn : convertPrompt;
      const reTitle = options.language === 'en' ? reTitlePromptEn : reTitlePrompt;

      const config = {
        pdfPath: filePath,
        outputDir: path.join(projectPath, 'files'),
        apiKey: model.apiKey,
        model: model.modelId,
        baseUrl: baseUrl,
        useFullPage: true,
        verbose: false,
        concurrency: taskConfig.visionConcurrencyLimit,
        prompt: convert(),
        textPrompt: reTitle(),
        onProgress: async (progress) => {
          if (updateTask && taskId) {
            await updateTask(taskId, {
              detail: `处理进度: ${progress.percentage}%`,
              note: `已处理 ${progress.processed}/${progress.total} 页`
            });
          }
        }
      };

      console.log('Vision策略 开始处理PDF文件');
      await parsePdf(filePath, config);

      // 更新任务完成状态
      if (updateTask && taskId) {
        await updateTask(taskId, {
          detail: 'Vision策略处理完成',
          note: 'PDF转换成功'
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Vision策略处理出错:', error);
      if (updateTask && taskId) {
        await updateTask(taskId, {
          detail: 'Vision策略处理失败',
          note: error.message
        });
      }
      throw error;
    }
  }
}

module.exports = VisionStrategy;
