import { NextResponse } from 'next/server';
import { generateGaPairsForFile } from '@/lib/services/ga-pairs';
import { getProject } from '@/lib/db/projects';
import { getActiveModel } from '@/lib/services/models';
import logger from '@/lib/util/logger';

/**
 * Generate GA pairs for a single file
 * POST /api/projects/[projectId]/ga-pairs/[fileId]/generate
 */
export async function POST(request, { params }) {
  try {
    const { projectId, fileId } = params;
    
    // Validate parameters
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // Verify project exists
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { modelConfigId, language = '中文' } = body;    // Get model configuration
    let modelConfig;
    if (modelConfigId) {
      const { getModelById } = await import('@/lib/services/models');
      modelConfig = await getModelById(modelConfigId);
      if (!modelConfig) {
        return NextResponse.json({ error: '模型配置未找到' }, { status: 400 });
      }
    } else {
      // Use default active model
      modelConfig = await getActiveModel(projectId);
      if (!modelConfig) {
        return NextResponse.json({ error: '请先选择模型' }, { status: 400 });
      }
    }

    logger.info(`Generating GA pairs for file ${fileId} in project ${projectId}`);

    // Generate GA pairs
    const result = await generateGaPairsForFile(projectId, fileId, modelConfig.id, language);

    return NextResponse.json({
      success: true,
      message: 'GA pairs generated successfully',
      data: result
    });

  } catch (error) {
    logger.error('GA pairs generation failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to generate GA pairs' 
      }, 
      { status: 500 }
    );
  }
}

/**
 * Get GA pairs for a single file
 * GET /api/projects/[projectId]/ga-pairs/[fileId]/generate
 */
export async function GET(request, { params }) {
  try {
    const { projectId, fileId } = params;
    
    // Validate parameters
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // Verify project exists
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get GA pairs for file
    const { getGaPairsByFileId } = await import('@/lib/db/ga-pairs');
    const gaPairs = await getGaPairsByFileId(fileId);

    return NextResponse.json({
      success: true,
      data: {
        fileId,
        gaPairs: gaPairs || []
      }
    });

  } catch (error) {
    logger.error('Failed to get GA pairs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get GA pairs' 
      }, 
      { status: 500 }
    );
  }
}
