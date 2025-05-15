/**
 * Generate prompt for questions based on tag
 * @param {string} tagPath - Tag path, e.g., "Sports > Football"
 * @param {string} currentTag - Current tag name, e.g., "Football"
 * @param {number} count - Number of questions to generate, e.g., 5
 * @param {Array<string>} existingQuestions - Existing questions (to avoid duplication)
 * @returns {string} The prompt
 */
export function distillQuestionsEnPrompt(tagPath, currentTag, count = 5, existingQuestions = []) {
  const existingQuestionsText =
    existingQuestions.length > 0
      ? `Existing questions include: ${existingQuestions.join('\n- ')}. Please do not generate questions that duplicate these.`
      : '';

  return `
You are a professional question generation assistant. I need you to help me generate ${count} high-quality questions about "${currentTag}".

Tag path: ${tagPath}

Please follow these rules:
1. The questions should be directly related to the "${currentTag}" topic
2. Generate diverse questions covering different aspects of the topic
3. Questions should be clear, specific, and well-formulated
4. Questions should be suitable for knowledge-based answers
5. Questions should be at an appropriate difficulty level for general knowledge
6. Each question should be self-contained and not require additional context

${existingQuestionsText}

Please return the questions directly in JSON array format, without any additional explanation or description, in the following format:
["Question 1?", "Question 2?", "Question 3?", ...]
`;
}
