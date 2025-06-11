import { getProjectRoot } from '@/lib/db/base';
import { NextResponse } from 'next/server';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 打开项目目录
 * @returns {Promise<Response>} 操作结果响应
 */
export async function POST(request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: '项目ID不能为空'
        },
        { status: 400 }
      );
    }

    // 获取项目根目录
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);

    // 根据操作系统打开目录
    const platform = process.platform;
    let command;

    if (platform === 'win32') {
      // Windows
      command = `explorer "${projectPath}"`;
    } else if (platform === 'darwin') {
      // macOS
      command = `open "${projectPath}"`;
    } else {
      // Linux 和其他系统
      command = `xdg-open "${projectPath}"`;
    }

    await execAsync(command);

    return NextResponse.json({
      success: true,
      message: '已打开项目目录'
    });
  } catch (error) {
    console.error('打开项目目录出错:', String(error));
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
