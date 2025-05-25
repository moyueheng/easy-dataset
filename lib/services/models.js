import { getModelConfigById } from '@/lib/db/model-config';
import { getProject } from '@/lib/db/projects';
import logger from '@/lib/util/logger';

/**
 * Get the active model configuration for a project
 * @param {string} projectId - Optional project ID to get the default model for
 * @returns {Promise<Object|null>} - Active model configuration or null
 */
export async function getActiveModel(projectId = null) {
  try {
    // If projectId is provided, get the default model for that project
    if (projectId) {
      const project = await getProject(projectId);
      if (project && project.defaultModelConfigId) {
        const modelConfig = await getModelConfigById(project.defaultModelConfigId);
        if (modelConfig) {
          logger.info(`Using default model for project ${projectId}: ${modelConfig.modelName}`);
          return modelConfig;
        }
      }
    }

    // If no specific project model found, try to get from localStorage context
    // This is a fallback for when the function is called without context
    logger.warn('No active model found');
    return null;

  } catch (error) {
    logger.error('Failed to get active model:', error);
    return null;
  }
}

/**
 * Get active model by ID
 * @param {string} modelConfigId - Model configuration ID
 * @returns {Promise<Object|null>} - Model configuration or null
 */
export async function getModelById(modelConfigId) {
  try {
    if (!modelConfigId) {
      logger.warn('No model ID provided');
      return null;
    }

    const modelConfig = await getModelConfigById(modelConfigId);
    if (modelConfig) {
      logger.info(`Retrieved model: ${modelConfig.modelName}`);
      return modelConfig;
    }

    logger.warn(`Model not found with ID: ${modelConfigId}`);
    return null;

  } catch (error) {
    logger.error('Failed to get model by ID:', error);
    return null;
  }
}

/**
 * Validate model configuration
 * @param {Object} modelConfig - Model configuration to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function validateModelConfig(modelConfig) {
  if (!modelConfig) {
    logger.error('Model configuration is null or undefined');
    return false;
  }

  const requiredFields = ['id', 'providerId', 'providerName', 'endpoint', 'modelName'];
  const missingFields = requiredFields.filter(field => !modelConfig[field]);

  if (missingFields.length > 0) {
    logger.error(`Model configuration missing required fields: ${missingFields.join(', ')}`);
    return false;
  }

  // Check if API key is required (not for ollama)
  if (modelConfig.providerId !== 'ollama' && !modelConfig.apiKey) {
    logger.error('Model configuration missing API key');
    return false;
  }

  return true;
}

/**
 * Format model configuration for LLM usage
 * @param {Object} modelConfig - Raw model configuration
 * @returns {Object} - Formatted model configuration
 */
export function formatModelForLLM(modelConfig) {
  if (!modelConfig) {
    throw new Error('Model configuration is required');
  }

  return {
    providerId: modelConfig.providerId,
    providerName: modelConfig.providerName,
    endpoint: modelConfig.endpoint,
    apiKey: modelConfig.apiKey || '',
    modelName: modelConfig.modelName,
    modelId: modelConfig.modelId || modelConfig.modelName,
    type: modelConfig.type || 'text',
    temperature: modelConfig.temperature || 0.7,
    maxTokens: modelConfig.maxTokens || 8192,
    topP: modelConfig.topP || 0.9,
    topK: modelConfig.topK || 0
  };
}
