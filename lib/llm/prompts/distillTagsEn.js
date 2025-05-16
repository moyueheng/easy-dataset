/**
 * Constructs a prompt for generating sub-tags based on a parent tag
 * @param {string} tagPath - The tag hierarchy path, e.g., "Knowledge Base->Sports"
 * @param {string} parentTag - The name of the parent tag, e.g., "Sports"
 * @param {Array<string>} existingTags - Existing sub-tags under this parent (to avoid duplicates), e.g., ["Football", "Table Tennis"]
 * @param {number} count - The number of sub-tags to generate, e.g., 10
 * @returns {string} The generated prompt
 */
export function distillTagsPrompt(tagPath, parentTag, existingTags = [], count = 10) {
  const existingTagsText =
    existingTags.length > 0
      ? `Existing sub-tags include: ${existingTags.join(', ')}. Please do not generate duplicate tags.`
      : '';

  return `
You are a professional knowledge tag generation assistant. I need you to generate ${count} sub-tags for the topic "${parentTag}".

Tag hierarchy path: ${tagPath || parentTag}

Please follow these rules:
1. The generated tags should be professional sub-categories or sub-topics within the "${parentTag}" domain.
2. Each tag should be concise and clear, typically 2-6 characters in length.
3. Tags should be distinct from each other, covering different aspects.
4. Tags should be nouns or noun phrases. Avoid using verbs or adjectives.
5. Tags should be practical and serve as a basis for question generation.
6. Tags should have explicit numbering. If the parent tag is numbered (e.g., 1 Automobiles), sub-tags should be 1.1 Car Brands, 1.2 Car Models, 1.3 Car Prices, etc.
7. If the parent tag has no number (e.g., Automobiles), it indicates top-level tag generation, and sub-tags should be 1 Car Brands 2 Car Models 3 Car Prices, etc.

${existingTagsText}

Please return the tags directly in JSON array format without any additional explanations, like this:
["Number Tag1", "Number Tag2", "Number Tag3", ...]
`;
}
