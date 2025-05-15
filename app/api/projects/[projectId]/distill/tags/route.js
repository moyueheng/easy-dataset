import { NextResponse } from 'next/server';
import { generateTagsPrompt } from '@/lib/llm/prompts/generateTags';
import { db } from '@/lib/db';

const LLMClient = require('@/lib/llm/core');

/**
 * 生成标签接口：根据顶级主题、某级标签构造指定数量的子标签
 */
export async function POST(request, { params }) {
  try {
    console.log('[标签生成] 开始处理请求');
    const { projectId } = params;

    // 验证项目ID
    if (!projectId) {
      return NextResponse.json({ error: '项目ID不能为空' }, { status: 400 });
    }

    console.log(`[标签生成] 项目ID: ${projectId}`);
    const { parentTag, parentTagId, count = 10, model } = await request.json();
    console.log(`[标签生成] 父标签: ${parentTag}, 父标签ID: ${parentTagId}, 数量: ${count}`);
    console.log(`[标签生成] 使用模型: ${model?.name || '默认模型'}`);

    if (!parentTag) {
      return NextResponse.json({ error: '主题标签名称不能为空' }, { status: 400 });
    }

    // 查询现有标签
    console.log(`[标签生成] 开始查询现有标签, projectId=${projectId}, parentId=${parentTagId || 'null'}`);
    const existingTags = await db.tags.findMany({
      where: {
        projectId,
        parentId: parentTagId || null
      }
    });

    console.log(`[标签生成] 查询到 ${existingTags.length} 个现有标签`);
    const existingTagNames = existingTags.map(tag => tag.label);
    console.log(`[标签生成] 现有标签名称: ${JSON.stringify(existingTagNames)}`);

    // 创建LLM客户端
    console.log('[标签生成] 开始创建LLM客户端');
    const llmClient = new LLMClient(model);

    // 生成提示词
    console.log('[标签生成] 开始生成提示词');
    const prompt = generateTagsPrompt(parentTag, existingTagNames, count);
    console.log(`[标签生成] 提示词长度: ${prompt.length}`);

    // 调用大模型生成标签
    console.log('[标签生成] 开始调用大模型');
    const { answer } = await llmClient.getResponseWithCOT(prompt);
    console.log('[标签生成] 大模型调用完成');

    // 解析返回的标签
    let tags = [];

    try {
      tags = JSON.parse(answer);
    } catch (error) {
      console.error('解析标签JSON失败:', error);
      // 尝试使用正则表达式提取标签
      const matches = answer.match(/"([^"]+)"/g);
      if (matches) {
        tags = matches.map(match => match.replace(/"/g, ''));
      }
    }

    // 保存标签到数据库
    console.log(`[标签生成] 开始保存 ${tags.length} 个标签到数据库`);
    const savedTags = [];
    for (let i = 0; i < tags.length; i++) {
      const tagName = tags[i];
      console.log(`[标签生成] 保存标签 ${i + 1}/${tags.length}: ${tagName}`);
      console.log({
        data: {
          label: tagName,
          projectId,
          parentId: parentTagId || null
        }
      });
      try {
        const tag = await db.tags.create({
          data: {
            label: tagName,
            projectId,
            parentId: parentTagId || null
          }
        });
        console.log(`[标签生成] 标签保存成功: ${tag.id}`);
        savedTags.push(tag);
      } catch (error) {
        console.error(`[标签生成] 保存标签 ${tagName} 失败:`, error);
        throw error;
      }
    }
    console.log(`[标签生成] 所有标签保存完成, 共 ${savedTags.length} 个`);

    return NextResponse.json(savedTags);
  } catch (error) {
    console.error('[标签生成] 生成标签失败:', error);
    console.error('[标签生成] 错误堆栈:', error.stack);
    return NextResponse.json({ error: error.message || '生成标签失败' }, { status: 500 });
  }
}
