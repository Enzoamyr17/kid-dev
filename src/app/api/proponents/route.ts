import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
      where: company_id ? { companyId: BigInt(company_id) } : undefined,
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
    if (!body.company_id || !body.contact_person || !body.contact_number) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id, contact_person, contact_number' },
        { status: 400 }
      );
    }

    const proponent = await prisma.companyProponent.create({
      data: {
        companyId: BigInt(body.company_id),
        contactPerson: body.contact_person,
        contactNumber: body.contact_number,
      },
      include: {
        company: true,
      },
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
    if (updateData.company_id !== undefined) mappedData.companyId = BigInt(updateData.company_id);
    if (updateData.contact_person !== undefined) mappedData.contactPerson = updateData.contact_person;
    if (updateData.contact_number !== undefined) mappedData.contactNumber = updateData.contact_number;

    const proponent = await prisma.companyProponent.update({
      where: { id: BigInt(id) },
      data: mappedData,
      include: {
        company: true,
      },
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

    await prisma.companyProponent.delete({
      where: { id: BigInt(id) },
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
