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

// GET - Fetch all forms for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = BigInt(id);

    // Fetch all forms for this project
    const forms = await prisma.form.findMany({
      where: {
        projectId: projectId,
      },
      include: {
        lifecycleStage: true,
        lifecycle: true,
        formItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group forms by type and fetch related details
    const groupedForms = {
      quotations: [] as unknown[],
      purchaseRequests: [] as unknown[],
      purchaseOrders: [] as unknown[],
    };

    for (const form of forms) {
      const formWithDetails = {
        ...form,
        details: null as unknown,
      };

      if (form.type === 'q') {
        const quotationDetail = await prisma.quotationDetail.findUnique({
          where: { id: form.detailId },
          include: {
            company: {
              include: {
                companyProponents: true,
                companyAddresses: true,
              },
            },
          },
        });
        formWithDetails.details = quotationDetail;
        groupedForms.quotations.push(formWithDetails);
      } else if (form.type === 'pr') {
        const prDetail = await prisma.prDetail.findUnique({
          where: { id: form.detailId },
          include: {
            company: true,
          },
        });
        formWithDetails.details = prDetail;
        groupedForms.purchaseRequests.push(formWithDetails);
      } else if (form.type === 'po') {
        const poDetail = await prisma.poDetail.findUnique({
          where: { id: form.detailId },
          include: {
            company: true,
          },
        });
        formWithDetails.details = poDetail;
        groupedForms.purchaseOrders.push(formWithDetails);
      }
    }

    // Sort each group by their respective code
    groupedForms.quotations.sort((a: unknown, b: unknown) => {
      const aForm = a as { details?: { quoteNo?: string } };
      const bForm = b as { details?: { quoteNo?: string } };
      const codeA = aForm.details?.quoteNo || '';
      const codeB = bForm.details?.quoteNo || '';
      return codeA.localeCompare(codeB);
    });

    groupedForms.purchaseRequests.sort((a: unknown, b: unknown) => {
      const aForm = a as { details?: { prNo?: string } };
      const bForm = b as { details?: { prNo?: string } };
      const codeA = aForm.details?.prNo || '';
      const codeB = bForm.details?.prNo || '';
      return codeA.localeCompare(codeB);
    });

    groupedForms.purchaseOrders.sort((a: unknown, b: unknown) => {
      const aForm = a as { details?: { poNo?: bigint } };
      const bForm = b as { details?: { poNo?: bigint } };
      const codeA = aForm.details?.poNo?.toString() || '0';
      const codeB = bForm.details?.poNo?.toString() || '0';
      return parseInt(codeA) - parseInt(codeB);
    });

    // Serialize BigInt values
    const serializedResult = serializeBigInt(groupedForms as unknown as Record<string, unknown>);

    return NextResponse.json(serializedResult);
  } catch (error) {
    console.error('Error fetching project forms:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch project forms' },
      { status: 500 }
    );
  }
}
