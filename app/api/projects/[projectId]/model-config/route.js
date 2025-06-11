import { NextResponse } from 'next/server';
import { createInitModelConfig, getModelConfigByProjectId, saveModelConfig } from '@/lib/db/model-config';
import { DEFAULT_MODEL_SETTINGS, MODEL_PROVIDERS } from '@/constant/model';
import { getProject } from '@/lib/db/projects';

// 获取模型配置列表
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    // 验证项目 ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }
    let modelConfigList = await getModelConfigByProjectId(projectId);
    if (!modelConfigList || modelConfigList.length === 0) {
      let insertModelConfigList = [];
      MODEL_PROVIDERS.forEach(item => {
        let data = {
          projectId: projectId,
          providerId: item.id,
          providerName: item.name,
          endpoint: item.defaultEndpoint,
          apiKey: '',
          modelId: item.defaultModels.length > 0 ? item.defaultModels[0] : '',
          modelName: item.defaultModels.length > 0 ? item.defaultModels[0] : '',
          type: 'text',
          temperature: DEFAULT_MODEL_SETTINGS.temperature,
          maxTokens: DEFAULT_MODEL_SETTINGS.maxTokens,
          topK: 0,
          topP: 0,
          status: 1
        };
        insertModelConfigList.push(data);
      });
      modelConfigList = await createInitModelConfig(insertModelConfigList);
    }
    let project = await getProject(projectId);
    return NextResponse.json({ data: modelConfigList, defaultModelConfigId: project.defaultModelConfigId });
  } catch (error) {
    console.error('Error obtaining model configuration:', String(error));
    return NextResponse.json({ error: 'Failed to obtain model configuration' }, { status: 500 });
  }
}

// 保存模型配置
export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    // 验证项目 ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }
    // 获取请求体
    const modelConfig = await request.json();

    // 验证请求体
    if (!modelConfig) {
      return NextResponse.json({ error: 'The model configuration cannot be empty ' }, { status: 400 });
    }
    modelConfig.projectId = projectId;
    if (!modelConfig.modelId) {
      modelConfig.modelId = modelConfig.modelName;
    }
    const res = await saveModelConfig(modelConfig);

    return NextResponse.json(res);
  } catch (error) {
    console.error('Error updating model configuration:', String(error));
    return NextResponse.json({ error: 'Failed to update model configuration' }, { status: 500 });
  }
}
