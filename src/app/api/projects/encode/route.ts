import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditUser } from '@/lib/audit-context';
import { getSessionUserId } from '@/lib/get-session-user';

export const dynamic = 'force-dynamic';

// GET - Fetch all encoded projects (with PPROJ code prefix)
export async function GET() {
  try {
    const encodedProjects = await prisma.project.findMany({
      where: {
        code: {
          startsWith: 'PPROJ',
        },
      },
      include: {
        company: true,
        workflow: true,
        workflowstage: true,
        budget: true,
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(encodedProjects);
  } catch (error) {
    console.error('Error fetching encoded projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch encoded projects' },
      { status: 500 }
    );
  }
}

// POST - Create a new encoded project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API /projects/encode] Received request body:', body);

    const { companyId, companyName, description, projectDate, projectRevenue, expense } = body as {
      companyId?: number;
      companyName?: string;
      description: string;
      projectDate: string; // ISO date string
      projectRevenue?: number;
      expense?: number;
    };

    if ((!companyId && !companyName) || !description || !projectDate) {
      console.log('[API /projects/encode] Validation failed:', { companyId, companyName, description, projectDate });
      return NextResponse.json(
        { error: 'Missing required fields: (companyId or companyName), description, projectDate' },
        { status: 400 }
      );
    }

    const userId = await getSessionUserId();

    // Handle company: use existing or create new
    let finalCompanyId: number;

    if (companyId) {
      console.log('[API /projects/encode] Using provided company ID:', companyId);
      finalCompanyId = companyId;
    } else if (companyName) {
      console.log('[API /projects/encode] Searching for company by name:', companyName);
      // Search for existing company (case-insensitive, trimmed)
      const trimmedName = companyName.trim();
      const existingCompany = await prisma.company.findFirst({
        where: {
          companyName: {
            equals: trimmedName,
            mode: 'insensitive',
          },
        },
      });

      if (existingCompany) {
        console.log('[API /projects/encode] Found existing company:', existingCompany.id);
        finalCompanyId = existingCompany.id;
      } else {
        console.log('[API /projects/encode] Creating new company:', trimmedName);
        // Create new company with minimal data
        const newCompany = await withAuditUser(userId, async (tx) => {
          return await tx.company.create({
            data: {
              companyName: trimmedName,
              tinNumber: 'N/A',
              isClient: true,
              isInternal: false,
              isSupplier: false,
              isVendor: false,
            },
          });
        });
        console.log('[API /projects/encode] Created new company with ID:', newCompany.id);
        finalCompanyId = newCompany.id;
      }
    } else {
      console.log('[API /projects/encode] No company info provided');
      return NextResponse.json(
        { error: 'Either companyId or companyName must be provided' },
        { status: 400 }
      );
    }

    // Generate project code based on project date year
    const date = new Date(projectDate);
    const projectYear = date.getFullYear().toString().slice(-2);
    const prefix = `PPROJ${projectYear}-`;
    console.log('[API /projects/encode] Generating project code with prefix:', prefix);

    // Find all projects with the same prefix to get the next number
    const existingProjects = await prisma.project.findMany({
      where: {
        code: {
          startsWith: prefix,
        },
      },
      select: { code: true },
    });

    const maxNumber = existingProjects.length > 0
      ? Math.max(
          ...existingProjects.map((p) => {
            const parts = p.code.split('-');
            return parseInt(parts[1] || '0', 10);
          })
        )
      : 0;

    const projectCode = `${prefix}${(maxNumber + 1).toString().padStart(5, '0')}`;
    console.log('[API /projects/encode] Generated project code:', projectCode);

    // Get the first workflow template (or create a default one)
    let workflowTemplate = await prisma.workflowTemplate.findFirst({
      include: { workflowStages: { orderBy: { order: 'asc' } } },
    });

    // If no workflow exists, create a default one
    if (!workflowTemplate) {
      workflowTemplate = await withAuditUser(userId, async (tx) => {
        return await tx.workflowTemplate.create({
          data: {
            name: 'Default Workflow',
            description: 'Default workflow for projects',
            workflowStages: {
              create: [
                {
                  name: 'Completed',
                  code: 'completed',
                  order: 1,
                  requiresApproval: false,
                },
              ],
            },
          },
          include: { workflowStages: true },
        });
      });
    }

    const firstStage = workflowTemplate.workflowStages[0];

    if (!firstStage) {
      return NextResponse.json(
        { error: 'No workflow stage available' },
        { status: 500 }
      );
    }

    console.log('[API /projects/encode] Creating project with data:', {
      code: projectCode,
      companyId: finalCompanyId,
      description,
      projectRevenue: projectRevenue || 0,
      workflowId: workflowTemplate.id,
      workflowStageId: firstStage.id,
    });

    // Create the project with projectRevenue, budget category, and transaction in a single audit context
    const project = await withAuditUser(userId, async (tx) => {
      const newProject = await tx.project.create({
        data: {
          code: projectCode,
          companyId: finalCompanyId,
          description,
          approvedBudget: 0,
          projectRevenue: projectRevenue || 0,
          workflowId: workflowTemplate.id,
          workflowStageId: firstStage.id,
          createdAt: date, // Use the project date as creation date
        },
        include: {
          company: true,
          workflow: true,
          workflowstage: true
        },
      });
      console.log('[API /projects/encode] Project created with ID:', newProject.id);

      // Create "Encoded" budget category for this project
      console.log('[API /projects/encode] Creating budget category');
      const encodedCategory = await tx.budgetCategory.create({
        data: {
          projectId: newProject.id,
          name: 'Encoded',
          description: 'Expenses from encoded past project',
          budget: expense || 0,
          color: '#6b7280', // Gray color for encoded expenses
        },
      });
      console.log('[API /projects/encode] Budget category created with ID:', encodedCategory.id);

      // Create project transaction for the expense if provided
      if (expense && expense > 0) {
        console.log('[API /projects/encode] Creating transaction for expense:', expense);
        await tx.transaction.create({
          data: {
            transactionType: 'project',
            projectId: newProject.id,
            categoryId: encodedCategory.id,
            itemDescription: 'Encoded project expense',
            cost: expense,
            datePurchased: date,
            status: 'completed',
            createdAt: date, // Use project date
            updatedAt: date, // Use project date
          },
        });
        console.log('[API /projects/encode] Transaction created successfully');
      }

      return newProject;
    });

    console.log('[API /projects/encode] Successfully created encoded project:', project.code);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('[API /projects/encode] Error creating encoded project:', error);
    return NextResponse.json(
      { error: 'Failed to create encoded project', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Delete encoded project
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

    // Verify it's an encoded project
    const project = await prisma.project.findUnique({
      where: { id: Number(id) },
      select: { code: true },
    });

    if (!project || !project.code.startsWith('PPROJ')) {
      return NextResponse.json(
        { error: 'Not an encoded project' },
        { status: 400 }
      );
    }

    const userId = await getSessionUserId();

    await withAuditUser(userId, async (tx) => {
      await tx.project.delete({ where: { id: Number(id) } });
    });

    return NextResponse.json({ message: 'Encoded project deleted successfully' });
  } catch (error) {
    console.error('Error deleting encoded project:', error);
    return NextResponse.json(
      { error: 'Failed to delete encoded project' },
      { status: 500 }
    );
  }
}
