import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';


// POST - Create a new quotation with all relationships
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate required fields
    if (!body.forCompanyId || !body.projectId || !body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: forCompanyId, projectId, items' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const form = await tx.quotationForm.create({
        data: {
          forCompanyId: Number(body.forCompanyId),
          projectId: Number(body.projectId),
          requestorId: body.requestorId ? Number(body.requestorId) : null,
          deliveryTerm: body.deliveryTerm ?? null,
          paymentTerm: body.paymentTerm ?? null,
          approvedBudget: body.approvedBudget ?? null,
          bidPercentage: body.bidPercentage ?? null,
          totalCost: body.totals?.totalCost ?? null,
          bidPrice: body.totals?.bidPrice ?? null,
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

// GET - Fetch all quotations
export async function GET() {
  try {
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
