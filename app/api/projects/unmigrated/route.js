import { getProjectRoot } from '@/lib/db/base';
import { db } from '@/lib/db/index';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * 获取未迁移的项目列表
 * @returns {Promise<Response>} 包含未迁移项目列表的响应
 */
export async function GET(request) {
  // 获取当前请求的 URL，从中提取查询参数
  const { searchParams } = new URL(request.url);
  // 这行代码是关键，强制每次请求都是不同的
  const timestamp = searchParams.get('_t') || Date.now();
  try {
    // 获取项目根目录
    const projectRoot = await getProjectRoot();

    // 读取根目录下的所有文件夹（每个文件夹代表一个项目）
    const files = await fs.promises.readdir(projectRoot, { withFileTypes: true });

    // 过滤出目录类型的条目
    const projectDirs = files.filter(file => file.isDirectory());

    // 如果没有项目目录，则直接返回空列表
    if (projectDirs.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // 获取所有项目ID
    const projectIds = projectDirs.map(dir => dir.name);

    // 批量查询已迁移的项目
    const existingProjects = await db.projects.findMany({
      where: {
        id: {
          in: projectIds
        }
      },
      select: {
        id: true
      }
    });

    // 转换为集合以便快速查找
    const existingProjectIds = new Set(existingProjects.map(p => p.id));

    // 筛选出未迁移的项目
    const unmigratedProjectDirs = projectDirs.filter(dir => !existingProjectIds.has(dir.name));

    // 获取未迁移项目的ID列表
    const unmigratedProjects = unmigratedProjectDirs.map(dir => dir.name);

    return NextResponse.json({
      success: true,
      data: unmigratedProjects,
      projectRoot,
      number: Date.now(),
      timestamp
    });
  } catch (error) {
    console.error('获取未迁移项目列表出错:', String(error));
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
