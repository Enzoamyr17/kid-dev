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
    const [quotationForms, prForms, poForms] = await Promise.all([
      prisma.quotationForm.findMany({
        where: { projectId: Number(projectId) },
        include: {
          quotationItems: {
            include: {
              product: true,
              supplier: true,
            },
          },
          forCompany: {
            include: {
              companyProponents: true,
              companyAddresses: true,
            },
          },
          requestor: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prForm.findMany({
        where: { projectId: Number(projectId) },
        include: {
          prItems: {
            include: {
              product: true,
              supplier: true,
            },
          },
          forCompany: true,
          fromSupplier: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.poForm.findMany({
        where: { projectId: Number(projectId) },
        include: {
          poItems: {
            include: {
              product: true,
              supplier: true,
            },
          },
          forCompany: true,
          fromSupplier: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Group forms by type
    const groupedForms = {
      quotations: quotationForms,
      purchaseRequests: prForms,
      purchaseOrders: poForms,
    };

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
