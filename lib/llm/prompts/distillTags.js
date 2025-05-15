/**
 * 根据标签构造子标签的提示词
 * @param {string} parentTag - 主题标签名称，例如"体育"
 * @param {Array<string>} existingTags - 该标签下已经创建的子标签（避免重复），例如 ["足球", "乒乓球"]
 * @param {number} count - 希望生成子标签的数量，例如：10
 * @returns {string} 提示词
 */
export function distillTagsPrompt(parentTag, existingTags = [], count = 10) {
  const existingTagsText =
    existingTags.length > 0 ? `已有的子标签包括：${existingTags.join('、')}，请不要生成与这些重复的标签。` : '';

  return `
你是一个专业的知识标签生成助手。我需要你帮我为主题"${parentTag}"生成${count}个子标签。

请遵循以下规则：
1. 生成的标签应该是"${parentTag}"领域内的专业子类别或子主题
2. 每个标签应该简洁、明确，通常为2-5个字
3. 标签之间应该有明显的区分，覆盖不同的方面
4. 标签应该是名词或名词短语，不要使用动词或形容词
5. 标签应该具有实用性，能够作为问题生成的基础
${existingTagsText}

请直接以JSON数组格式返回标签，不要有任何额外的解释或说明，格式如下：
["标签1", "标签2", "标签3", ...]
`;
}
