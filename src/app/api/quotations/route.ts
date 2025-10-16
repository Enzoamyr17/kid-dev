import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to convert BigInt to string
function serializeBigInt(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'bigint') {
      result[key] = value.toString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = serializeBigInt(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? serializeBigInt(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

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

    return NextResponse.json(serializeBigInt(result as unknown as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error('Error creating quotation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create quotation' },
      { status: 500 }
    );
  }
}

// Helper function to generate Quote Number
// TODO: Implement quote number generation if needed
async function generateQuoteNumber(): Promise<string> {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const prefix = `RFQ${currentYear}-`;

  // Get the latest quote number for the current year
  // Note: QuotationForm model doesn't have quoteNo field yet
  // const latestQuote = await prisma.quotationForm.findFirst({
  //   where: {
  //     // Add quoteNo field to schema first
  //   },
  //   orderBy: {
  //     createdAt: 'desc',
  //   },
  // });

  const nextNumber = 1;
  // TODO: Implement actual number generation
  // if (latestQuote) {
  //   const lastNumber = parseInt(latestQuote.quoteNo.split('-')[1] || '0', 10);
  //   nextNumber = lastNumber + 1;
  // }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// GET - Fetch all quotations
export async function GET() {
  try {
    const quotations = await prisma.quotationForm.findMany({ orderBy: { id: 'desc' } });

    const serializedQuotations = quotations.map((quotation) =>
      serializeBigInt(quotation as unknown as Record<string, unknown>)
    );

    return NextResponse.json(serializedQuotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotations' },
      { status: 500 }
    );
  }
}
