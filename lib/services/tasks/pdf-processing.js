/**
 * PDF处理任务处理器
 * 负责异步处理文本文件，包括PDF和Markdown等格式
 */
import { splitProjectFile } from '@/lib/file/text-splitter';
import { handleDomainTree } from '@/lib/util/domain-tree';
import { getProjectRoot } from '@/lib/db/base';
import { PrismaClient } from '@prisma/client';
import { updateTask } from './index';
import { processPdf } from '@/lib/services/pdf';
import { getProject, updateProject } from '@/lib/db/projects';
import { getPageNum } from 'pdf2md-js';
import path from 'path';

const prisma = new PrismaClient();

/**
 * 处理PDF处理任务
 * @param {Object} task 任务对象
 * @returns {Promise<void>}
 */
export async function processPdfProcessingTask(task) {
  //定义此次任务消息用于保存一些处理信息
  const taskMessage = {
    courent: {
      // 当前处理的文件信息
      fileName: '',
      processedPage: 0,
      totalPage: 0
    },
    stepInfo: '', // 当前处理步骤信息
    processedFiles: 0, // 已处理文件数
    totalFiles: 0, // 总文件数
    errorList: [], // 错误列表
    finisedList: [] // 已完成文件列表
  };
  try {
    console.log(`start processing PDF parsing task: ${task.id}`);
    // 解析任务参数
    let params;
    try {
      params = JSON.parse(task.note);
    } catch (error) {
      throw new Error(`task information parsing failed: ${error.message}`);
    }

    const { projectId, fileList, strategy = 'default', textModel } = params;

    if (!projectId || !fileList) {
      throw new Error('missing required parameters: projectId or files');
    }

    // 计算PDF转换总页数
    const projectRoot = await getProjectRoot();
    let totalPages = 0;
    for (const file of fileList) {
      const filePath = path.join(projectRoot, projectId, 'files', file.fileName);
      try {
        const pageCount = await getPageNum(filePath);
        totalPages += pageCount;
        file.pageCount = pageCount; // 保存每个文件的页数
      } catch (error) {
        console.error(`Failed to get page count for ${file.fileName}:`, error);
      }
    }
    console.log(`Total PDF pages to process: ${totalPages}`);

    //获取领域树构建策略 这一批次的文件都是一个处理策略 ，所以取第一个文件的策略即可
    const domainAction = fileList[0].action || 'keep';

    // 解析模型信息
    let modelInfo;
    if (strategy === 'vision') {
      try {
        modelInfo = JSON.parse(task.modelInfo);
      } catch (error) {
        throw new Error(`model information parsing failed: ${error.message}`);
      }
    }

    //更新文件总数
    taskMessage.totalFiles = fileList.length;
    taskMessage.stepInfo = `Total ${taskMessage.totalFiles} files to process, total ${totalPages} pages`;

    // 更新任务状态
    await updateTask(task.id, {
      status: 0, // 0表示处理中
      totalCount: totalPages, // 总页数
      detail: JSON.stringify(taskMessage), // 初始任务信息
      startTime: new Date()
    });

    //进行文本分割
    let pdfResult = {
      totalChunks: 0,
      chunks: [],
      toc: ''
    };

    const project = await getProject(projectId);

    // 循环处理文件
    for (const file of fileList) {
      try {
        taskMessage.courent.fileName = file.fileName;
        taskMessage.courent.processedPage = 0; // 重置当前处理页数
        taskMessage.courent.totalPage = file.pageCount || 0; // 设置当前文件总页数

        // 调用PDF处理服务
        const result = await processPdf(strategy, projectId, file.fileName, {
          ...params.options,
          updateTask: updateTask,
          task: task,
          message: taskMessage
        });

        //确认文件处理状态
        if (!result.success) {
          throw new Error(result.error || `${strategy} strategy processing failed`);
        }

        // 文本分割
        const { toc, chunks, totalChunks } = await splitProjectFile(projectId, file);
        pdfResult.toc += toc;
        pdfResult.chunks.push(...chunks);
        pdfResult.totalChunks += totalChunks;
        console.log(projectId, file.fileName, `Text split completed, ${file.action} domain tree`);

        // 更新任务信息
        taskMessage.finisedList.push(file);
        await updateTask(task.id, {
          completedCount: task.completedCount + file.pageCount, // 已处理页数
          detail: JSON.stringify(taskMessage), // 更新任务信息
          updateAt: new Date()
        });
        task.completedCount += file.pageCount; // 更新任务已完成页数
      } catch (error) {
        const errorMessage = `Processing file ${file.fileName} failed: ${error.message}`;
        taskMessage.errorList.push(errorMessage);
        console.error(errorMessage);
        //将文件粒度的任务信息存储到任务详情中
        await updateTask(task.id, {
          detail: JSON.stringify(taskMessage)
        });
      }
    }

    try {
      // 调用领域树处理模块
      const tags = await handleDomainTree({
        projectId,
        newToc: pdfResult.toc,
        model: textModel ? JSON.parse(textModel) : modelInfo,
        language: task.language,
        action: domainAction,
        fileList,
        project
      });

      if (!tags && domainAction !== 'keep') {
        await updateProject(projectId, { ...project });
        return NextResponse.json(
          { error: 'AI analysis failed, please check model configuration, delete file and retry!' },
          { status: 400 }
        );
      }

      //整个转换任务=》文本分割=》领域树构造结束后 转换完成
      console.log(`${strategy} strategy processed successfully`);
      // 更新任务进度
      taskMessage.stepInfo = `${strategy} strategy processed successfully `;
      await updateTask(task.id, {
        status: 1,
        detail: JSON.stringify(taskMessage)
      });
    } catch (error) {
      console.error(`processing failed:`, error);
      taskMessage.stepInfo = `${strategy} strategy processing failed: ${error.message}`;
      // 更新任务状态为失败
      await updateTask(task.id, {
        status: 2, // 2表示失败
        completedCount: 0,
        detail: JSON.stringify(taskMessage),
        endTime: new Date()
      });

      return;
    }
    console.log(`task ${task.id} finished`);
  } catch (error) {
    console.error('pdf processing failed:', error);
    taskMessage.stepInfo = `${strategy} strategy processing failed: ${error.message}`;
    await updateTask(task.id, {
      status: 2, // 2表示失败
      detail: JSON.stringify(taskMessage),
      endTime: new Date()
    });
  }
}

export default {
  processPdfProcessingTask
};
