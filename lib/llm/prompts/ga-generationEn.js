/**
 * Genre-Audience pair generation prompt
 * Based on MGA (Massive Genre-Audience) method for data augmentation
 */

export const GA_GENERATION_PROMPT_EN = `#Identity and Capabilities#
You are a content creation expert, specializing in text analysis and rewriting, skilled at adapting content based on
varying [genres] and [audiences] to produce diverse and high-quality texts. Your rewriting approaches
consistently transform original texts into remarkable content, earning acclaim from both readers and industry
professionals!

#Workflow#
Please utilize your imagination and creativity to generate 5 pairs of [genre] and [audience] combinations suitable for
the original text. Your analysis should follow these requirements:
1. First, analyze the characteristics of the source text, including writing style, information content, and value
2. Then, consider how to preserve the primary content and information while exploring possibilities for broader
audience engagement and alternative genres

#Detailed Requirements#
Ensure adherence to the workflow requirements above, then generate 5 pairs of [genre] and [audience] combinations
according to these specifications:

1. Each pair must include:
   - Genre: title and detailed description (purpose, structure, style, depth)
   - Audience: title and detailed description (demographics, background, motivation)

2. The 5 pairs should cover different scenarios:
   - Academic/Research oriented
   - Educational/Learning focused  
   - Professional/Practical application
   - Popular/General audience
   - Technical/Specialist audience

3. **IMPORTANT: You must respond with ONLY a valid JSON array in this exact format:**

[
  {
    "genre": {
      "title": "Genre Title",
      "description": "Detailed genre description"
    },
    "audience": {
      "title": "Audience Title", 
      "description": "Detailed audience description"
    }
  },
  {
    "genre": {
      "title": "Genre Title",
      "description": "Detailed genre description"
    },
    "audience": {
      "title": "Audience Title",
      "description": "Detailed audience description"
    }
  }
  // ... 3 more pairs (total 5)
]

**Do not include any explanatory text, markdown formatting, or additional content. Return only the JSON array.**

#Source Text to Analyze#
{text_content}`;

export const ENHANCED_ANSWER_PROMPT_EN = `You are an expert in creating high-quality question-answer pairs for fine-tuning large language models. You need to generate comprehensive answers based on the given text content and Genre-Audience (GA) pair.

# Task Description
Generate a detailed answer to the question based on:
1. The reference text content
2. The specific Genre-Audience pair to adapt the style and depth
3. Maintain factual accuracy while adapting presentation style

# Genre-Audience Context
- **Genre**: {genre}
- **Audience**: {audience}

# Requirements
1. **Content Accuracy**: Base your answer strictly on the provided reference content
2. **Style Adaptation**: Adapt the writing style, tone, and complexity according to the specified genre and audience
3. **Comprehensive Coverage**: Provide thorough explanations appropriate for the target audience
4. **No Hallucination**: Do not add information not present in the reference content

# Reference Content
{referenceText}

# Question
{question}

# Response Format
Provide only the answer content, adapted for the specified genre and audience, without any additional formatting or metadata.`;

export const ENHANCED_QUESTION_PROMPT = `You are an expert in creating high-quality question-answer pairs for fine-tuning large language models. You need to generate diverse and challenging questions based on the given text content and Genre-Audience (GA) pair.

# Task Description
Generate questions that would be relevant and appropriate for the specified Genre-Audience pair while being answerable from the provided text content.

# Genre-Audience Context
- **Genre**: {genre}
- **Audience**: {audience}

# Requirements
1. **Relevance**: Questions should be relevant to both the content and the target audience
2. **Answerability**: All questions must be answerable from the provided text
3. **Diversity**: Generate different types of questions (factual, analytical, explanatory, etc.)
4. **Appropriateness**: Match the complexity and style to the target audience
5. **Genre Alignment**: Consider the genre's typical question patterns and formats

# Text Content
{text}

# Response Format
Generate exactly 5 questions in the following JSON format:
{
    "questions": [
        "Question 1 content here",
        "Question 2 content here", 
        "Question 3 content here",
        "Question 4 content here",
        "Question 5 content here"
    ]
}

Provide only the JSON response with no additional text.`;
