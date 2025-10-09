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
      where: company_id ? { companyId: BigInt(company_id) } : undefined,
      include: {
        company: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    const serializedProjects = projects.map((project) => ({
      ...(serializeProject(project) as Record<string, unknown>),
      company: {
        ...project.company,
        id: project.company.id.toString(),
      },
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

    // Validate required fields
    if (!body.company_id || !body.code || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id, code, description' },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        companyId: BigInt(body.company_id),
        code: body.code,
        description: body.description,
        approvedBudgetCost: body.approved_budget_cost ? BigInt(body.approved_budget_cost) : null,
      },
      include: {
        company: true,
      },
    });

    const serializedProject = {
      ...(serializeProject(project) as Record<string, unknown>),
      company: {
        ...project.company,
        id: project.company.id.toString(),
      },
    };

    return NextResponse.json(serializedProject, { status: 201 });
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

    // Convert snake_case to camelCase and BigInt fields
    const mappedData: Record<string, unknown> = {};
    if (updateData.company_id !== undefined) mappedData.companyId = BigInt(updateData.company_id);
    if (updateData.code !== undefined) mappedData.code = updateData.code;
    if (updateData.description !== undefined) mappedData.description = updateData.description;
    if (updateData.approved_budget_cost !== undefined) mappedData.approvedBudgetCost = BigInt(updateData.approved_budget_cost);

    const project = await prisma.project.update({
      where: { id: BigInt(id) },
      data: mappedData,
      include: {
        company: true,
      },
    });

    const serializedProject = {
      ...(serializeProject(project) as Record<string, unknown>),
      company: {
        ...project.company,
        id: project.company.id.toString(),
      },
    };

    return NextResponse.json(serializedProject);
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

    await prisma.project.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
