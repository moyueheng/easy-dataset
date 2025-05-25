import { NextResponse } from 'next/server';
import { 
  getGaPairsByProjectId, 
  updateGaPair, 
  toggleGaPairActive,
  deleteGaPairsByFileId 
} from '@/lib/db/ga-pairs';
import { getProject } from '@/lib/db/projects';
import logger from '@/lib/util/logger';

/**
 * Get all GA pairs for a project
 * GET /api/projects/[projectId]/ga-pairs
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    
    // Validate parameters
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify project exists
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get GA pairs for project
    const gaPairs = await getGaPairsByProjectId(projectId);

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        gaPairs: gaPairs || []
      }
    });

  } catch (error) {
    logger.error('Failed to get GA pairs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get GA pairs' 
      }, 
      { status: 500 }
    );
  }
}

/**
 * Update GA pair
 * PUT /api/projects/[projectId]/ga-pairs
 */
export async function PUT(request, { params }) {
  try {
    const { projectId } = params;
    
    // Validate parameters
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify project exists
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { pairId, action, data } = body;

    if (!pairId) {
      return NextResponse.json({ error: 'GA pair ID is required' }, { status: 400 });
    }

    let result;
    
    if (action === 'toggle') {
      // Toggle active status
      const { isActive } = data;
      result = await toggleGaPairActive(pairId, isActive);
    } else {
      // Update GA pair data
      result = await updateGaPair(pairId, data);
    }

    return NextResponse.json({
      success: true,
      message: 'GA pair updated successfully',
      data: result
    });

  } catch (error) {
    logger.error('Failed to update GA pair:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update GA pair' 
      }, 
      { status: 500 }
    );
  }
}

/**
 * Delete GA pairs for a file
 * DELETE /api/projects/[projectId]/ga-pairs
 */
export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    
    // Validate parameters
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // Verify project exists
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete GA pairs for file
    const result = await deleteGaPairsByFileId(fileId);

    return NextResponse.json({
      success: true,
      message: 'GA pairs deleted successfully',
      data: result
    });

  } catch (error) {
    logger.error('Failed to delete GA pairs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to delete GA pairs' 
      }, 
      { status: 500 }
    );
  }
}
