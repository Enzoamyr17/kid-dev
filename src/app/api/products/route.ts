import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to convert BigInt to string
function serializeProduct(product: { id: bigint; [key: string]: unknown }) {
  return {
    ...product,
    id: product.id.toString(),
  };
}

// GET - Fetch all products
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        id: 'desc',
      },
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
        subCategory: body.subCategory,
        adCategory: body.adCategory,
        uom: body.uom,
        isActive: body.isActive ?? true,
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

    const product = await prisma.product.update({
      where: { id: BigInt(id) },
      data: updateData,
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

