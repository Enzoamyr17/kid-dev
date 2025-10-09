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
    if (!body.company_id || !body.project_id || !body.cart_items || body.cart_items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id, project_id, or cart_items' },
        { status: 400 }
      );
    }

    // Generate Quote Number if not provided
    const quote_no = body.quote_no || await generateQuoteNumber();

    // Convert prices to integers (cents) for storage
    const total_cost = Math.round(body.financials.total_cost * 100);
    const bid_price = Math.round(body.financials.total_bid_price * 100);
    const approved_budget = body.approved_budget ? Math.round(body.approved_budget * 100) : null;

    // Use Prisma transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify Company exists
      const company = await tx.company.findUnique({
        where: { id: BigInt(body.company_id) },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // 2. Verify Project exists
      const project = await tx.project.findUnique({
        where: { id: BigInt(body.project_id) },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 3. Create QuotationDetail
      const quotationDetail = await tx.quotationDetail.create({
        data: {
          quoteNo: quote_no,
          forCompanyId: BigInt(body.company_id),
          requestorId: body.requestor_id ? BigInt(body.requestor_id) : null,
          deliveryDate: body.delivery_date ? new Date(body.delivery_date) : null,
          approvedBudget: approved_budget,
          bidPercentage: body.bid_percentage,
          paymentMethod: body.payment_method || null,
          totalCost: total_cost,
          bidPrice: bid_price,
        },
      });

      // 4. Get or create Lifecycle
      // Check if there's an existing lifecycle for this project in TO_BID stage
      let lifecycle = await tx.lifecycle.findFirst({
        where: {
          projectId: BigInt(body.project_id),
          status: 'TO_BID',
        },
      });

      if (!lifecycle) {
      // Get the first lifecycle template and its first stage with stages
      const lifecycleTemplate = await tx.lifecycleTemplate.findFirst();
      if (!lifecycleTemplate) {
        throw new Error('No lifecycle template found');
      }

      const templateWithStages = await tx.lifecycleStage.findFirst({
        where: { templateId: lifecycleTemplate.id },
        orderBy: { order: 'asc' },
      });

      if (!templateWithStages) {
        throw new Error('No lifecycle stage found');
      }

      lifecycle = await tx.lifecycle.create({
        data: {
          templateId: templateWithStages.templateId,
          projectId: BigInt(body.project_id),
          stageId: templateWithStages.id,
          status: 'TO_BID',
        },
      });
      }

      // 5. Create Form
      const form = await tx.form.create({
        data: {
          lifecycleId: lifecycle.id,
          projectId: BigInt(body.project_id),
          stageId: lifecycle.stageId,
          detailId: quotationDetail.id,
          type: 'q',
        },
      });

      // 6. Create FormItems for all cart items
      const formItems = await Promise.all(
        body.cart_items.map((item: {
          product_id: string;
          sku: string;
          quantity: number;
          internal_price: number;
          proposal_price: number;
          supplier: string;
        }) => {
          return tx.formItem.create({
            data: {
              formId: form.id,
              productId: BigInt(item.product_id),
              quantity: BigInt(item.quantity),
              supplierName: item.supplier,
              supplierPrice: BigInt(Math.round(item.internal_price * 100)),
              clientPrice: BigInt(Math.round(item.proposal_price * 100)),
              total: BigInt(Math.round(item.proposal_price * item.quantity * 100)),
            },
          });
        })
      );

      return {
        quotationDetail,
        form,
        formItems,
        lifecycle,
      };
    });

    // Serialize BigInt values
    const serializedResult = serializeBigInt(result as unknown as Record<string, unknown>);

    return NextResponse.json(serializedResult, { status: 201 });
  } catch (error) {
    console.error('Error creating quotation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create quotation' },
      { status: 500 }
    );
  }
}

// Helper function to generate Quote Number
async function generateQuoteNumber(): Promise<string> {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const prefix = `RFQ${currentYear}-`;

  // Get the latest quote number for the current year
  const latestQuote = await prisma.quotationDetail.findFirst({
    where: {
      quoteNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      quoteNo: 'desc',
    },
  });

  let nextNumber = 1;
  if (latestQuote) {
    const lastNumber = parseInt(latestQuote.quoteNo.split('-')[1] || '0', 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// GET - Fetch all quotations
export async function GET() {
  try {
    const quotations = await prisma.quotationDetail.findMany({
      orderBy: {
        id: 'desc',
      },
    });

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
