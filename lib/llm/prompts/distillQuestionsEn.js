function removeLeadingNumber(label) {
  // 正则说明：
  // ^\d+       匹配开头的一个或多个数字
  // (?:\.\d+)* 匹配零个或多个「点+数字」的组合（非捕获组）
  // \s+        匹配序号后的一个或多个空格（确保序号与内容有空格分隔）
  const numberPrefixRegex = /^\d+(?:\.\d+)*\s+/;
  // 仅当匹配到数字开头的序号时才替换，否则返回原标签
  return label.replace(numberPrefixRegex, '');
}

/**
 * 根据标签构造问题的提示词
 * @param {string} tagPath - 标签链路，例如 "体育->足球->足球先生"
 * @param {string} currentTag - 当前子标签，例如 "足球先生"
 * @param {number} count - 希望生成问题的数量，例如：10
 * @param {Array<string>} existingQuestions - 当前标签已经生成的问题（避免重复）
 * @param {string} globalPrompt - 项目全局提示词
 * @returns {string} 提示词
 */
export function distillQuestionsEnPrompt(tagPath, currentTag, count = 10, existingQuestions = [], globalPrompt = '') {
  currentTag = removeLeadingNumber(currentTag);
  const existingQuestionsText =
    existingQuestions.length > 0
      ? `Existing questions include:\n${existingQuestions.map(q => `- ${q}`).join('\n')}\nPlease do not generate questions that are repetitive or highly similar to these.`
      : '';

  // 构建全局提示词部分
  const globalPromptText = globalPrompt ? `You must adhere to this requirement: ${globalPrompt}` : '';

  return `
You are a professional knowledge question generation assistant, proficient in the field of ${currentTag}. I need you to help me generate ${count} high-quality, diverse questions for the tag "${currentTag}".

The complete tag path is: ${tagPath}

Please follow these rules:
${globalPromptText}
1. The generated questions must be closely related to the topic of "${currentTag}", ensuring comprehensive coverage of the core knowledge points and key concepts of this topic.
2. Questions should be evenly distributed across the following difficulty levels (each level should account for at least 20%):
   - Basic: Suitable for beginners, focusing on basic concepts, definitions, and simple applications.
   - Intermediate: Requires some domain knowledge, involving principle explanations, case analyses, and application scenarios.
   - Advanced: Requires in-depth thinking, including cutting-edge developments, cross-domain connections, complex problem solutions, etc.

3. Question types should be diverse, including but not limited to (the following are just references and can be adjusted flexibly according to the actual situation; there is no need to limit to the following topics):
   - Conceptual explanation: "What is...", "How to define..."
   - Principle analysis: "Why...", "How to explain..."
   - Comparison and contrast: "What is the difference between... and...", "What are the advantages of... compared to..."
   - Application practice: "How to apply... to solve...", "What is the best practice for..."
   - Development trends: "What is the future development direction of...", "What challenges does... face?"
   - Case analysis: "Please analyze... in the case of..."
   - Thought-provoking: "What would happen if...", "How to evaluate..."

4. Question phrasing should be clear, accurate, and professional. Avoid the following:
   - Avoid vague or overly broad phrasing.
   - Avoid closed-ended questions that can be answered with "yes/no".
   - Avoid questions containing misleading assumptions.
   - Avoid repetitive or highly similar questions.

5. The depth and breadth of questions should be appropriate:
   - Cover the history, current situation, theoretical basis, and practical applications of the topic.
   - Include mainstream views and controversial topics in the field.
   - Consider the cross-associations between this topic and related fields.
   - Focus on emerging technologies, methods, or trends in this field.

${existingQuestionsText}

Please directly return the questions in the format of a JSON array, without any additional explanations or notes, in the following format:
["Question 1", "Question 2", "Question 3", ...]

Note: Each question should be complete and self-contained, understandable and answerable without relying on other contexts.
`;
}
