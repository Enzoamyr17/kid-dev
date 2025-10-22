import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to convert BigInt to string recursively
function serializeProduct(product: unknown): unknown {
  if (product === null || product === undefined) return product;
  
  if (typeof product === 'bigint') {
    return product.toString();
  }
  
  if (Array.isArray(product)) {
    return product.map(serializeProduct);
  }
  
  if (typeof product === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(product)) {
      serialized[key] = serializeProduct(value);
    }
    return serialized;
  }
  
  return product;
}

// GET - Fetch all products
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active');
  
  try {
    const products = await prisma.product.findMany({
      where: active ? { isActive: true } : undefined,
      orderBy: { sku: 'asc' },
    });

    const serializedProducts = products.map(serializeProduct);
    return NextResponse.json(serializedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const product = await prisma.product.create({
      data: {
        sku: body.sku,
        name: body.name,
        description: body.description,
        brand: body.brand,
        category: body.category,
        subCategory: body.sub_category,
        adCategory: body.ad_category,
        uom: body.uom,
        isActive: body.is_active ?? true,
      },
    });

    const serializedProduct = serializeProduct(product);
    return NextResponse.json(serializedProduct, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// PATCH - Update product
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Convert snake_case to camelCase
    const mappedData: Record<string, unknown> = {};
    if (updateData.sku !== undefined) mappedData.sku = updateData.sku;
    if (updateData.name !== undefined) mappedData.name = updateData.name;
    if (updateData.description !== undefined) mappedData.description = updateData.description;
    if (updateData.brand !== undefined) mappedData.brand = updateData.brand;
    if (updateData.category !== undefined) mappedData.category = updateData.category;
    if (updateData.sub_category !== undefined) mappedData.subCategory = updateData.sub_category;
    if (updateData.ad_category !== undefined) mappedData.adCategory = updateData.ad_category;
    if (updateData.uom !== undefined) mappedData.uom = updateData.uom;
    if (updateData.is_active !== undefined) mappedData.isActive = updateData.is_active;

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: mappedData,
    });

    const serializedProduct = serializeProduct(product);
    return NextResponse.json(serializedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    await prisma.product.delete({ where: { id: Number(id) } });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}