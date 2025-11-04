import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Fetch distinct categories and subcategories from general transactions
export async function GET() {
  try {
    // Fetch all general transactions with non-null categories
    const transactions = await prisma.transaction.findMany({
      where: {
        transactionType: 'general',
        category: {
          not: null,
        },
      },
      select: {
        category: true,
        subCategory: true,
      },
      distinct: ['category', 'subCategory'],
      orderBy: {
        category: 'asc',
      },
    });

    // Extract unique categories
    const categoriesSet = new Set<string>();
    const subCategoriesMap = new Map<string, Set<string>>();

    transactions.forEach((transaction) => {
      if (transaction.category) {
        categoriesSet.add(transaction.category);

        // Group subcategories by category
        if (transaction.subCategory) {
          if (!subCategoriesMap.has(transaction.category)) {
            subCategoriesMap.set(transaction.category, new Set());
          }
          subCategoriesMap.get(transaction.category)?.add(transaction.subCategory);
        }
      }
    });

    // Convert to arrays and format
    const categories = Array.from(categoriesSet).sort();
    const subCategories: Record<string, string[]> = {};

    subCategoriesMap.forEach((subs, category) => {
      subCategories[category] = Array.from(subs).sort();
    });

    return NextResponse.json({
      categories,
      subCategories,
    });
  } catch (error) {
    console.error('[API /transactions/categories] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
