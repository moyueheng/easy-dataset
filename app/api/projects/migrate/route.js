import { NextResponse } from 'next/server';
import { main } from '@/lib/db/fileToDb';

// 存储迁移任务状态
const migrationTasks = new Map();

/**
 * 开始迁移任务
 */
export async function POST() {
  try {
    // 生成唯一的任务ID
    const taskId = Date.now().toString();

    // 初始化任务状态
    migrationTasks.set(taskId, {
      status: 'running',
      progress: 0,
      total: 0,
      completed: 0,
      error: null,
      startTime: Date.now()
    });

    // 异步执行迁移任务
    executeMigration(taskId);

    // 返回任务ID
    return NextResponse.json({
      success: true,
      taskId
    });
  } catch (error) {
    console.error('启动迁移任务失败:', String(error));
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * 获取迁移任务状态
 */
export async function GET(request) {
  try {
    // 从URL获取任务ID
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少任务ID'
        },
        { status: 400 }
      );
    }

    // 获取任务状态
    const task = migrationTasks.get(taskId);

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: '任务不存在'
        },
        { status: 404 }
      );
    }

    // 返回任务状态
    return NextResponse.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('获取迁移任务状态失败:', String(error));
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * 异步执行迁移任务
 * @param {string} taskId 任务ID
 */
async function executeMigration(taskId) {
  try {
    // 获取任务状态
    const task = migrationTasks.get(taskId);

    if (!task) {
      console.error(`任务 ${taskId} 不存在`);
      return;
    }

    // 更新任务状态为运行中
    task.status = 'running';
    task.progress = 0;
    task.completed = 0;
    task.total = 0;
    task.startTime = Date.now();

    // 每秒更新一次任务状态到存储中，以便前端能获取最新进度
    const statusUpdateInterval = setInterval(() => {
      // 只在任务还在运行时更新
      if (task.status === 'running') {
        migrationTasks.set(taskId, { ...task });
        console.log(`更新任务状态: ${taskId}, 进度: ${task.progress}%, 完成: ${task.completed}/${task.total}`);
      } else {
        // 如果任务已经结束，停止定时更新
        clearInterval(statusUpdateInterval);
      }
    }, 1000);

    // 执行迁移操作
    // 将任务状态对象传递给main函数，以便实时更新进度
    const count = await main(task);

    // 清除状态更新定时器
    clearInterval(statusUpdateInterval);

    // 再次确保任务状态为完成
    task.status = 'completed';
    task.progress = 100;
    task.completed = count;
    if (task.total === 0) task.total = count; // 确保总数不为零
    task.endTime = Date.now();

    // 更新最终任务状态
    migrationTasks.set(taskId, { ...task });

    // 任务完成后，设置一个定时器清理任务状态（例如30分钟后）
    setTimeout(
      () => {
        migrationTasks.delete(taskId);
        console.log(`清理任务状态: ${taskId}`);
      },
      30 * 60 * 1000
    );
  } catch (error) {
    console.error(`执行迁移任务 ${taskId} 失败:`, String(error));

    // 获取任务状态
    const task = migrationTasks.get(taskId);

    if (task) {
      // 更新任务状态为失败
      task.status = 'failed';
      task.error = error.message;
      task.endTime = Date.now();

      // 更新任务状态
      migrationTasks.set(taskId, task);
    }
  }
}
