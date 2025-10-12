import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to convert BigInt to string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeLifecycleTemplate(template: any) {
  return {
    id: template.id.toString(),
    name: template.name,
    description: template.description,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

// Helper function to serialize lifecycle stage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeLifecycleStage(stage: any) {
  return {
    id: stage.id.toString(),
    templateId: stage.templateId.toString(),
    name: stage.name,
    code: stage.code,
    order: stage.order,
    requiresApproval: stage.requiresApproval,
    stageOwner: stage.stageOwner,
    approvalType: stage.approvalType,
    createdAt: stage.createdAt.toISOString(),
    updatedAt: stage.updatedAt.toISOString(),
  };
}

// GET - Fetch all lifecycle templates with their stages
export async function GET() {
  try {
    const templates = await prisma.lifecycleTemplate.findMany({
      include: {
        lifecycleStages: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            lifecycles: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const serializedTemplates = templates.map((template) => ({
      ...serializeLifecycleTemplate(template),
      stages: template.lifecycleStages.map(serializeLifecycleStage),
      _count: template._count
    }));

    return NextResponse.json(serializedTemplates);
  } catch (error) {
    console.error('Error fetching lifecycle templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lifecycle templates' },
      { status: 500 }
    );
  }
}

// POST - Create new lifecycle template with stages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, stages } = body;

    const template = await prisma.lifecycleTemplate.create({
      data: {
        name,
        description,
        lifecycleStages: {
          create: stages.map((stage: { name: string; code: string; requiresApproval: boolean; stageOwner?: string[]; approvalType?: string }, index: number) => ({
            name: stage.name,
            code: stage.code,
            order: index,
            requiresApproval: stage.requiresApproval,
            stageOwner: stage.stageOwner || null,
            approvalType: stage.approvalType || null
          }))
        }
      },
      include: {
        lifecycleStages: true
      }
    });

    const serialized = {
      ...serializeLifecycleTemplate(template),
      stages: template.lifecycleStages.map(serializeLifecycleStage),
    };

    return NextResponse.json(serialized, { status: 201 });
  } catch (error) {
    console.error('Error creating lifecycle template:', error);
    return NextResponse.json(
      { error: 'Failed to create lifecycle template' },
      { status: 500 }
    );
  }
}

// PATCH - Update lifecycle template
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description } = body;

    const template = await prisma.lifecycleTemplate.update({
      where: { id: BigInt(id) },
      data: {
        name,
        description
      }
    });

    return NextResponse.json(serializeLifecycleTemplate(template));
  } catch (error) {
    console.error('Error updating lifecycle template:', error);
    return NextResponse.json(
      { error: 'Failed to update lifecycle template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete lifecycle template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    await prisma.lifecycleTemplate.delete({
      where: { id: BigInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lifecycle template:', error);
    return NextResponse.json(
      { error: 'Failed to delete lifecycle template' },
      { status: 500 }
    );
  }
}
