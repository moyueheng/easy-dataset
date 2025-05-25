import { NextResponse } from 'next/server';
import { getGaPairsByFileId, updateGaPair, toggleGaPairActive, batchUpdateGaPairs, saveGaPairs, hasGaPairs, deleteGaPairsByFileId, createGaPairs } from '@/lib/db/ga-pairs';
import { getUploadFileInfoById } from '@/lib/db/upload-files';
import { generateGaPairs } from '@/lib/services/ga-generation';
import logger from '@/lib/util/logger';

/**
 * 生成文件的 GA 对
 */
export async function POST(request, { params }) {
  try {
    const { projectId, fileId } = params;
    const { regenerate = false } = await request.json();

    // 验证参数
    if (!projectId || !fileId) {
      return NextResponse.json(
        { error: 'Project ID and File ID are required' },
        { status: 400 }
      );
    }

    logger.info(`Starting GA pairs generation for project: ${projectId}, file: ${fileId}`);

    // 检查文件是否存在
    const file = await getUploadFileInfoById(fileId);
    if (!file || file.projectId !== projectId) {
      return NextResponse.json(
        { error: 'File not found or does not belong to the project' },
        { status: 404 }
      );
    }

    // 检查是否已有 GA 对，如果不是重新生成且已存在，则返回现有的
    if (!regenerate && await hasGaPairs(projectId, fileId)) {
      const existingGaPairs = await getGaPairsByFileId(fileId);
      return NextResponse.json({
        success: true,
        message: 'GA pairs already exist for this file',
        data: existingGaPairs
      });
    }

    // 读取文件内容
    const fileContent = await getFileContent(projectId, file.fileName);
    if (!fileContent) {
      return NextResponse.json(
        { error: 'Failed to read file content' },
        { status: 500 }
      );
    }

    logger.info(`File content loaded successfully, length: ${fileContent.length}`);    // 检查模型配置
    try {
      const { getActiveModel } = await import('@/lib/services/models');
      const activeModel = await getActiveModel(projectId);
      
      if (!activeModel) {
        logger.error('No active model configuration found');
        return NextResponse.json(
          { error: 'No active AI model configured. Please configure a model in settings first.' },
          { status: 400 }
        );
      }

      logger.info(`Using active model: ${activeModel.provider} - ${activeModel.model}`);
    } catch (modelError) {
      logger.error('Error checking model configuration:', modelError);
      return NextResponse.json(
        { error: 'Failed to load model configuration. Please check your AI model settings.' },
        { status: 500 }
      );
    }    // 调用 LLM 生成 GA 对
    logger.info(`Generating GA pairs for file: ${file.fileName}`);
    let generatedGaPairs;
    
    try {
      generatedGaPairs = await generateGaPairs(fileContent, projectId);
      
      if (!generatedGaPairs || generatedGaPairs.length === 0) {
        logger.warn('No GA pairs generated from LLM');
        return NextResponse.json(
          { error: 'No GA pairs could be generated from the file content. The content might be too short or not suitable for GA pair generation.' },
          { status: 400 }
        );
      }
      
      logger.info(`Successfully generated ${generatedGaPairs.length} GA pairs from LLM`);
    } catch (generationError) {
      logger.error('GA pairs generation failed:', generationError);
      
      // 提供更具体的错误信息
      let errorMessage = 'Failed to generate GA pairs';
      if (generationError.message.includes('No active model')) {
        errorMessage = 'No active AI model available. Please configure and activate a model in settings.';
      } else if (generationError.message.includes('API key')) {
        errorMessage = 'Invalid API key or model configuration. Please check your AI model settings.';
      } else if (generationError.message.includes('rate limit')) {
        errorMessage = 'API rate limit exceeded. Please try again later.';
      } else {
        errorMessage = `AI model error: ${generationError.message}`;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    // 保存到数据库
    try {
      await saveGaPairs(projectId, fileId, generatedGaPairs);
      logger.info('GA pairs saved to database successfully');
    } catch (saveError) {
      logger.error('Failed to save GA pairs to database:', saveError);
      return NextResponse.json(
        { error: 'Generated GA pairs successfully but failed to save to database' },
        { status: 500 }
      );
    }

    // 获取保存后的 GA 对
    const savedGaPairs = await getGaPairsByFileId(fileId);

    logger.info(`Successfully generated and saved ${savedGaPairs.length} GA pairs for file: ${file.fileName}`);

    return NextResponse.json({
      success: true,
      message: 'GA pairs generated successfully',
      data: savedGaPairs
    });

  } catch (error) {
    logger.error('Unexpected error in GA pairs generation:', error);
    return NextResponse.json(
      { error: error.message || 'Unexpected error occurred during GA pairs generation' },
      { status: 500 }
    );
  }
}

/**
 * 获取文件的 GA 对
 */
export async function GET(request, { params }) {
  try {
    const { projectId, fileId } = params;

    if (!projectId || !fileId) {
      return NextResponse.json(
        { error: 'Project ID and File ID are required' },
        { status: 400 }
      );
    }

    const gaPairs = await getGaPairsByFileId(fileId);

    return NextResponse.json({
      success: true,
      data: gaPairs
    });
  } catch (error) {
    console.error('Error getting GA pairs:', error);
    return NextResponse.json(
      { error: 'Failed to get GA pairs' },
      { status: 500 }
    );
  }
}

/**
 * 更新/替换文件的所有 GA 对
 */
export async function PUT(request, { params }) {
  try {
    const { projectId, fileId } = params;
    const body = await request.json();

    if (!projectId || !fileId) {
      return NextResponse.json(
        { error: 'Project ID and File ID are required' },
        { status: 400 }
      );
    }

    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates array is required' },
        { status: 400 }
      );
    }

    logger.info(`Replacing all GA pairs for file ${fileId} with ${updates.length} pairs`);

    // 首先删除所有现有的GA对
    await deleteGaPairsByFileId(fileId);

    // 然后创建新的GA对
    let results = [];
    if (updates.length > 0) {
      const gaPairData = updates.map((pair, index) => ({
        projectId,
        fileId,
        pairNumber: index + 1,
        genreTitle: pair.genreTitle,
        genreDesc: pair.genreDesc || '',
        audienceTitle: pair.audienceTitle,
        audienceDesc: pair.audienceDesc || '',
        isActive: pair.isActive !== undefined ? pair.isActive : true
      }));

      const createResult = await createGaPairs(gaPairData);
      // 获取创建后的GA对
      results = await getGaPairsByFileId(fileId);
    }

    logger.info(`Successfully replaced GA pairs, new count: ${results.length}`);

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error updating GA pairs:', error);
    return NextResponse.json(
      { error: 'Failed to update GA pairs' },
      { status: 500 }
    );
  }
}

/**
 * 切换 GA 对激活状态
 */
export async function PATCH(request, { params }) {
  try {
    const { projectId, fileId } = params;
    const body = await request.json();

    if (!projectId || !fileId) {
      return NextResponse.json(
        { error: 'Project ID and File ID are required' },
        { status: 400 }
      );
    }

    const { gaPairId, isActive } = body;

    if (!gaPairId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'GA pair ID and active status are required' },
        { status: 400 }
      );
    }

    const updatedPair = await toggleGaPairActive(gaPairId, isActive);

    return NextResponse.json({
      success: true,
      data: updatedPair
    });
  } catch (error) {
    console.error('Error toggling GA pair active status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle GA pair active status' },
      { status: 500 }
    );
  }
}

// Helper function to read file content
async function getFileContent(projectId, fileName) {
  try {
    const { getProjectRoot } = await import('@/lib/db/base');
    const path = await import('path');
    const fs = await import('fs');
    
    const projectRoot = await getProjectRoot();
    const filePath = path.join(projectRoot, projectId, 'files', fileName);
    
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    logger.error('Failed to read file content:', error);
    return null;
  }
}
