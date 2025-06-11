import { getProjectRoot } from '@/lib/db/base';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const rmdir = promisify(fs.rm);

/**
 * 删除项目目录
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

    // 检查目录是否存在
    if (!fs.existsSync(projectPath)) {
      return NextResponse.json(
        {
          success: false,
          error: '项目目录不存在'
        },
        { status: 404 }
      );
    }

    // 递归删除目录
    await rmdir(projectPath, { recursive: true, force: true });

    return NextResponse.json({
      success: true,
      message: '项目目录已删除'
    });
  } catch (error) {
    console.error('删除项目目录出错:', String(error));
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
