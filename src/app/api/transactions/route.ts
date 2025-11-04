import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ExpenseTransactionType, ExpenseTransactionStatus } from '@prisma/client';
import { withAuditUser } from '@/lib/audit-context';
import { getSessionUserId } from '@/lib/get-session-user';

export const dynamic = 'force-dynamic';

// GET - Fetch all transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');

    const where: {
      transactionType?: ExpenseTransactionType;
      status?: ExpenseTransactionStatus;
      projectId?: number;
    } = {};

    if (type) {
      where.transactionType = type as ExpenseTransactionType;
    }
    if (status) {
      where.status = status as ExpenseTransactionStatus;
    }
    if (projectId) {
      where.projectId = Number(projectId);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            code: true,
            description: true,
          },
        },
        budgetCategory: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: [
        { datePurchased: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('[API /transactions] Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API /transactions] Creating transaction with data:', body);

    const {
      transactionType,
      datePurchased,
      projectId,
      categoryId,
      category,
      subCategory,
      itemDescription,
      cost,
      status,
      remarks,
      attachment,
    } = body as {
      transactionType: string;
      datePurchased: string;
      projectId?: number;
      categoryId?: number;
      category?: string;
      subCategory?: string;
      itemDescription: string;
      cost: number;
      status: string;
      remarks?: string;
      attachment?: string;
    };

    // Validation
    if (!transactionType || !datePurchased || !itemDescription || !cost || !status) {
      console.log('[API /transactions] Validation failed - missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: transactionType, datePurchased, itemDescription, cost, status' },
        { status: 400 }
      );
    }

    // Validate transaction type
    const validTypes = ['general', 'project'];
    if (!validTypes.includes(transactionType)) {
      return NextResponse.json(
        { error: 'Invalid transaction type. Must be "general" or "project"' },
        { status: 400 }
      );
    }

    // Type-specific validation
    if (transactionType === 'project') {
      if (!projectId || !categoryId) {
        return NextResponse.json(
          { error: 'Project transactions require projectId and categoryId' },
          { status: 400 }
        );
      }
    } else if (transactionType === 'general') {
      if (!category) {
        return NextResponse.json(
          { error: 'General transactions require a category' },
          { status: 400 }
        );
      }
    }

    // Validate status
    const validStatuses = ['pending', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "pending" or "completed"' },
        { status: 400 }
      );
    }

    const userId = await getSessionUserId();

    const transaction = await withAuditUser(userId, async (tx) => {
      return await tx.transaction.create({
        data: {
          transactionType: transactionType as ExpenseTransactionType,
          datePurchased: new Date(datePurchased),
          projectId: projectId || null,
          categoryId: categoryId || null,
          category: category || null,
          subCategory: subCategory || null,
          itemDescription,
          cost,
          status: status as ExpenseTransactionStatus,
          remarks: remarks || null,
          attachment: attachment || null,
        },
        include: {
          project: {
            select: {
              id: true,
              code: true,
              description: true,
            },
          },
          budgetCategory: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });
    });

    console.log('[API /transactions] Transaction created successfully:', transaction.id);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('[API /transactions] Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PATCH - Update transaction
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    console.log('[API /transactions] Updating transaction:', id, updateData);

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const data: Record<string, unknown> = {};
    if (updateData.transactionType !== undefined) data.transactionType = updateData.transactionType as ExpenseTransactionType;
    if (updateData.datePurchased !== undefined) data.datePurchased = new Date(updateData.datePurchased);
    if (updateData.projectId !== undefined) data.projectId = updateData.projectId || null;
    if (updateData.categoryId !== undefined) data.categoryId = updateData.categoryId || null;
    if (updateData.category !== undefined) data.category = updateData.category || null;
    if (updateData.subCategory !== undefined) data.subCategory = updateData.subCategory || null;
    if (updateData.itemDescription !== undefined) data.itemDescription = updateData.itemDescription;
    if (updateData.cost !== undefined) data.cost = Number(updateData.cost);
    if (updateData.status !== undefined) data.status = updateData.status as ExpenseTransactionStatus;
    if (updateData.remarks !== undefined) data.remarks = updateData.remarks || null;
    if (updateData.attachment !== undefined) data.attachment = updateData.attachment || null;

    const userId = await getSessionUserId();

    const transaction = await withAuditUser(userId, async (tx) => {
      return await tx.transaction.update({
        where: { id: Number(id) },
        data,
        include: {
          project: {
            select: {
              id: true,
              code: true,
              description: true,
            },
          },
          budgetCategory: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });
    });

    console.log('[API /transactions] Transaction updated successfully');
    return NextResponse.json(transaction);
  } catch (error) {
    console.error('[API /transactions] Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

// DELETE - Delete transaction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log('[API /transactions] Deleting transaction:', id);

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const userId = await getSessionUserId();

    await withAuditUser(userId, async (tx) => {
      await tx.transaction.delete({
        where: { id: Number(id) },
      });
    });

    console.log('[API /transactions] Transaction deleted successfully');
    return NextResponse.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('[API /transactions] Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
