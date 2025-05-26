import { NextResponse } from 'next/server';
import { generateGaPairsForFile } from '@/lib/services/ga-pairs';

/**
 * 为单个文件生成 GA 对
 */
export async function POST(request, { params }) {
  try {
    const { projectId, fileId } = params;
    const body = await request.json();

    if (!projectId || !fileId) {
      return NextResponse.json(
        { error: 'Project ID and File ID are required' },
        { status: 400 }
      );
    }

    const { modelConfigId, language = '中文' } = body;

    if (!modelConfigId) {
      return NextResponse.json(
        { error: 'Model configuration ID is required' },
        { status: 400 }
      );
    }    // 生成 GA 对
    const result = await generateGaPairsForFile(
      projectId,
      fileId,
      modelConfigId,
      language
    );
    return NextResponse.json({
      success: true,
      data: result,
      message: result.skipped ? 'GA pairs already exist' : 'GA pairs generated successfully'
    });
  } catch (error) {
    console.error('Error generating GA pairs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate GA pairs' },
      { status: 500 }
    );
  }
}
