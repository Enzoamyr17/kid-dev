import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ExpenseFrequency } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Fetch all company expenses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const frequency = searchParams.get('frequency');
    const category = searchParams.get('category');

    const where: {
      isActive?: boolean;
      frequency?: ExpenseFrequency;
      category?: string;
    } = {};

    if (active !== null) {
      where.isActive = active === 'true';
    }
    if (frequency) {
      where.frequency = frequency as ExpenseFrequency;
    }
    if (category) {
      where.category = category;
    }

    const expenses = await prisma.companyExpense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('[API /expenses] Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API /expenses] Creating expense with data:', body);

    const { name, amount, frequency, dayOfWeek, daysOfMonth, monthOfYear, specificDate, startOfPayment, category, notes } = body as {
      name: string;
      amount: number;
      frequency: string;
      dayOfWeek?: number;
      daysOfMonth?: string;
      monthOfYear?: number;
      specificDate?: string;
      startOfPayment?: string;
      category?: string;
      notes?: string;
    };

    // Validation
    if (!name || !amount || !frequency) {
      console.log('[API /expenses] Validation failed');
      return NextResponse.json(
        { error: 'Missing required fields: name, amount, frequency' },
        { status: 400 }
      );
    }

    // Validate frequency
    const validFrequencies = ['weekly', 'twice_monthly', 'monthly', 'quarterly', 'yearly', 'one_time'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency value' },
        { status: 400 }
      );
    }

    // Frequency-specific validation
    if (frequency === 'weekly' && (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6)) {
      return NextResponse.json({ error: 'Weekly frequency requires dayOfWeek (0-6)' }, { status: 400 });
    }
    if (['monthly', 'quarterly', 'yearly'].includes(frequency) && !daysOfMonth) {
      return NextResponse.json({ error: `${frequency} frequency requires daysOfMonth` }, { status: 400 });
    }
    if (['quarterly', 'yearly'].includes(frequency) && (monthOfYear === undefined || monthOfYear < 1 || monthOfYear > 12)) {
      return NextResponse.json({ error: `${frequency} frequency requires monthOfYear (1-12)` }, { status: 400 });
    }
    if (frequency === 'one_time' && !specificDate) {
      return NextResponse.json({ error: 'One-time frequency requires specificDate' }, { status: 400 });
    }

    const expense = await prisma.companyExpense.create({
      data: {
        name,
        amount,
        frequency: frequency as ExpenseFrequency,
        dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : null,
        daysOfMonth: daysOfMonth || null,
        monthOfYear: monthOfYear !== undefined ? monthOfYear : null,
        specificDate: specificDate ? new Date(specificDate) : null,
        startOfPayment: startOfPayment ? new Date(startOfPayment) : null,
        category: category || null,
        notes: notes || null,
        isActive: true,
      },
    });

    console.log('[API /expenses] Expense created successfully:', expense.id);
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('[API /expenses] Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PATCH - Update expense
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    console.log('[API /expenses] Updating expense:', id, updateData);

    if (!id) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const data: Record<string, unknown> = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.amount !== undefined) data.amount = Number(updateData.amount);
    if (updateData.frequency !== undefined) data.frequency = updateData.frequency as ExpenseFrequency;
    if (updateData.dayOfWeek !== undefined) data.dayOfWeek = updateData.dayOfWeek;
    if (updateData.daysOfMonth !== undefined) data.daysOfMonth = updateData.daysOfMonth;
    if (updateData.monthOfYear !== undefined) data.monthOfYear = updateData.monthOfYear;
    if (updateData.specificDate !== undefined) data.specificDate = updateData.specificDate ? new Date(updateData.specificDate) : null;
    if (updateData.startOfPayment !== undefined) data.startOfPayment = updateData.startOfPayment ? new Date(updateData.startOfPayment) : null;
    if (updateData.category !== undefined) data.category = updateData.category;
    if (updateData.notes !== undefined) data.notes = updateData.notes;
    if (updateData.isActive !== undefined) data.isActive = updateData.isActive;

    const expense = await prisma.companyExpense.update({
      where: { id: Number(id) },
      data,
    });

    console.log('[API /expenses] Expense updated successfully');
    return NextResponse.json(expense);
  } catch (error) {
    console.error('[API /expenses] Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log('[API /expenses] Deleting expense:', id);

    if (!id) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    await prisma.companyExpense.delete({
      where: { id: Number(id) },
    });

    console.log('[API /expenses] Expense deleted successfully');
    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('[API /expenses] Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
