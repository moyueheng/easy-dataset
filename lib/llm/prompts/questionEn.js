/**
 * Question generation prompt template
 * @param {*} text The text to be processed
 * @param {*} number The number of questions
 */
module.exports = function getQuestionPrompt({
  text,
  number = Math.floor(text.length / 240),
  language = 'English',
  globalPrompt = '',
  questionPrompt = '',
  gaPairs = [],
  activeGaPair = null
}) {
  if (globalPrompt) {
    globalPrompt = `In subsequent tasks, you must strictly follow these rules: ${globalPrompt}`;
  }
  if (questionPrompt) {
    questionPrompt = `- In generating questions, you must strictly follow these rules: ${questionPrompt}`;
  }

  // Build GA pairs related prompts
  let gaPrompt = '';
  if (activeGaPair && activeGaPair.active) {
    gaPrompt = `
## Special Requirements - Genre & Audience Perspective Questioning (MGA):
Adjust your questioning approach and question style based on the following genre and audience combination:

**Target Genre**: ${activeGaPair.genre}
**Target Audience**: ${activeGaPair.audience}

Please ensure:
1. Question style matches the characteristics and expression habits of "${activeGaPair.genre}"
2. Question depth and expression are suitable for the knowledge background of "${activeGaPair.audience}"
3. Ask questions from the perspective and needs of that audience group
4. Maintain the relevance and practicality of questions, ensuring question-answer style consistency
`;
  } else if (gaPairs && gaPairs.length > 0) {
    const availableGaPairs = gaPairs.filter(ga => ga.active).slice(0, 3);
    if (availableGaPairs.length > 0) {
      gaPrompt = `
## Optional Genre & Audience Perspective Guidance:
The following genre and audience combinations generated for this content can serve as reference for questioning style:

${availableGaPairs.map((ga, index) => 
  `${index + 1}. **${ga.genre}** + **${ga.audience}**`
).join('\n')}

It is recommended to choose the most suitable perspective for questioning based on the text content characteristics.
`;
    }
  }

  return `
    # Role Mission
    You are a professional text analysis expert, skilled at extracting key information from complex texts and generating structured data(only generate questions) that can be used for model fine - tuning.
    ${globalPrompt}

    ## Core Task
    Based on the text provided by the user(length: ${text.length} characters), generate no less than ${number} high - quality questions.

    ## Constraints(Important!)
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
