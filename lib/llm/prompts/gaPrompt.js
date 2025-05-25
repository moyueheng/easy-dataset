/**
 * GA (Genre-Audience) 对生成提示词模板
 * 基于 MGA (Massive Genre-Audience) 数据增强方法
 * @param {string} text - 文件内容
 * @param {string} language - 生成语言 (中文/English)
 */
module.exports = function getGaPrompt({ text, language = '中文' }) {
  const isEnglish = language.toLowerCase() === 'english' || language.toLowerCase() === 'en';
  
  if (isEnglish) {
    return `#Identity and Capabilities#
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
according to these specifications (Please remember that you must strictly follow the format requirements provided in the #Response# section):

Your provided [genres] should meet the following requirements:
1. Clear Genre Definition: Demonstrate strong diversity; include genres you've encountered, read, or can envision
2. Detailed Genre Description: Provide 2-3 sentences describing each genre, considering but not limited to type,
style, emotional tone, form, conflict, rhythm, and atmosphere. Emphasize diversity to guide knowledge adaptation
for specific audiences, facilitating comprehension across different backgrounds. Note: Exclude visual formats (
picture books, comics, videos); use text-only genres.

Your provided [audiences] should meet the following requirements:
1. Clear Audience Definition: Demonstrate strong diversity; include both interested and uninterested parties, those
who like and dislike the content, overcoming bias toward positive audiences only
2. Detailed Audience Description: Provide 2 sentences describing each audience, including but not limited to age,
occupation, gender, personality, appearance, educational background, life stage, motivations and goals, interests,
and cognitive level

#Response (Your response must strictly follow the format requirements provided in this section and with no other information)#
{
    "audience_1":{
        "title": "Audience 1 Name",
        "description": "Detailed audience description..."
    },
    "genre_1":{
        "title": "Genre 1 Name",
        "description": "Detailed genre description..."
    },
    "audience_2":{
        "title": "Audience 2 Name",
        "description": "Detailed audience description..."
    },
    "genre_2":{
        "title": "Genre 2 Name",
        "description": "Detailed genre description..."
    },
    "audience_3":{
        "title": "Audience 3 Name",
        "description": "Detailed audience description..."
    },
    "genre_3":{
        "title": "Genre 3 Name",
        "description": "Detailed genre description..."
    },
    "audience_4":{
        "title": "Audience 4 Name",
        "description": "Detailed audience description..."
    },
    "genre_4":{
        "title": "Genre 4 Name",
        "description": "Detailed genre description..."
    },
    "audience_5":{
        "title": "Audience 5 Name",
        "description": "Detailed audience description..."
    },
    "genre_5":{
        "title": "Genre 5 Name",
        "description": "Detailed genre description..."
    }
}

#Input#
${text}`;
  } else {
    return `#身份和能力#
您是一位内容创作专家，专精于文本分析和改写，擅长根据不同的[体裁]和[受众]来调整内容，产出多样化和高质量的文本。您的改写方法总是能够将原始文本转化为引人注目的内容，获得读者和行业专家的好评！

#工作流程#
请运用您的想象力和创造力，为原始文本生成5对适合的[体裁]和[受众]组合。您的分析应遵循以下要求：
1. 首先分析源文本的特点，包括写作风格、信息内容和价值
2. 然后考虑如何在保持主要内容和信息的同时，探索更广泛受众参与和替代体裁的可能性

#详细要求#
确保遵循上述工作流程要求，然后根据以下规范生成5对[体裁]和[受众]组合（请记住您必须严格遵循#回复#部分中提供的格式要求）：

您提供的[体裁]应满足以下要求：
1. 明确的体裁定义：表现出强烈的多样性；包括您遇到过的、阅读过的或能够想象的体裁
2. 详细的体裁描述：提供2-3句描述每种体裁的话，考虑但不限于类型、风格、情感基调、形式、冲突、节奏和氛围。强调多样性以指导针对特定受众的知识适应，促进不同背景的理解。注意：排除视觉格式（图画书、漫画、视频）；使用纯文本体裁。

您提供的[受众]应满足以下要求：
1. 明确的受众定义：表现出强烈的多样性；包括感兴趣和不感兴趣的各方，喜欢和不喜欢内容的人，克服仅偏向积极受众的偏见
2. 详细的受众描述：提供2句描述每个受众的话，包括但不限于年龄、职业、性别、个性、外貌、教育背景、生活阶段、动机和目标、兴趣和认知水平

#回复（您的回复必须严格遵循本部分提供的格式要求，不得包含其他信息）#
{
    "audience_1":{
        "title": "受众1名称",
        "description": "详细的受众描述..."
    },
    "genre_1":{
        "title": "体裁1名称",
        "description": "详细的体裁描述..."
    },
    "audience_2":{
        "title": "受众2名称",
        "description": "详细的受众描述..."
    },
    "genre_2":{
        "title": "体裁2名称",
        "description": "详细的体裁描述..."
    },
    "audience_3":{
        "title": "受众3名称",
        "description": "详细的受众描述..."
    },
    "genre_3":{
        "title": "体裁3名称",
        "description": "详细的体裁描述..."
    },
    "audience_4":{
        "title": "受众4名称",
        "description": "详细的受众描述..."
    },
    "genre_4":{
        "title": "体裁4名称",
        "description": "详细的体裁描述..."
    },
    "audience_5":{
        "title": "受众5名称",
        "description": "详细的受众描述..."
    },
    "genre_5":{
        "title": "体裁5名称",
        "description": "详细的体裁描述..."
    }
}

#输入#
${text}`;
  }
};
