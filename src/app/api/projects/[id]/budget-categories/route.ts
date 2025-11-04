import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
