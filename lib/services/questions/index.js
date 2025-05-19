import LLMClient from '@/lib/llm/core/index';
import getQuestionPrompt from '@/lib/llm/prompts/question';
import getQuestionEnPrompt from '@/lib/llm/prompts/questionEn';
import getAddLabelPrompt from '@/lib/llm/prompts/addLabel';
import getAddLabelEnPrompt from '@/lib/llm/prompts/addLabelEn';
import { extractJsonFromLLMOutput } from '@/lib/llm/common/util';
import { getTaskConfig, getProject } from '@/lib/db/projects';
import { getTags } from '@/lib/db/tags';
import { getChunkById } from '@/lib/db/chunks';
import { saveQuestions } from '@/lib/db/questions';
import logger from '@/lib/util/logger';

/**
 * 随机移除问题中的问号
 * @param {Array} questions 问题列表
 * @param {Number} probability 移除概率(0-100)
 * @returns {Array} 处理后的问题列表
 */
function randomRemoveQuestionMark(questions, questionMaskRemovingProbability) {
  for (let i = 0; i < questions.length; i++) {
    // 去除问题结尾的空格
    let question = questions[i].trimEnd();

    if (Math.random() * 100 < questionMaskRemovingProbability && (question.endsWith('?') || question.endsWith('？'))) {
      question = question.slice(0, -1);
    }
    questions[i] = question;
  }
  return questions;
}

/**
 * 为指定文本块生成问题
 * @param {String} projectId 项目ID
 * @param {String} chunkId 文本块ID
 * @param {Object} options 选项
 * @param {String} options.model 模型名称
 * @param {String} options.language 语言(中文/en)
 * @param {Number} options.number 问题数量(可选)
 * @returns {Promise<Object>} 生成结果
 */
export async function generateQuestionsForChunk(projectId, chunkId, options) {
  try {
    const { model, language = '中文', number } = options;

    if (!model) {
      throw new Error('模型名称不能为空');
    }

    // 并行获取文本块内容和项目配置
    const [chunk, taskConfig, project] = await Promise.all([
      getChunkById(chunkId),
      getTaskConfig(projectId),
      getProject(projectId)
    ]);

    if (!chunk) {
      throw new Error('文本块不存在');
    }

    // 获取项目配置信息
    const { questionGenerationLength, questionMaskRemovingProbability = 60 } = taskConfig;
    const { globalPrompt, questionPrompt } = project;

    // 创建LLM客户端
    const llmClient = new LLMClient(model);
    // 生成问题的数量，如果未指定，则根据文本长度自动计算
    const questionNumber = number || Math.floor(chunk.content.length / questionGenerationLength);

    // 根据语言选择相应的提示词函数
    const promptFunc = language === 'en' ? getQuestionEnPrompt : getQuestionPrompt;
    const prompt = promptFunc({
      text: chunk.content,
      number: questionNumber,
      language,
      globalPrompt,
      questionPrompt
    });
    const response = await llmClient.getResponse(prompt);

    // 从LLM输出中提取JSON格式的问题列表
    const originalQuestions = extractJsonFromLLMOutput(response);
    console.log(222, originalQuestions);
    const questions = randomRemoveQuestionMark(originalQuestions, questionMaskRemovingProbability);
    console.log(333, questions);
    if (!questions || !Array.isArray(questions)) {
      throw new Error('生成问题失败');
    }

    // 先获取标签，确保 tags 在后续逻辑中可用
    const tags = await getTags(projectId);
    // 根据语言选择标签提示词函数
    const labelPromptFunc = language === 'en' ? getAddLabelEnPrompt : getAddLabelPrompt;
    const labelPrompt = labelPromptFunc(JSON.stringify(tags), JSON.stringify(questions));

    const labelResponse = await llmClient.getResponse(labelPrompt);
    const labelQuestions = extractJsonFromLLMOutput(labelResponse);

    console.log(111, labelQuestions);

    // 保存问题到数据库
    await saveQuestions(projectId, labelQuestions, chunkId);

    // 返回生成的问题
    return {
      chunkId,
      labelQuestions,
      total: labelQuestions.length
    };
  } catch (error) {
    logger.error('生成问题时出错:', error);
    throw error;
  }
}

export default {
  generateQuestionsForChunk
};
