import { NextResponse } from 'next/server';
import { generateQuestionsPrompt } from '@/lib/llm/prompts/generateQuestions';
import { db } from '@/lib/db';

const LLMClient = require('@/lib/llm/core');

/**
 * 生成问题接口：根据某个标签链路构造指定数量的问题
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    // 验证项目ID
    if (!projectId) {
      return NextResponse.json({ error: '项目ID不能为空' }, { status: 400 });
    }

    const { tagPath, currentTag, tagId, count = 10 } = await request.json();

    if (!currentTag || !tagPath) {
      return NextResponse.json({ error: '标签信息不能为空' }, { status: 400 });
    }

    // 首先获取或创建蒸馏文本块
    let distillChunk = await db.chunks.findFirst({
      where: {
        projectId,
        name: 'Distilled Content'
      }
    });

    if (!distillChunk) {
      // 创建一个特殊的蒸馏文本块
      distillChunk = await db.chunks.create({
        data: {
          name: 'Distilled Content',
          projectId,
          fileId: 'distilled',
          fileName: 'distilled.md',
          content: '此文本块用于存储通过数据蒸馏生成的问题，不与实际文献相关。',
          summary: '蒸馏生成的问题集合',
          size: 0
        }
      });
    }

    // 获取已有的问题，避免重复
    const existingQuestions = await db.questions.findMany({
      where: {
        projectId,
        label: currentTag,
        chunkId: distillChunk.id // 使用蒸馏文本块的 ID
      },
      select: { question: true }
    });

    const existingQuestionTexts = existingQuestions.map(q => q.question);

    // 获取项目配置
    const project = await db.projects.findUnique({
      where: { id: projectId }
    });

    // 获取默认模型配置
    const modelConfig = await db.modelConfig.findFirst({
      where: {
        projectId,
        id: project.defaultModelConfigId
      }
    });

    if (!modelConfig) {
      return NextResponse.json({ error: '未找到默认模型配置' }, { status: 400 });
    }

    // 创建LLM客户端
    const llmClient = new LLMClient({
      providerId: modelConfig.providerId,
      endpoint: modelConfig.endpoint,
      apiKey: modelConfig.apiKey,
      modelName: modelConfig.modelName,
      temperature: modelConfig.temperature
    });

    // 生成提示词
    const prompt = generateQuestionsPrompt(tagPath, currentTag, count, existingQuestionTexts);
    console.log(11, prompt);

    // 调用大模型生成问题
    const { answer } = await llmClient.getResponseWithCOT(prompt);

    // 解析返回的问题
    let questions = [];

    try {
      questions = JSON.parse(answer);
    } catch (error) {
      console.error('解析问题JSON失败:', error);
      // 尝试使用正则表达式提取问题
      const matches = answer.match(/"([^"]+)"/g);
      if (matches) {
        questions = matches.map(match => match.replace(/"/g, ''));
      }
    }

    // 保存问题到数据库
    const savedQuestions = [];
    for (const questionText of questions) {
      const question = await db.questions.create({
        data: {
          question: questionText,
          projectId,
          label: currentTag,
          chunkId: distillChunk.id
        }
      });
      savedQuestions.push(question);
    }

    return NextResponse.json(savedQuestions);
  } catch (error) {
    console.error('生成问题失败:', error);
    return NextResponse.json({ error: error.message || '生成问题失败' }, { status: 500 });
  }
}
