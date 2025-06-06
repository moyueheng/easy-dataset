/**
 * 任务恢复服务
 * 用于在服务启动时检查并恢复未完成的任务
 */
import { PrismaClient } from '@prisma/client';
import { processAnswerGenerationTask } from './answer-generation';
import { processQuestionGenerationTask } from './question-generation';

const prisma = new PrismaClient();

// 服务初始化标志，确保只执行一次
let initialized = false;

/**
 * 恢复未完成的任务
 * 在应用启动时自动执行一次
 */
export async function recoverPendingTasks() {
  // 如果已经初始化过，直接返回
  if (process.env.INITED) {
    return;
  }

  process.env.INITED = true;

  try {
    console.log('开始检查未完成任务...');

    // 查找所有处理中的任务
    const pendingTasks = await prisma.task.findMany({
      where: {
        status: 0 // 处理中的任务
      }
    });

    if (pendingTasks.length === 0) {
      console.log('没有需要恢复的任务');
      initialized = true;
      return;
    }

    console.log(`找到 ${pendingTasks.length} 个未完成任务，开始恢复...`);

    // 遍历处理每个任务
    for (const task of pendingTasks) {
      try {
        // 根据任务类型调用对应的处理函数
        switch (task.taskType) {
          case 'question-generation':
            // 异步处理，不等待完成
            processQuestionGenerationTask(task).catch(error => {
              console.error(`恢复问题生成任务 ${task.id} 失败:`, error);
            });
            break;
          case 'answer-generation':
            // 异步处理，不等待完成
            processAnswerGenerationTask(task).catch(error => {
              console.error(`恢复答案生成任务 ${task.id} 失败:`, error);
            });
            break;
          default:
            console.warn(`Other Task: ${task.taskType}`);
            await prisma.task.update({
              where: { id: task.id },
              data: {
                status: 2,
                detail: `${task.taskType} Error`,
                note: `${task.taskType} Error`,
                endTime: new Date()
              }
            });
        }
      } catch (error) {
        console.error(`恢复任务 ${task.id} 失败:`, error);
      }
    }

    console.log('任务恢复服务已启动，未完成任务将在后台继续处理');
    initialized = true;
  } catch (error) {
    console.error('任务恢复服务出错:', error);
    // 即使出错也标记为已初始化，避免反复尝试
    initialized = true;
  }
}

// 在模块加载时自动执行恢复
recoverPendingTasks().catch(error => {
  console.error('执行任务恢复失败:', error);
});
