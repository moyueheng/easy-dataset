import { NextResponse } from 'next/server';
import { batchGenerateGaPairs } from '@/lib/services/ga-pairs';
import { getUploadedFilesByProjectId } from '@/lib/db/upload-files';

/**
 * 批量生成多个文件的 GA 对
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const { fileIds, modelConfigId, language = '中文' } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'File IDs array is required' },
        { status: 400 }
      );
    }

    if (!modelConfigId) {
      return NextResponse.json(
        { error: 'Model configuration ID is required' },
        { status: 400 }
      );
    }

    // 获取文件信息和内容
    const files = await getUploadedFilesByProjectId(projectId);
    const targetFiles = files.filter(file => fileIds.includes(file.id));

    if (targetFiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid files found' },
        { status: 404 }
      );
    }

    // 批量生成 GA 对
    const results = await batchGenerateGaPairs(
      projectId,
      targetFiles,
      modelConfigId,
      language
    );

    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        success: successCount,
        failure: failureCount
      },
      message: `Generated GA pairs for ${successCount} files, ${failureCount} failed`
    });
  } catch (error) {
    console.error('Error batch generating GA pairs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to batch generate GA pairs' },
      { status: 500 }
    );
  }
}
