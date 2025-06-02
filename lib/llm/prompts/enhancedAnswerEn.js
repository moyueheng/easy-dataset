/**
 * Enhanced answer generation prompt template - based on GA pairs
 * @param {Object} params - Parameter object
 * @param {string} params.text - Reference text content
 * @param {string} params.question - Question content
 * @param {string} params.language - Language
 * @param {string} params.globalPrompt - Global prompt
 * @param {string} params.answerPrompt - Answer prompt
 * @param {Array} params.gaPairs - GA pairs array containing genre and audience information
 * @param {Object} params.activeGaPair - Currently active GA pair
 */
export default function getEnhancedAnswerEnPrompt({
  text,
  question,
  globalPrompt = '',
  answerPrompt = '',
  activeGaPair = null
}) {
  if (globalPrompt) {
    globalPrompt = `In subsequent tasks, you must strictly follow these rules: ${globalPrompt}`;
  }
  if (answerPrompt) {
    answerPrompt = `In generating answers, you must strictly follow these rules: ${answerPrompt}`;
  }

  // Build GA pairs related prompts
  let gaPrompt = '';
  if (activeGaPair && activeGaPair.active) {
    gaPrompt = `
## Special Requirements - Genre & Audience Adaptation (MGA):
Adjust your response style and depth according to the following genre and audience combination:

**Current Genre**: ${activeGaPair.genre}
**Target Audience**: ${activeGaPair.audience}

Please ensure:
1. The organization, style, level of detail, and language of the answer should fully comply with the requirements of "${activeGaPair.genre}".
2. The answer should consider the comprehension ability and knowledge background of "${activeGaPair.audience}", striving for clarity and ease of understanding.
3. Word choice and explanation detail match the target audience's knowledge background.
4. Maintain content accuracy and professionalism while enhancing specificity.
5. If "${activeGaPair.genre}" or "${activeGaPair.audience}" suggests the need, the answer can appropriately include explanations, examples, or steps.
6. The answer should directly address the question, ensuring the logic and coherence of the Q&A. It should not include irrelevant information or citation marks, such as content mentioned in GA pairs, to prevent contaminating the data generation results.
`;
  } else {
    gaPrompt = '';
  }

  return `
# Role: Fine-tuning Dataset Generation Expert (MGA Enhanced)
## Profile:
- Description: You are an expert in generating fine-tuning datasets, skilled at generating accurate answers to questions from the given content, and capable of adjusting response style according to Genre-Audience combinations to ensure accuracy, relevance, and specificity of answers.
${globalPrompt}

## Skills:
1. The answer must be based on the given content.
2. The answer must be accurate and not fabricated.
3. The answer must be relevant to the question.
4. The answer must be logical.
5. Based on the given reference content, integrate into a complete answer using natural and fluent language, without mentioning literature sources or citation marks.
6. Ability to adjust response style and depth according to specified genre and audience combinations.
7. While maintaining content accuracy, enhance the specificity and applicability of answers.

${gaPrompt}

## Workflow:
1. Take a deep breath and work on this problem step-by-step.
2. First, analyze the given file content and question type.
3. Then, extract key information from the content.
4. If a specific genre and audience combination is specified, analyze how to adjust the response style.
5. Next, generate an accurate answer related to the question, adjusting expression according to genre-audience requirements.
6. Finally, ensure the accuracy, relevance, and style compatibility of the answer.

## Reference Content:
${text}

## Question
${question}

## Constraints:
1. The answer must be based on the given content.
2. The answer must be accurate and relevant to the question, and no fabricated information is allowed.
3. The answer must be comprehensive and detailed, containing all necessary information, and it is suitable for use in the training of fine-tuning large language models.
4. The answer must not contain any referential expressions like 'according to the reference/based on/literature mentions', only present the final results.
5. If a genre and audience combination is specified, the expression style and depth must be adjusted while maintaining content accuracy.
6. The answer must directly address the question, ensuring its accuracy and logicality.
${answerPrompt}
`;
}
