import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditUser } from '@/lib/audit-context';
import { getSessionUserId } from '@/lib/get-session-user';

export const dynamic = 'force-dynamic';


// POST - Create a new quotation with all relationships
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const isDraft = body.isDraft ?? false;

    // Validate required fields
    if (!body.forCompanyId || !body.projectId || !body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: forCompanyId, projectId, items' }, { status: 400 });
    }

    const userId = await getSessionUserId();

    const result = await withAuditUser(userId, async (tx) => {
      // If creating a draft, delete any existing draft for this project
      if (isDraft) {
        await tx.quotationForm.deleteMany({
          where: {
            projectId: Number(body.projectId),
            isDraft: true,
          },
        });
      }

      // Generate code only for non-drafts
      let code = null;
      if (!isDraft) {
        const lastQuotation = await tx.quotationForm.findFirst({
          where: {
            code: {
              startsWith: 'RFQ-'
            }
          },
          orderBy: {
            code: 'desc'
          },
          select: {
            code: true
          }
        });

        let nextNumber = 1;
        if (lastQuotation?.code) {
          const lastNumber = parseInt(lastQuotation.code.split('-')[1] || '0');
          nextNumber = lastNumber + 1;
        }
        code = `RFQ-${nextNumber.toString().padStart(4, '0')}`;
      }

      const form = await tx.quotationForm.create({
        data: {
          code,
          forCompanyId: Number(body.forCompanyId),
          projectId: Number(body.projectId),
          requestorId: body.requestorId ? Number(body.requestorId) : null,
          deliveryTerm: body.deliveryTerm ?? null,
          deliveryAddress: body.deliveryAddress ?? null,
          paymentTerm: body.paymentTerm ?? null,
          approvedBudget: body.approvedBudget ?? null,
          bidPercentage: body.bidPercentage ?? null,
          totalCost: body.totals?.totalCost ?? null,
          bidPrice: body.totals?.bidPrice ?? null,
          remarks: body.remarks ?? null,
          isDraft,
          quotationItems: {
            create: body.items.map((i: { productId: number; supplierId: number; quantity?: number; internalPrice: number; clientPrice: number; total: number; remarks?: string; }) => ({
              productId: Number(i.productId),
              supplierId: Number(i.supplierId),
              quantity: i.quantity ?? null,
              internalPrice: i.internalPrice,
              clientPrice: i.clientPrice,
              total: i.total,
              remarks: i.remarks ?? null,
            })),
          },
        },
        include: { quotationItems: true },
      });

      return form;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating quotation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create quotation' },
      { status: 500 }
    );
  }
}

// GET - Fetch all quotations or draft by projectId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const isDraft = searchParams.get('isDraft');

    // If requesting draft for a specific project
    if (projectId && isDraft === 'true') {
      const draft = await prisma.quotationForm.findFirst({
        where: {
          projectId: Number(projectId),
          isDraft: true,
        },
        include: {
          quotationItems: {
            include: {
              product: true,
              supplier: true,
            },
          },
        },
      });
      return NextResponse.json(draft);
    }

    // Default: fetch all quotations
    const quotations = await prisma.quotationForm.findMany({ orderBy: { id: 'desc' } });

    return NextResponse.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotations' },
      { status: 500 }
    );
  }
}


export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, items, totals, ...rawUpdateData } = body;

    console.log('[PATCH /api/quotations] Request received:', { id, hasItems: !!items, hasTotals: !!totals, rawUpdateData });

    if (!id) {
      return NextResponse.json({ error: 'Quotation ID is required' }, { status: 400 });
    }

    // Convert string IDs to numbers for Prisma
    const updateData: Record<string, unknown> = { ...rawUpdateData };
    if (updateData.forCompanyId) updateData.forCompanyId = Number(updateData.forCompanyId);
    if (updateData.projectId) updateData.projectId = Number(updateData.projectId);
    if (updateData.requestorId) updateData.requestorId = Number(updateData.requestorId);

    const userId = await getSessionUserId();

    const result = await withAuditUser(userId, async (tx) => {
      // If converting draft to final quotation, generate code
      if (updateData.isDraft === false) {
        const existingQuotation = await tx.quotationForm.findUnique({
          where: { id: Number(id) },
          select: { isDraft: true, code: true },
        });

        // Only generate code if it was a draft and doesn't have one
        if (existingQuotation?.isDraft && !existingQuotation.code) {
          const lastQuotation = await tx.quotationForm.findFirst({
            where: {
              code: {
                startsWith: 'RFQ-'
              }
            },
            orderBy: {
              code: 'desc'
            },
            select: {
              code: true
            }
          });

          let nextNumber = 1;
          if (lastQuotation?.code) {
            const lastNumber = parseInt(lastQuotation.code.split('-')[1] || '0');
            nextNumber = lastNumber + 1;
          }
          updateData.code = `RFQ-${nextNumber.toString().padStart(4, '0')}`;
        }
      }

      // Handle totals if provided
      if (totals) {
        updateData.totalCost = totals.totalCost ?? null;
        updateData.bidPrice = totals.bidPrice ?? null;
      }

      // If items are provided, update them
      if (items && Array.isArray(items)) {
        // Delete existing items
        await tx.quotationItem.deleteMany({
          where: { formId: Number(id) },
        });

        // Create new items
        await tx.quotationItem.createMany({
          data: items.map((i: { productId: number; supplierId: number; quantity?: number; internalPrice: number; clientPrice: number; total: number; remarks?: string; }) => ({
            formId: Number(id),
            productId: Number(i.productId),
            supplierId: Number(i.supplierId),
            quantity: i.quantity ?? null,
            internalPrice: i.internalPrice,
            clientPrice: i.clientPrice,
            total: i.total,
            remarks: i.remarks ?? null,
          })),
        });
      }

      // Update the quotation form
      const quotation = await tx.quotationForm.update({
        where: { id: Number(id) },
        data: updateData,
        include: { quotationItems: true },
      });

      return quotation;
    });

    console.log('[PATCH /api/quotations] Update successful:', result.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[PATCH /api/quotations] Error updating quotation:', error);
    console.error('[PATCH /api/quotations] Error details:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      error: 'Failed to update quotation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}