import { NextResponse } from 'next/server';
import axios from 'axios';

// 从模型提供商获取模型列表
export async function POST(request) {
  try {
    const { endpoint, providerId, apiKey } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: '缺少 endpoint 参数' }, { status: 400 });
    }

    let url = endpoint.replace(/\/$/, ''); // 去除末尾的斜杠
    url += providerId === 'ollama' ? '/tags' : '/models';

    const headers = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await axios.get(url, { headers });

    // 根据不同提供商格式化返回数据
    let formattedModels = [];
    if (providerId === 'ollama') {
      formattedModels = response.data.models.map(item => ({
        modelId: item.model,
        modelName: item.name,
        providerId
      }));
    } else {
      // 默认处理方式（适用于 OpenAI 等）
      formattedModels = response.data.data.map(item => ({
        modelId: item.id,
        modelName: item.id,
        providerId
      }));
    }

    return NextResponse.json(formattedModels);
  } catch (error) {
    console.error('获取模型列表失败:', String(error));

    // 处理特定错误
    if (error.response) {
      if (error.response.status === 401) {
        return NextResponse.json({ error: 'API Key 无效' }, { status: 401 });
      }
      return NextResponse.json(
        { error: `获取模型列表失败: ${error.response.statusText}` },
        { status: error.response.status }
      );
    }

    return NextResponse.json({ error: `获取模型列表失败: ${error.message}` }, { status: 500 });
  }
}
