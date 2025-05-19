/**
 * 答案生成任务处理器
 * 负责异步处理答案生成任务，获取所有未生成答案的问题并批量处理
 */

import { PrismaClient } from '@prisma/client';
import { processInParallel } from '@/lib/util/async';
import { updateTask } from './index';
import datasetService from '@/lib/services/datasets';
import { getTaskConfig } from '@/lib/db/projects';

const prisma = new PrismaClient();

/**
 * 处理答案生成任务
 * 查询未生成答案的问题并批量处理
 * @param {Object} task 任务对象
 * @returns {Promise<void>}
 */
export async function processAnswerGenerationTask(task) {
  try {
    console.log(`开始处理答案生成任务: ${task.id}`);

    // 解析模型信息
    let modelInfo;
    try {
      modelInfo = JSON.parse(task.modelInfo);
    } catch (error) {
      throw new Error(`模型信息解析失败: ${error.message}`);
    }

    // 从任务对象直接获取项目 ID
    const projectId = task.projectId;

    // 1. 查询未生成答案的问题
    console.log(`开始处理项目 ${projectId} 的答案生成任务`);
    const questionsWithoutAnswers = await prisma.questions.findMany({
      where: {
        projectId,
        answered: false // 未生成答案的问题
      }
    });

    // 如果没有需要处理的问题，直接完成任务
    if (questionsWithoutAnswers.length === 0) {
      await updateTask(task.id, {
        status: 1, // 1 表示完成
        detail: '没有需要处理的问题',
        note: '',
        endTime: new Date()
      });
      return;
    }

    // 获取任务配置，包括并发限制
    const taskConfig = await getTaskConfig(projectId);
    const concurrencyLimit = taskConfig.concurrencyLimit || 3;

    // 更新任务总数
    const totalCount = questionsWithoutAnswers.length;
    await updateTask(task.id, {
      totalCount,
      detail: `待处理问题数量: ${totalCount}`,
      note: ''
    });

    // 2. 批量处理每个问题
    let successCount = 0;
    let errorCount = 0;
    let totalDatasets = 0;
    let latestTaskStatus = 0;

    // 单个问题处理函数
    const processQuestion = async question => {
      try {
        // 如果任务已经被标记为失败或已中断，不再继续处理
        const latestTask = await prisma.task.findUnique({ where: { id: task.id } });
        if (latestTask.status === 2 || latestTask.status === 3) {
          latestTaskStatus = latestTask.status;
          return;
        }

        // 调用数据集生成服务生成答案
        const result = await datasetService.generateDatasetForQuestion(task.projectId, question.id, {
          model: modelInfo,
          language: task.language === 'zh-CN' ? '中文' : 'en'
        });
        console.log(`问题 ${question.id} 已生成答案，数据集 ID: ${result.dataset.id}`);

        // 增加成功计数
        successCount++;
        totalDatasets++;

        // 更新任务进度
        const progressNote = `已处理: ${successCount + errorCount}/${totalCount}, 成功: ${successCount}, 失败: ${errorCount}, 共生成数据集: ${totalDatasets}`;
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: progressNote,
          note: progressNote
        });

        return { success: true, questionId: question.id, datasetId: result.dataset.id };
      } catch (error) {
        console.error(`处理问题 ${question.id} 出错:`, error);
        errorCount++;

        // 更新任务进度
        const progressNote = `已处理: ${successCount + errorCount}/${totalCount}, 成功: ${successCount}, 失败: ${errorCount}, 共生成数据集: ${totalDatasets}`;
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: progressNote,
          note: progressNote
        });

        return { success: false, questionId: question.id, error: error.message };
      }
    };

    // 并行处理所有问题，使用任务设置中的并发限制
    await processInParallel(questionsWithoutAnswers, processQuestion, concurrencyLimit, async (completed, total) => {
      console.log(`答案生成进度: ${completed}/${total}`);
    });

    if (!latestTaskStatus) {
      // 任务完成，更新状态
      const finalStatus = errorCount > 0 && successCount === 0 ? 2 : 1; // 如果全部失败，标记为失败；否则标记为完成
      await updateTask(task.id, {
        status: finalStatus,
        completedCount: successCount + errorCount,
        detail: '',
        note: '',
        endTime: new Date()
      });
    }

    console.log(`任务 ${task.id} 已完成`);
  } catch (error) {
    console.error('处理答案生成任务出错:', error);
    await updateTask(task.id, {
      status: 2, // 2 表示失败
      detail: `处理失败: ${error.message}`,
      note: `处理失败: ${error.message}`,
      endTime: new Date()
    });
  }
}

export default {
  processAnswerGenerationTask
};
