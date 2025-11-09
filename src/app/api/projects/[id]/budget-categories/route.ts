import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditUser } from '@/lib/audit-context';
import { getSessionUserId } from '@/lib/get-session-user';

export const dynamic = 'force-dynamic';

// GET - Fetch budget categories for a specific project
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = Number(params.id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const budgetCategories = await prisma.budgetCategory.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        name: true,
        color: true,
        description: true,
        budget: true,
        type: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(budgetCategories);
  } catch (error) {
    console.error('[API /projects/[id]/budget-categories] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget categories' },
      { status: 500 }
    );
  }
}

// POST - Create a new budget category for a project
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = Number(params.id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, budget, color, type } = body as {
      name: string;
      description?: string;
      budget?: number;
      color?: string;
      type?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const userId = await getSessionUserId();

    const budgetCategory = await withAuditUser(userId, async (tx) => {
      return await tx.budgetCategory.create({
        data: {
          projectId,
          name: name.trim(),
          description: description?.trim() || '',
          budget: budget || 0,
          color: color || '#3b82f6', // Default blue color
          type: type || 'Expense', // Default to Expense if not specified
        },
      });
    });

    console.log('[API /projects/[id]/budget-categories] Created category:', budgetCategory.id);
    return NextResponse.json(budgetCategory, { status: 201 });
  } catch (error) {
    console.error('[API /projects/[id]/budget-categories] Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create budget category' },
      { status: 500 }
    );
  }
}
