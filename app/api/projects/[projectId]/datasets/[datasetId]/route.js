import { NextResponse } from 'next/server';
import { getDatasetsById, getDatasetsCounts, getNavigationItems } from '@/lib/db/datasets';
import { getEncoding } from '@langchain/core/utils/tiktoken';

/**
 * 获取项目的所有数据集
 */
export async function GET(request, { params }) {
  try {
    const { projectId, datasetId } = params;
    // 验证项目ID
    if (!projectId) {
      return NextResponse.json({ error: '项目ID不能为空' }, { status: 400 });
    }
    if (!datasetId) {
      return NextResponse.json({ error: '数据集ID不能为空' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const operateType = searchParams.get('operateType');
    if (operateType !== null) {
      const data = await getNavigationItems(projectId, datasetId, operateType);
      return NextResponse.json(data);
    }
    const datasets = await getDatasetsById(datasetId);
    let counts = await getDatasetsCounts(projectId);

    const tokenCounts = {
      answerTokens: 0,
      cotTokens: 0
    };

    try {
      if (datasets.answer || datasets.cot) {
        // 使用 cl100k_base 编码，适用于 gpt-3.5-turbo 和 gpt-4
        const encoding = await getEncoding('cl100k_base');

        if (datasets.answer) {
          const tokens = encoding.encode(datasets.answer);
          tokenCounts.answerTokens = tokens.length;
        }

        if (datasets.cot) {
          const tokens = encoding.encode(datasets.cot);
          tokenCounts.cotTokens = tokens.length;
        }
      }
    } catch (error) {
      console.error('计算Token数量失败:', error);
    }

    return NextResponse.json({ datasets, ...counts, ...tokenCounts });
  } catch (error) {
    console.error('获取数据集详情失败:', error);
    return NextResponse.json(
      {
        error: error.message || '获取数据集详情失败'
      },
      { status: 500 }
    );
  }
}
