import { NextResponse } from 'next/server';
import { getQuestionsForChunk } from '@/lib/db/questions';
import logger from '@/lib/util/logger';
import questionService from '@/lib/services/questions';

// 为指定文本块生成问题
export async function POST(request, { params }) {
  try {
    const { projectId, chunkId } = params;

    // 验证项目ID和文本块ID
    if (!projectId || !chunkId) {
      return NextResponse.json({ error: 'Project ID or text block ID cannot be empty' }, { status: 400 });
    }

    // 获取请求体
    const { model, language = '中文', number } = await request.json();

    if (!model) {
      return NextResponse.json({ error: 'Model cannot be empty' }, { status: 400 });
    }

    // 使用问题生成服务
    const result = await questionService.generateQuestionsForChunk(projectId, chunkId, {
      model,
      language,
      number
    });

    // 返回生成的问题
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error generating questions:', error);
    return NextResponse.json({ error: error.message || 'Error generating questions' }, { status: 500 });
  }
}

// 获取指定文本块的问题
export async function GET(request, { params }) {
  try {
    const { projectId, chunkId } = params;

    // 验证项目ID和文本块ID
    if (!projectId || !chunkId) {
      return NextResponse.json({ error: 'The item ID or text block ID cannot be empty' }, { status: 400 });
    }

    // 获取文本块的问题
    const questions = await getQuestionsForChunk(projectId, chunkId);

    // 返回问题列表
    return NextResponse.json({
      chunkId,
      questions,
      total: questions.length
    });
  } catch (error) {
    console.error('Error getting questions:', error);
    return NextResponse.json({ error: error.message || 'Error getting questions' }, { status: 500 });
  }
}
