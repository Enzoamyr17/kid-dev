import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to convert BigInt to string recursively
function serializeCompany(company: unknown): unknown {
  if (company === null || company === undefined) return company;
  
  if (typeof company === 'bigint') {
    return company.toString();
  }
  
  if (Array.isArray(company)) {
    return company.map(serializeCompany);
  }
  
  if (typeof company === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(company)) {
      serialized[key] = serializeCompany(value);
    }
    return serialized;
  }
  
  return company;
}

// GET - Fetch all companies
export async function GET() {
  try {
    console.log('Attempting to fetch companies...');

    const companies = await prisma.company.findMany({
      include: {
        companyAddresses: true,
        companyProponents: true,
        _count: {
          select: {
            projects: true,
            companyAddresses: true,
            companyProponents: true,
          },
        },
      },
      orderBy: {
        companyName: 'asc',
      },
    });

    console.log('Companies fetched:', companies.length);

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const companyName = body.companyName ?? body.company_name;
    const tinNumber = body.tinNumber ?? body.tin_number ?? '';
    const isClient = body.isClient ?? body.is_client ?? false;
    const isSupplier = body.isSupplier ?? body.is_supplier ?? false;
    const isVendor = body.isVendor ?? body.is_vendor ?? false;
    const isInternal = body.isInternal ?? body.is_internal ?? false;

    if (!companyName) {
      return NextResponse.json(
        { error: 'Missing required field: companyName' },
        { status: 400 }
      );
    }

    const company = await prisma.company.create({
      data: {
        companyName,
        tinNumber,
        isClient,
        isSupplier,
        isVendor,
        isInternal,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Failed to create company', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH - Update company
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    const mappedData: Record<string, unknown> = {};
    if (updateData.companyName !== undefined) mappedData.companyName = updateData.companyName;
    if (updateData.company_name !== undefined) mappedData.companyName = updateData.company_name;
    if (updateData.tinNumber !== undefined) mappedData.tinNumber = updateData.tinNumber;
    if (updateData.tin_number !== undefined) mappedData.tinNumber = updateData.tin_number;
    if (updateData.isClient !== undefined) mappedData.isClient = updateData.isClient;
    if (updateData.is_client !== undefined) mappedData.isClient = updateData.is_client;
    if (updateData.isSupplier !== undefined) mappedData.isSupplier = updateData.isSupplier;
    if (updateData.is_supplier !== undefined) mappedData.isSupplier = updateData.is_supplier;
    if (updateData.isVendor !== undefined) mappedData.isVendor = updateData.isVendor;
    if (updateData.is_vendor !== undefined) mappedData.isVendor = updateData.is_vendor;
    if (updateData.isInternal !== undefined) mappedData.isInternal = updateData.isInternal;
    if (updateData.is_internal !== undefined) mappedData.isInternal = updateData.is_internal;

    const company = await prisma.company.update({
      where: { id: Number(id) },
      data: mappedData,
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Failed to update company', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete company
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    const companyId = Number(id);

    // Delete related records first to avoid foreign key constraint violations
    // Delete addresses
    await prisma.companyAddress.deleteMany({
      where: { companyId: companyId },
    });

    // Delete proponents
    await prisma.companyProponent.deleteMany({
      where: { companyId: companyId },
    });

    // Check if there are related projects
    const projectCount = await prisma.project.count({
      where: { companyId: companyId },
    });

    if (projectCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete company with existing projects. Please delete or reassign projects first.' },
        { status: 400 }
      );
    }

    // Delete the company
    await prisma.company.delete({ where: { id: companyId } });

    return NextResponse.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
