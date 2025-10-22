import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Fetch all product prices
export async function GET() {
  try {
    const productPrices = await prisma.productPrice.findMany({
      include: {
        product: true,
        company: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(productPrices);
  } catch (error) {
    console.error('Error fetching product prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product prices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create a new product price
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const productId = body.productId ?? body.product_id;
    const companyId = body.companyId ?? body.company_id;
    const price = body.price;

    if (!productId || !companyId || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, companyId, and price' },
        { status: 400 }
      );
    }

    // Check if the product price already exists
    const existing = await prisma.productPrice.findUnique({
      where: {
        productId_companyId: {
          productId: Number(productId),
          companyId: Number(companyId),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Product price for this supplier already exists' },
        { status: 400 }
      );
    }

    const productPrice = await prisma.productPrice.create({
      data: {
        productId: Number(productId),
        companyId: Number(companyId),
        price: Number(price),
      },
      include: {
        product: true,
        company: true,
      },
    });

    return NextResponse.json(productPrice, { status: 201 });
  } catch (error) {
    console.error('Error creating product price:', error);
    return NextResponse.json(
      { error: 'Failed to create product price', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH - Update product price
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, productId, companyId, price } = body;

    if (price === undefined) {
      return NextResponse.json(
        { error: 'Price is required' },
        { status: 400 }
      );
    }

    let productPrice;

    // Support both id-based and productId/companyId-based updates
    if (id) {
      productPrice = await prisma.productPrice.update({
        where: { id: Number(id) },
        data: { price: Number(price) },
        include: {
          product: true,
          company: true,
        },
      });
    } else if (productId && companyId) {
      productPrice = await prisma.productPrice.update({
        where: {
          productId_companyId: {
            productId: Number(productId),
            companyId: Number(companyId),
          },
        },
        data: { price: Number(price) },
        include: {
          product: true,
          company: true,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Either id or both productId and companyId are required' },
        { status: 400 }
      );
    }

    return NextResponse.json(productPrice);
  } catch (error) {
    console.error('Error updating product price:', error);
    return NextResponse.json(
      { error: 'Failed to update product price', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete product price
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Product price ID is required' },
        { status: 400 }
      );
    }

    await prisma.productPrice.delete({ where: { id: Number(id) } });

    return NextResponse.json({ message: 'Product price deleted successfully' });
  } catch (error) {
    console.error('Error deleting product price:', error);
    return NextResponse.json(
      { error: 'Failed to delete product price', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
