import { NextResponse } from 'next/server';
import { getDatasetsById, getDatasetsCounts, getNavigationItems } from '@/lib/db/datasets';

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

    return NextResponse.json({ datasets, ...counts });
  } catch (error) {
    console.error('获取数据集详情失败:', String(error));
    return NextResponse.json(
      {
        error: error.message || '获取数据集详情失败'
      },
      { status: 500 }
    );
  }
}
