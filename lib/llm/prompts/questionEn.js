/**
 * Builds the GA prompt string.
 * @param {Object} activeGaPair - The currently active GA pair.
 * @returns {String} The constructed GA prompt string.
 */
function buildGaPrompt(activeGaPair = null) {
  if (activeGaPair && activeGaPair.active) {
    return `
## Special Requirements - Genre & Audience Perspective Questioning:
Adjust your questioning approach and question style based on the following genre and audience combination:

**Target Genre**: ${activeGaPair.genre}
**Target Audience**: ${activeGaPair.audience}

Please ensure:
1. The question should fully conform to the style, focus, depth, and other attributes defined by "${activeGaPair.genre}".
2. The question should consider the knowledge level, cognitive characteristics, and potential points of interest of "${activeGaPair.audience}".
3. Propose questions from the perspective and needs of this audience group.
4. Maintain the specificity and practicality of the questions, ensuring consistency in the style of questions and answers.
5. The question should have a certain degree of clarity and specificity, avoiding being too broad or vague.
`;
  }

  return '';
}

/**
 * Question generation prompt template.
 * @param {string} text - The text to be processed.
 * @param {number} number - The number of questions.
 * @param {string} language - The language of the questions.
 * @param {string} globalPrompt - Global prompt for the LLM.
 * @param {string} questionPrompt - Specific prompt for question generation.
 * @param {Object} activeGaPair - The currently active GA pair.
 * @returns {string} The complete prompt for question generation.
 */
module.exports = function getQuestionPrompt({
  text,
  number = Math.floor(text.length / 240),
  language = 'English',
  globalPrompt = '',
  questionPrompt = '',
  activeGaPair = null
}) {
  if (globalPrompt) {
    globalPrompt = `In subsequent tasks, you must strictly follow these rules: ${globalPrompt}`;
  }
  if (questionPrompt) {
    questionPrompt = `- In generating questions, you must strictly follow these rules: ${questionPrompt}`;
  }

  // Build GA pairs related prompts
  const gaPrompt = buildGaPrompt(activeGaPair);

  return `
    # Role Mission
    You are a professional text analysis expert, skilled at extracting key information from complex texts and generating structured data(only generate questions) that can be used for model fine - tuning.
    ${globalPrompt}

    ## Core Task
    Based on the text provided by the user(length: ${text.length} characters), generate no less than ${number} high - quality questions.

    ## Constraints(Important!!!)
    ✔️ Must be directly generated based on the text content.
    ✔️ Questions should have a clear answer orientation.
    ✔️ Should cover different aspects of the text.
    ❌ It is prohibited to generate hypothetical, repetitive, or similar questions.

    ${gaPrompt}

    ## Processing Flow
    1. 【Text Parsing】Process the content in segments, identify key entities and core concepts.
    2. 【Question Generation】Select the best questioning points based on the information density${gaPrompt ? ', and incorporate the specified genre-audience perspective' : ''}
    3. 【Quality Check】Ensure that:
       - The answers to the questions can be found in the original text.
       - The labels are strongly related to the question content.
       - There are no formatting errors.
       ${gaPrompt ? '- Question style matches the specified genre and audience' : ''}

    ## Output Format
    - The JSON array format must be correct.
    - Use English double - quotes for field names.
    - The output JSON array must strictly follow the following structure:
    \`\`\`json
    ["Question 1", "Question 2", "..."]
    \`\`\`

    ## Output Example
    \`\`\`json
    [ "What core elements should an AI ethics framework include?", "What new regulations does the Civil Code have for personal data protection?"]
     \`\`\`

    ## Text to be Processed
    ${text}

    ## Restrictions
    - Must output in the specified JSON format and do not output any other irrelevant content.
    - Generate no less than ${number} high - quality questions.
    - Questions should not be related to the material itself. For example, questions related to the author, chapters, table of contents, etc. are prohibited.
    ${questionPrompt}
    `;
};
