/**
 * PDF处理任务处理器
 * 负责异步处理文本文件，包括PDF和Markdown等格式
 */
import { splitProjectFile } from '@/lib/file/text-splitter';
import { handleDomainTree } from '@/lib/util/domain-tree';
import { PrismaClient } from '@prisma/client';
import { updateTask } from './index';
import { processPdf } from '@/lib/services/pdf';
import { getProject,updateProject } from '@/lib/db/projects';

const prisma = new PrismaClient();

/**
 * 处理PDF处理任务
 * @param {Object} task 任务对象
 * @returns {Promise<void>}
 */
export async function processPdfProcessingTask(task) {
  try {
    console.log(`开始处理PDF解析任务: ${task.id}`);

    // 解析任务参数
    let params;
    try {
      params = JSON.parse(task.note);
    } catch (error) {
      throw new Error(`任务参数解析失败: ${error.message}`);
    }

    const { projectId, file, fileType = 'pdf', strategy = 'default', textModel } = params;

    console.log(params);

    if (!projectId || !file) {
     
      throw new Error('缺少必要参数: projectId 或 file');
    }

    // 解析模型信息
    let modelInfo;
    if(strategy === "vision"){
      try {
        modelInfo = JSON.parse(task.modelInfo);
      } catch (error) {
        throw new Error(`模型信息解析失败: ${error.message}`);
      }
    }

    // 更新任务状态
    await updateTask(task.id, {
      status: 0, // 0表示处理中
      totalCount: 1, // 通常只有一个文件
      detail: '开始处理文件',
      note: `使用策略: ${strategy}`,
      startTime: new Date()
    });

    let successCount = 0;

    try {
      // 更新任务进度
      await updateTask(task.id, {
        completedCount: 0,
        detail: `正在处理${fileType}文件...`,
        note: `使用${strategy}策略处理中`
      });

      // 调用PDF处理服务
      console.log(file);
      const result = await processPdf(strategy, projectId, file.fileName, {
        ...params.options,
        updateTask: updateTask,
        task: task
      });

      if (result.success) {
        successCount++;
        console.log(`${strategy}策略处理成功: ${file.fileName}`);
        // 更新任务进度
        await updateTask(task.id, {
          status: 1,
          detail: '文件处理完成',
          note: `${strategy}策略处理成功`+ JSON.stringify({
            ...result.data,
            strategy,
            status: 'completed'
          }),
        });
      } else {
        throw new Error(result.error || `${strategy}策略处理失败`);
      }

      //进行文本分割
      let pdfResult = {
        totalChunks: 0,
        chunks: [],
        toc: ''
      };

      const project = await getProject(projectId);

      const { toc, chunks, totalChunks } = await splitProjectFile(projectId, file);
      pdfResult.toc += toc;
      pdfResult.chunks.push(...chunks);
      pdfResult.totalChunks += totalChunks;
      console.log(projectId, file.fileName, `Text split completed, ${file.action} domain tree`);

      console.log(textModel);
      // 调用领域树处理模块
      const tags = await handleDomainTree({
        projectId,
        newToc: pdfResult.toc,
        model: textModel ? JSON.parse(textModel) : modelInfo,
        language: task.language,
        action: file.action,
        file,
        project
      });

      if (!tags && file.action !== 'keep') {
        await updateProject(projectId, { ...project });
        return NextResponse.json(
          { error: 'AI analysis failed, please check model configuration, delete file and retry!' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error(`处理文件 ${file.fileName} 出错:`, error);

      // 更新任务状态为失败
      await updateTask(task.id, {
        status: 2, // 2表示失败
        completedCount: 0,
        detail: `处理失败: ${error.message}`,
        note: `${strategy}策略处理失败`,
        endTime: new Date()
      });

      return;
    }
    console.log(`任务 ${task.id} 已完成`);
  } catch (error) {
    console.error('处理文本处理任务出错:', error);
    await updateTask(task.id, {
      status: 2, // 2表示失败
      detail: `处理失败: ${error.message}`,
      note: `处理失败: ${error.message}`,
      endTime: new Date()
    });
  }
}

export default {
  processPdfProcessingTask
};
