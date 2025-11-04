import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditUser } from '@/lib/audit-context';
import { getSessionUserId } from '@/lib/get-session-user';

export const dynamic = 'force-dynamic';

// Helper function to convert BigInt to string recursively
function serializeProponent(proponent: unknown): unknown {
  if (proponent === null || proponent === undefined) return proponent;
  
  if (typeof proponent === 'bigint') {
    return proponent.toString();
  }
  
  if (Array.isArray(proponent)) {
    return proponent.map(serializeProponent);
  }
  
  if (typeof proponent === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(proponent)) {
      serialized[key] = serializeProponent(value);
    }
    return serialized;
  }
  
  return proponent;
}

// GET - Fetch all proponents (optionally filter by company_id)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id');

    const proponents = await prisma.companyProponent.findMany({
      where: company_id ? { companyId: Number(company_id) } : undefined,
      include: {
        company: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    const serializedProponents = proponents.map((proponent) => ({
      ...(serializeProponent(proponent) as Record<string, unknown>),
      company: {
        ...proponent.company,
        id: proponent.company.id.toString(),
      },
    }));

    return NextResponse.json(serializedProponents);
  } catch (error) {
    console.error('Error fetching proponents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proponents' },
      { status: 500 }
    );
  }
}

// POST - Create a new proponent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!(body.companyId ?? body.company_id) || !(body.contactPerson ?? body.contact_person)) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id, contact_person' },
        { status: 400 }
      );
    }

    const userId = await getSessionUserId();

    const proponent = await withAuditUser(userId, async (tx) => {
      return await tx.companyProponent.create({
        data: {
          companyId: Number(body.companyId ?? body.company_id),
          contactPerson: body.contactPerson ?? body.contact_person,
          contactNumber: body.contactNumber ?? body.contact_number ?? null,
          email: body.email ?? null,
        },
        include: {
          company: true,
        },
      });
    });

    const serializedProponent = {
      ...(serializeProponent(proponent) as Record<string, unknown>),
      company: {
        ...proponent.company,
        id: proponent.company.id.toString(),
      },
    };

    return NextResponse.json(serializedProponent, { status: 201 });
  } catch (error) {
    console.error('Error creating proponent:', error);
    return NextResponse.json(
      { error: 'Failed to create proponent' },
      { status: 500 }
    );
  }
}

// PATCH - Update proponent
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Proponent ID is required' },
        { status: 400 }
      );
    }

    // Convert snake_case to camelCase and BigInt fields
    const mappedData: Record<string, unknown> = {};
    if (updateData.companyId !== undefined) mappedData.companyId = Number(updateData.companyId);
    if (updateData.company_id !== undefined) mappedData.companyId = Number(updateData.company_id);
    if (updateData.contact_person !== undefined) mappedData.contactPerson = updateData.contact_person;
    if (updateData.contactPerson !== undefined) mappedData.contactPerson = updateData.contactPerson;
    if (updateData.contact_number !== undefined) mappedData.contactNumber = updateData.contact_number;
    if (updateData.contactNumber !== undefined) mappedData.contactNumber = updateData.contactNumber;
    if (updateData.email !== undefined) mappedData.email = updateData.email;

    const userId = await getSessionUserId();

    const proponent = await withAuditUser(userId, async (tx) => {
      return await tx.companyProponent.update({
        where: { id: Number(id) },
        data: mappedData,
        include: {
          company: true,
        },
      });
    });

    const serializedProponent = {
      ...(serializeProponent(proponent) as Record<string, unknown>),
      company: {
        ...proponent.company,
        id: proponent.company.id.toString(),
      },
    };

    return NextResponse.json(serializedProponent);
  } catch (error) {
    console.error('Error updating proponent:', error);
    return NextResponse.json(
      { error: 'Failed to update proponent' },
      { status: 500 }
    );
  }
}

// DELETE - Delete proponent
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Proponent ID is required' },
        { status: 400 }
      );
    }

    const userId = await getSessionUserId();

    await withAuditUser(userId, async (tx) => {
      await tx.companyProponent.delete({ where: { id: Number(id) } });
    });

    return NextResponse.json({ message: 'Proponent deleted successfully' });
  } catch (error) {
    console.error('Error deleting proponent:', error);
    return NextResponse.json(
      { error: 'Failed to delete proponent' },
      { status: 500 }
    );
  }
}
