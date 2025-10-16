import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Add a new stage to a workflow template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, name, code, requiresApproval, order } = body as {
      templateId: number;
      name: string;
      code: string;
      requiresApproval: boolean;
      order: number;
    };

    if (!templateId || !name || !code || order === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: templateId, name, code, order' },
        { status: 400 }
      );
    }

    const stage = await prisma.workflowStage.create({
      data: {
        templateId: Number(templateId),
        name,
        code,
        order,
        requiresApproval: requiresApproval ?? false,
      },
    });

    return NextResponse.json(stage, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow stage:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow stage' },
      { status: 500 }
    );
  }
}

// PATCH - Update a workflow stage
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body as {
      id: number;
      name?: string;
      code?: string;
      requiresApproval?: boolean;
      order?: number;
    };

    if (!id) {
      return NextResponse.json(
        { error: 'Stage ID is required' },
        { status: 400 }
      );
    }

    const stage = await prisma.workflowStage.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json(stage);
  } catch (error) {
    console.error('Error updating workflow stage:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow stage' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a workflow stage
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Stage ID is required' },
        { status: 400 }
      );
    }

    await prisma.workflowStage.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow stage:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow stage' },
      { status: 500 }
    );
  }
}

