import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Fetch all workflow templates with their stages
export async function GET() {
  try {
    const templates = await prisma.workflowTemplate.findMany({
      include: {
        workflowStages: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching workflow templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow templates' },
      { status: 500 }
    );
  }
}

// POST - Create new workflow template with stages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, stages } = body as {
      name: string;
      description?: string;
      stages: Array<{ name: string; code: string; requiresApproval: boolean }>;
    };

    if (!name || !stages || stages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, stages' },
        { status: 400 }
      );
    }

    const template = await prisma.workflowTemplate.create({
      data: {
        name,
        description: description || '',
        workflowStages: {
          create: stages.map((stage, index) => ({
            name: stage.name,
            code: stage.code,
            order: index,
            requiresApproval: stage.requiresApproval,
          })),
        },
      },
      include: { workflowStages: true },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow template:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow template' },
      { status: 500 }
    );
  }
}

// PATCH - Update workflow template
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description } = body as {
      id: number;
      name?: string;
      description?: string;
    };

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const template = await prisma.workflowTemplate.update({
      where: { id: Number(id) },
      data: { name, description },
      include: { workflowStages: true },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating workflow template:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete workflow template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    await prisma.workflowTemplate.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow template:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow template' },
      { status: 500 }
    );
  }
}

