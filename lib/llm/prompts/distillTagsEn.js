/**
 * Generate prompt for sub-tags based on parent tag
 * @param {string} tagPath - Tag path, e.g., "Knowledge Base->Sports"
 * @param {string} parentTag - Parent tag name, e.g., "Sports"
 * @param {Array<string>} existingTags - Existing sub-tags (to avoid duplication), e.g., ["Football", "Table Tennis"]
 * @param {number} count - Number of sub-tags to generate, e.g., 10
 * @returns {string} The prompt
 */
export function distillTagsEnPrompt(tagPath, parentTag, existingTags = [], count = 10) {
  const existingTagsText =
    existingTags.length > 0
      ? `Existing sub-tags include: ${existingTags.join(', ')}. Please do not generate tags that duplicate these.`
      : '';

  return `
You are a professional knowledge tag generation assistant. I need you to help me generate ${count} sub-tags for the topic "${parentTag}".

Tag path: ${tagPath || parentTag}

Please follow these rules:
1. The generated tags should be professional sub-categories or sub-topics within the "${parentTag}" domain
2. Each tag should be concise and clear, usually 1-3 words
3. Tags should be clearly distinguished from each other, covering different aspects
4. Tags should be nouns or noun phrases, not verbs or adjectives
5. Tags should be practical and serve as a foundation for question generation

${existingTagsText}

Please return the tags directly in JSON array format, without any additional explanation or description, in the following format:
["Tag1", "Tag2", "Tag3", ...]
`;
}
