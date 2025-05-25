import { getActiveModel } from '@/lib/services/models';
import { GA_GENERATION_PROMPT } from '@/lib/llm/prompts/ga-generation';
import logger from '@/lib/util/logger';

/**
 * Generate GA pairs for text content using LLM
 * @param {string} textContent - The text content to analyze
 * @param {string} projectId - The project ID to get the active model for
 * @param {Object} modelConfig - Optional model configuration
 * @returns {Promise<Array>} - Generated GA pairs
 */
export async function generateGaPairs(textContent, projectId, modelConfig = null) {
  try {
    logger.info('Starting GA pairs generation');

    // Get model configuration
    const model = modelConfig || await getActiveModel(projectId);
    if (!model) {
      throw new Error('No active model available for GA generation');
    }

    // Prepare the prompt with text content
    const prompt = GA_GENERATION_PROMPT.replace('{text_content}', textContent);

    // Call the LLM API
    const response = await callLLMAPI(model, prompt);

    // Parse the response
    const gaPairs = parseGaResponse(response);

    logger.info(`Successfully generated ${gaPairs.length} GA pairs`);
    return gaPairs;

  } catch (error) {
    logger.error('Failed to generate GA pairs:', error);
    throw error;
  }
}

/**
 * Call LLM API with the given model and prompt
 * @param {Object} model - Model configuration
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} - LLM response
 */
async function callLLMAPI(model, prompt) {
  try {
    const LLMClient = (await import('@/lib/llm/core/index')).default;
      const llmClient = new LLMClient(model);
    const response = await llmClient.chat([
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.7,
        maxTokens: 2000
      });

    if (!response || !response.text) {
      throw new Error('Invalid response from LLM');
    }

    return response.text;

  } catch (error) {
    logger.error('LLM API call failed:', error);
    throw new Error(`LLM API call failed: ${error.message}`);
  }
}

/**
 * Parse GA pairs from LLM response
 * @param {string} response - Raw LLM response
 * @returns {Array} - Parsed GA pairs
 */
function parseGaResponse(response) {
  try {
    // Log the raw response for debugging
    logger.info('Raw LLM response:', response);
    
    // Try to extract JSON from the response
    let jsonStr = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.includes('```json')) {
      const match = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    } else if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }
    
    // Try to find JSON array in the response
    const arrayMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }
    
    // Clean up common LLM response issues
    jsonStr = jsonStr
      .replace(/^[^[\{]*/, '') // Remove text before JSON
      .replace(/[^}\]]*$/, '') // Remove text after JSON
      .replace(/,\s*\}/g, '}') // Remove trailing commas in objects
      .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
      .trim();

    logger.info('Cleaned JSON string:', jsonStr);

    const parsed = JSON.parse(jsonStr);

    // Handle case where response is wrapped in an object
    let gaPairsArray = parsed;
    if (!Array.isArray(parsed)) {
      // Check if it's wrapped in a property
      if (parsed.gaPairs && Array.isArray(parsed.gaPairs)) {
        gaPairsArray = parsed.gaPairs;
      } else if (parsed.pairs && Array.isArray(parsed.pairs)) {
        gaPairsArray = parsed.pairs;
      } else if (parsed.results && Array.isArray(parsed.results)) {
        gaPairsArray = parsed.results;
      } else {
        throw new Error('Response is not an array and no array property found');
      }
    }

    // Validate the structure
    const validatedPairs = gaPairsArray.map((pair, index) => {
      if (!pair.genre || !pair.audience) {
        throw new Error(`GA pair ${index + 1} missing genre or audience`);
      }

      if (!pair.genre.title || !pair.genre.description || 
          !pair.audience.title || !pair.audience.description) {
        throw new Error(`GA pair ${index + 1} missing required fields`);
      }

      return {
        genre: {
          title: String(pair.genre.title).trim(),
          description: String(pair.genre.description).trim()
        },
        audience: {
          title: String(pair.audience.title).trim(),
          description: String(pair.audience.description).trim()
        }
      };
    });

    // Ensure we have exactly 5 pairs
    if (validatedPairs.length !== 5) {
      logger.warn(`Expected 5 GA pairs, got ${validatedPairs.length}. Using first 5 or padding with fallbacks.`);
      
      // If we have more than 5, take the first 5
      if (validatedPairs.length > 5) {
        return validatedPairs.slice(0, 5);
      }
      
      // If we have fewer than 5, pad with fallbacks
      const fallbacks = getFallbackGaPairs();
      while (validatedPairs.length < 5) {
        validatedPairs.push(fallbacks[validatedPairs.length]);
      }
    }

    logger.info(`Successfully parsed ${validatedPairs.length} GA pairs`);
    return validatedPairs;

  } catch (error) {
    logger.error('Failed to parse GA response:', error);
    logger.error('Raw response:', response);
    
    // Return fallback GA pairs if parsing fails
    logger.info('Using fallback GA pairs due to parsing failure');
    return getFallbackGaPairs();
  }
}

