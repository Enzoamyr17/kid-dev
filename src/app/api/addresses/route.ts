import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to convert BigInt to string recursively
function serializeAddress(address: unknown): unknown {
  if (address === null || address === undefined) return address;
  
  if (typeof address === 'bigint') {
    return address.toString();
  }
  
  if (Array.isArray(address)) {
    return address.map(serializeAddress);
  }
  
  if (typeof address === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(address)) {
      serialized[key] = serializeAddress(value);
    }
    return serialized;
  }
  
  return address;
}

// GET - Fetch all addresses (optionally filter by company_id)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get('company_id');

    const addresses = await prisma.companyAddress.findMany({
      where: company_id ? { companyId: BigInt(company_id) } : undefined,
      include: {
        company: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    const serializedAddresses = addresses.map((address) => ({
      ...(serializeAddress(address) as Record<string, unknown>),
      company: {
        ...address.company,
        id: address.company.id.toString(),
      },
    }));

    return NextResponse.json(serializedAddresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}

// POST - Create a new address
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.company_id || !body.street1 || !body.city || !body.province) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id, street1, city, province' },
        { status: 400 }
      );
    }

    const address = await prisma.companyAddress.create({
      data: {
        companyId: BigInt(body.company_id),
        street1: body.street1,
        street2: body.street2 || '',
        subd: body.subd || '',
        city: body.city,
        province: body.province,
        zipcode: body.zipcode || 0,
      },
      include: {
        company: true,
      },
    });

    const serializedAddress = {
      ...(serializeAddress(address) as Record<string, unknown>),
      company: {
        ...address.company,
        id: address.company.id.toString(),
      },
    };

    return NextResponse.json(serializedAddress, { status: 201 });
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json(
      { error: 'Failed to create address' },
      { status: 500 }
    );
  }
}

// PATCH - Update address
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    // Convert snake_case fields and BigInt fields
    const mappedData: Record<string, unknown> = {};
    if (updateData.company_id !== undefined) mappedData.companyId = BigInt(updateData.company_id);
    if (updateData.street1 !== undefined) mappedData.street1 = updateData.street1;
    if (updateData.street2 !== undefined) mappedData.street2 = updateData.street2;
    if (updateData.subd !== undefined) mappedData.subd = updateData.subd;
    if (updateData.city !== undefined) mappedData.city = updateData.city;
    if (updateData.province !== undefined) mappedData.province = updateData.province;
    if (updateData.zipcode !== undefined) mappedData.zipcode = updateData.zipcode;

    const address = await prisma.companyAddress.update({
      where: { id: BigInt(id) },
      data: mappedData,
      include: {
        company: true,
      },
    });

    const serializedAddress = {
      ...(serializeAddress(address) as Record<string, unknown>),
      company: {
        ...address.company,
        id: address.company.id.toString(),
      },
    };

    return NextResponse.json(serializedAddress);
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json(
      { error: 'Failed to update address' },
      { status: 500 }
    );
  }
}

// DELETE - Delete address
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    await prisma.companyAddress.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { error: 'Failed to delete address' },
      { status: 500 }
    );
  }
}
