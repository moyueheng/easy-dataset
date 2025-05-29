/**
 * 构建 GA 提示词
 * @param {Object} activeGaPair 当前激活的 GA 组合
 * @returns {String} 构建的 GA 提示词
 */
function buildGaPrompt(activeGaPair = null) {
  if (activeGaPair && activeGaPair.active) {
    return `
## 特殊要求-体裁与受众视角提问：
请根据以下体裁与受众组合，调整你的提问角度和问题风格：

**目标体裁**: ${activeGaPair.genre}
**目标受众**: ${activeGaPair.audience}

请确保：
1. 问题应完全符合「${activeGaPair.genre}」所定义的风格、焦点和深度等等属性。
2. 问题应考虑到「${activeGaPair.audience}」的知识水平、认知特点和潜在兴趣点。
3. 从该受众群体的视角和需求出发提出问题
4. 保持问题的针对性和实用性，确保问题-答案的风格一致性
5.问题应具有一定的清晰度和具体性，避免过于宽泛或模糊。
`;
  }

  return '';
}

/**
 * 问题生成提示模板。
 * @param {string} text - 待处理的文本。
 * @param {number} number - 问题数量。
 * @param {string} language - 问题所使用的语言。
 * @param {string} globalPrompt - LLM 的全局提示。
 * @param {string} questionPrompt - 问题生成的特定提示。
 * @param {Object} activeGaPair - 当前激活的 GA对。
 * @returns {string} - 完整的提示词。
 */
module.exports = function getQuestionPrompt({
  text,
  number = Math.floor(text.length / 240),
  language = '中文',
  globalPrompt = '',
  questionPrompt = '',
  activeGaPair = null
}) {
  if (globalPrompt) {
    globalPrompt = `在后续的任务中，你务必遵循这样的规则：${globalPrompt}`;
  }
  if (questionPrompt) {
    questionPrompt = `- 在生成问题时，你务必遵循这样的规则：${questionPrompt}`;
  }

  // 构建GA pairs相关的提示词
  const gaPrompt = buildGaPrompt(activeGaPair);

  return `
    # 角色使命
    你是一位专业的文本分析专家，擅长从复杂文本中提取关键信息并生成可用于模型微调的结构化数据（仅生成问题）。
    ${globalPrompt}

    ## 核心任务
    根据用户提供的文本（长度：${text.length} 字），生成不少于 ${number} 个高质量问题。

    ## 约束条件（重要！！！）
    - 必须基于文本内容直接生成
    - 问题应具有明确答案指向性
    - 需覆盖文本的不同方面
    - 禁止生成假设性、重复或相似问题

    ${gaPrompt}

    ## 处理流程
    1. 【文本解析】分段处理内容，识别关键实体和核心概念
    2. 【问题生成】基于信息密度选择最佳提问点${gaPrompt ? '，并结合指定的体裁受众视角' : ''}
    3. 【质量检查】确保：
       - 问题答案可在原文中找到依据
       - 标签与问题内容强相关
       - 无格式错误
       ${gaPrompt ? '- 问题风格与指定的体裁受众匹配' : ''}
    
    ## 输出格式
     - JSON 数组格式必须正确
    - 字段名使用英文双引号
    - 输出的 JSON 数组必须严格符合以下结构：
    \`\`\`json
    ["问题1", "问题2", "..."]
    \`\`\`

    ## 输出示例
    \`\`\`json
    [ "人工智能伦理框架应包含哪些核心要素？","民法典对个人数据保护有哪些新规定？"]
     \`\`\`

    ## 待处理文本
    ${text}

    ## 限制
    - 必须按照规定的 JSON 格式输出，不要输出任何其他不相关内容
    - 生成不少于${number}个高质量问题
    - 问题不要和材料本身相关，例如禁止出现作者、章节、目录等相关问题
    - 问题不得包含【报告、文章、文献、表格】中提到的这种话术，必须是一个自然的问题
    ${questionPrompt}
    `;
};