/**
 * Get fallback GA pairs when generation fails
 * @returns {Array} - Default GA pairs
 */
function getFallbackGaPairs() {
  return [
    {
      genre: {
        title: "Academic Research",
        description: "Scholarly, research-oriented content with formal tone and detailed analysis"
      },
      audience: {
        title: "Researchers",
        description: "Academic researchers and graduate students seeking in-depth knowledge"
      }
    },
    {
      genre: {
        title: "Educational Guide",
        description: "Structured learning material with clear explanations and examples"
      },
      audience: {
        title: "Students",
        description: "Undergraduate students and learners new to the subject"
      }
    },
    {
      genre: {
        title: "Professional Manual",
        description: "Practical, implementation-focused content for workplace application"
      },
      audience: {
        title: "Practitioners",
        description: "Industry professionals applying knowledge in practice"
      }
    },
    {
      genre: {
        title: "Popular Science",
        description: "Accessible content that makes complex topics understandable"
      },
      audience: {
        title: "General Public",
        description: "Curious readers without specialized background"
      }
    },
    {
      genre: {
        title: "Technical Documentation",
        description: "Detailed specifications and implementation guidelines"
      },
      audience: {
        title: "Developers",
        description: "Technical specialists and system implementers"
      }
    }
  ];
}

/**
 * Enhance question with GA pair context
 * @param {string} question - Original question
 * @param {Object} gaPair - GA pair to use for enhancement
 * @param {string} context - Text context
 * @returns {Promise<string>} - Enhanced question
 */
export async function enhanceQuestionWithGA(question, gaPair, context) {
  try {
    const { ENHANCED_QUESTION_PROMPT } = await import('@/lib/llm/prompts/ga-generation');
    
    const model = await getActiveModel();
    if (!model) {
      throw new Error('No active model available for question enhancement');
    }

    const prompt = ENHANCED_QUESTION_PROMPT
      .replace('{original_question}', question)
      .replace('{genre_title}', gaPair.genreTitle)
      .replace('{genre_description}', gaPair.genreDesc)
      .replace('{audience_title}', gaPair.audienceTitle)
      .replace('{audience_description}', gaPair.audienceDesc)
      .replace('{context}', context);

    const response = await callLLMAPI(model, prompt);
    
    return response.trim();

  } catch (error) {
    logger.error('Failed to enhance question with GA:', error);
    // Return original question if enhancement fails
    return question;
  }
}

/**
 * Enhance answer with GA pair context
 * @param {string} question - The question
 * @param {string} answer - Original answer
 * @param {Object} gaPair - GA pair to use for enhancement
 * @param {string} context - Text context
 * @returns {Promise<string>} - Enhanced answer
 */
export async function enhanceAnswerWithGA(question, answer, gaPair, context) {
  try {
    const { ENHANCED_ANSWER_PROMPT } = await import('@/lib/llm/prompts/ga-generation');
    
    const model = await getActiveModel();
    if (!model) {
      throw new Error('No active model available for answer enhancement');
    }

    const prompt = ENHANCED_ANSWER_PROMPT
      .replace('{question}', question)
      .replace('{original_answer}', answer)
      .replace('{genre_title}', gaPair.genreTitle)
      .replace('{genre_description}', gaPair.genreDesc)
      .replace('{audience_title}', gaPair.audienceTitle)
      .replace('{audience_description}', gaPair.audienceDesc)
      .replace('{context}', context);

    const response = await callLLMAPI(model, prompt);
    
    return response.trim();

  } catch (error) {
    logger.error('Failed to enhance answer with GA:', error);
    // Return original answer if enhancement fails
    return answer;
  }
}
