import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to convert BigInt to string recursively
function serializeProject(project: unknown): unknown {
  if (project === null || project === undefined) return project;
  
  if (typeof project === 'bigint') {
    return project.toString();
  }
  
  if (Array.isArray(project)) {
    return project.map(serializeProject);
  }
  
  if (typeof project === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(project)) {
      serialized[key] = serializeProject(value);
    }
    return serialized;
  }
  
  return project;
}

// GET - Fetch all projects (optionally filter by company_id)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id');

    const projects = await prisma.project.findMany({
      where: {
        ...(company_id ? { companyId: Number(company_id) } : {}),
        // Only show regular projects (PROJ), not encoded projects (PPROJ)
        code: {
          startsWith: 'PROJ',
        },
      },
      include: { company: true, workflow: true, workflowstage: true },
      orderBy: { id: 'desc' },
    });

    const serializedProjects = projects.map((project) => ({
      ...project,
      company: project.company,
      workflow: project.workflow,
      workflowstage: project.workflowstage,
    }));

    return NextResponse.json(serializedProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, code, description, approvedBudget, workflowTemplateId } = body as {
      companyId: number; code: string; description: string; approvedBudget?: number; workflowTemplateId: number;
    };

    if (!companyId || !code || !description || !workflowTemplateId) {
      return NextResponse.json({ error: 'Missing required fields: companyId, code, description, workflowTemplateId' }, { status: 400 });
    }

    const firstStage = await prisma.workflowStage.findFirst({
      where: { templateId: workflowTemplateId },
      orderBy: { order: 'asc' },
    });

    if (!firstStage) {
      return NextResponse.json({ error: 'Workflow template has no stages' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        companyId,
        code,
        description,
        approvedBudget: approvedBudget ?? 0,
        workflowId: workflowTemplateId,
        workflowStageId: firstStage.id,
      },
      include: { company: true, workflow: true, workflowstage: true },
    });

    //Initialize project budget default categories
    await prisma.budgetCategory.createMany({
      data: [
        { projectId: project.id, name: 'Logistics', description: '', budget: Math.round(Number(approvedBudget) / 20), color: '#3b82f6' },
        { projectId: project.id, name: 'Procurement', description: '', budget: 0, color: '#3b82f6' },
      ],
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

// PATCH - Update project
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const mappedData: Record<string, unknown> = {};
    if (updateData.companyId !== undefined) mappedData.companyId = Number(updateData.companyId);
    if (updateData.code !== undefined) mappedData.code = updateData.code;
    if (updateData.description !== undefined) mappedData.description = updateData.description;
    if (updateData.approvedBudget !== undefined) mappedData.approvedBudget = Number(updateData.approvedBudget);
    if (updateData.workflowStageId !== undefined) mappedData.workflowStageId = Number(updateData.workflowStageId);

    const project = await prisma.project.update({
      where: { id: Number(id) },
      data: mappedData,
      include: { company: true, workflow: true, workflowstage: true },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE - Delete project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    await prisma.project.delete({ where: { id: Number(id) } });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
