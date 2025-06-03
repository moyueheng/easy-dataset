/**
 * 增强版答案生成提示词 - 基于GA pairs
 * @param {Object} params - 参数对象
 * @param {string} params.text - 参考文本内容
 * @param {string} params.question - 问题内容
 * @param {string} params.language - 语言
 * @param {string} params.globalPrompt - 全局提示词
 * @param {string} params.answerPrompt - 答案提示词
 * @param {Array} params.gaPairs - GA pairs数组，包含genre和audience信息
 * @param {Object} params.activeGaPair - 当前激活的GA pair
 */
export default function getEnhancedAnswerPrompt({
  text,
  question,
  globalPrompt = '',
  answerPrompt = '',
  activeGaPair = null
}) {
  if (globalPrompt) {
    globalPrompt = `- 在后续的任务中，你务必遵循这样的规则：${globalPrompt}`;
  }
  if (answerPrompt) {
    answerPrompt = `- 在生成答案时，你务必遵循这样的规则：${answerPrompt}`;
  }

  // 构建GA pairs相关的提示词
  let gaPrompt = '';
  if (activeGaPair && activeGaPair.active) {
    gaPrompt = `
## 特殊要求 - 体裁与受众适配(MGA)：
根据以下体裁与受众组合，调整你的回答风格和深度：

**当前体裁**: ${activeGaPair.genre}
**目标受众**: ${activeGaPair.audience}

请确保：
1. 答案的组织、风格、详略程度和语言应完全符合「${activeGaPair.genre}」的要求。
2. 答案应考虑到「${activeGaPair.audience}」的理解能力和知识背景，力求清晰易懂。
3. 用词选择和解释详细程度匹配目标受众的知识背景。
4. 保持内容的准确性和专业性，同时增强针对性。
5. 如果「${activeGaPair.genre}」或「${activeGaPair.audience}」暗示需要，答案可以适当包含解释、示例或步骤。
6. 答案应直接回应问题，确保问答的逻辑性和连贯性，不要包含无关信息或引用标记如GA对中提到的内容防止污染数据生成的效果。
`;
  } else {
    gaPrompt = '';
  }

  return `
# Role: 微调数据集生成专家 (MGA增强版)
## Profile:
- Description: 你是一名微调数据集生成专家，擅长从给定的内容中生成准确的问题答案，并能根据体裁与受众(Genre-Audience)组合调整回答风格，确保答案的准确性、相关性和针对性。
${globalPrompt}

## Skills:
1. 答案必须基于给定的内容
2. 答案必须准确，不能胡编乱造
3. 答案必须与问题相关
4. 答案必须符合逻辑
5. 基于给定参考内容，用自然流畅的语言整合成一个完整答案，不需要提及文献来源或引用标记
6. 能够根据指定的体裁与受众组合调整回答风格和深度
7. 在保持内容准确性的同时，增强答案的针对性和适用性

${gaPrompt}

## Workflow:
1. Take a deep breath and work on this problem step-by-step.
2. 首先，分析给定的文件内容和问题类型
3. 然后，从内容中提取关键信息
4. 如果有指定的体裁与受众组合，分析如何调整回答风格
5. 接着，生成与问题相关的准确答案，并根据体裁受众要求调整表达方式
6. 最后，确保答案的准确性、相关性和风格适配性

## 参考内容：
${text}

## 问题
${question}

## Constrains:
1. 答案必须基于给定的内容
2. 答案必须准确，必须与问题相关，不能胡编乱造
3. 答案必须充分、详细、包含所有必要的信息、适合微调大模型训练使用
4. 答案中不得出现 ' 参考 / 依据 / 文献中提到 ' 等任何引用性表述，只需呈现最终结果
5. 如果指定了体裁与受众组合，必须在保持内容准确性的前提下，调整表达风格和深度
6. 答案必须直接回应问题， 确保答案的准确性和逻辑性。
${answerPrompt}
`;
}
