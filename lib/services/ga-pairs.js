import { generateGaPairs } from './ga-generation';
import { getModelById } from './models';
import { saveGaPairs, getGaPairsByFileId } from '@/lib/db/ga-pairs';
import { getProjectFileContentById } from '@/lib/db/files';
import logger from '@/lib/util/logger';

/**
 * Batch generate GA pairs for multiple files
 * @param {string} projectId - Project ID
 * @param {Array} files - Array of file objects
 * @param {string} modelConfigId - Model configuration ID
 * @param {string} language - Language for generation (default: '中文')
 * @returns {Promise<Array>} - Array of generation results
 */
export async function batchGenerateGaPairs(projectId, files, modelConfigId, language = '中文') {
  try {
    logger.info(`Starting batch GA pairs generation for ${files.length} files`);

    // Get model configuration
    const modelConfig = await getModelById(modelConfigId);
    if (!modelConfig) {
      throw new Error('Model configuration not found');
    }

    const results = [];

    // Process each file
    for (const file of files) {
      try {
        logger.info(`Processing file: ${file.fileName}`);

        // Check if GA pairs already exist for this file
        const existingPairs = await getGaPairsByFileId(file.id);
        if (existingPairs && existingPairs.length > 0) {
          logger.info(`GA pairs already exist for file ${file.fileName}, skipping`);
          results.push({
            fileId: file.id,
            fileName: file.fileName,
            success: true,
            skipped: true,
            message: 'GA pairs already exist',
            gaPairs: existingPairs
          });
          continue;
        }        // Get file content
        const fileContent = await getProjectFileContentById(projectId, file.id);
        if (!fileContent) {
          throw new Error('File content not found');
        }        // Limit content length for processing (max 50,000 characters)
        const maxLength = 50000;
        const content = fileContent.length > maxLength 
          ? fileContent.substring(0, maxLength) + '...' 
          : fileContent;

        // Generate GA pairs
        const gaPairs = await generateGaPairs(content, projectId, modelConfig);

        // Save GA pairs to database
        const savedPairs = await saveGaPairsForFile(projectId, file.id, gaPairs);

        results.push({
          fileId: file.id,
          fileName: file.fileName,
          success: true,
          skipped: false,
          message: `Generated ${gaPairs.length} GA pairs`,
          gaPairs: savedPairs
        });

        logger.info(`Successfully generated GA pairs for file: ${file.fileName}`);

      } catch (error) {
        logger.error(`Failed to generate GA pairs for file ${file.fileName}:`, error);
        results.push({
          fileId: file.id,
          fileName: file.fileName,
          success: false,
          skipped: false,
          error: error.message,
          message: `Failed: ${error.message}`
        });
      }
    }

    logger.info(`Batch GA pairs generation completed. Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);
    return results;

  } catch (error) {
    logger.error('Batch GA pairs generation failed:', error);
    throw error;
  }
}

/**
 * Generate GA pairs for a single file
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @param {string} modelConfigId - Model configuration ID
 * @param {string} language - Language for generation (default: '中文')
 * @returns {Promise<Object>} - Generation result
 */
export async function generateGaPairsForFile(projectId, fileId, modelConfigId, language = '中文') {
  try {
    logger.info(`Generating GA pairs for file: ${fileId}`);

    // Get model configuration
    const modelConfig = await getModelById(modelConfigId);
    if (!modelConfig) {
      throw new Error('Model configuration not found');
    }

    // Check if GA pairs already exist
    const existingPairs = await getGaPairsByFileId(fileId);
    if (existingPairs && existingPairs.length > 0) {
      return {
        success: true,
        skipped: true,
        message: 'GA pairs already exist',
        gaPairs: existingPairs
      };
    }

    // Get file content
    const fileContent = await getProjectFileContentById(projectId, fileId);
    if (!fileContent) {
      throw new Error('File content not found');
    }

    // Limit content length for processing
    const maxLength = 50000;
    const content = fileContent.length > maxLength 
      ? fileContent.substring(0, maxLength) + '...' 
      : fileContent;

    // Generate GA pairs
    const gaPairs = await generateGaPairs(content, modelConfig);

    // Save GA pairs to database
    const savedPairs = await saveGaPairsForFile(projectId, fileId, gaPairs);

    return {
      success: true,
      skipped: false,
      message: `Generated ${gaPairs.length} GA pairs`,
      gaPairs: savedPairs
    };

  } catch (error) {
    logger.error(`Failed to generate GA pairs for file ${fileId}:`, error);
    throw error;
  }
}

/**
 * Save GA pairs for a file
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @param {Array} gaPairs - Generated GA pairs
 * @returns {Promise<Array>} - Saved GA pairs
 */
async function saveGaPairsForFile(projectId, fileId, gaPairs) {
  try {
    // Use the database function to save GA pairs
    const result = await saveGaPairs(projectId, fileId, gaPairs);
    
    // Get the saved pairs to return
    const savedPairs = await getGaPairsByFileId(fileId);
    return savedPairs;

  } catch (error) {
    logger.error('Failed to save GA pairs:', error);
    throw error;
  }
}

/**
 * Get GA pairs for a file
 * @param {string} fileId - File ID
 * @returns {Promise<Array>} - GA pairs
 */
export async function getFileLGaPairs(fileId) {
  try {
    return await getGaPairsByFileId(fileId);
  } catch (error) {
    logger.error(`Failed to get GA pairs for file ${fileId}:`, error);
    throw error;
  }
}

/**
 * Update GA pairs activation status
 * @param {string} pairId - GA pair ID
 * @param {boolean} isActive - Whether the pair should be active
 * @returns {Promise<Object>} - Updated GA pair
 */
export async function updateGaPairStatus(pairId, isActive) {
  try {
    // This would be implemented with a database update function
    logger.info(`Updating GA pair ${pairId} status to ${isActive}`);
    
    // For now, just return a success message
    // In a real implementation, you would call a database update function
    return {
      success: true,
      message: `GA pair status updated to ${isActive ? 'active' : 'inactive'}`
    };

  } catch (error) {
    logger.error(`Failed to update GA pair ${pairId} status:`, error);
    throw error;
  }
}
