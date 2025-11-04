import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

export async function PATCH(request: NextRequest) {

  try {
    const body = await request.json();
    const { id, projectId, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Quotation ID is required' }, { status: 400 });
    }
    
    const quotation = await prisma.quotationForm.update({
      where: { id },
      data: updateData,
    });

    // Update project budget if quotation is approved
    const procurementCategory = await prisma.budgetCategory.findFirst({ where: { projectId: projectId, name: 'Procurement' } });
    if(procurementCategory) {
        const project = await prisma.budgetCategory.update({
            where: { id: procurementCategory.id },
            data: { budget: Number(quotation.totalCost) },
        });
    } else {
        const tryCreateProcurementCategory = await prisma.budgetCategory.create({
            data: { projectId: projectId, name: 'Procurement', budget: Number(quotation.totalCost), color: '#3b82f6' },
        });
    }

    try {
        const budgetCategory = await prisma.budgetCategory.findFirst({
            where: { projectId: projectId, name: 'Procurement' },
        });
        const quotationForm = await prisma.quotationForm.findUnique({
            where: { id: id },
            include: { quotationItems: { include: { product: true } } },
        });
        if(budgetCategory && quotationForm?.quotationItems) {
            await prisma.transaction.createMany({
                data: quotationForm?.quotationItems?.map((item: { product: { name: string; uom: string; }; internalPrice: Decimal; quantity?: number | null; }) => ({
                    transactionType: 'project',
                    projectId: projectId,
                    categoryId: budgetCategory.id,
                    itemDescription: item.product.name + ' - ' + item.quantity + ' ' + item.product.uom,
                    cost: new Decimal(item.internalPrice).mul(item.quantity ?? 1),
                    datePurchased: new Date(),
                    status: 'completed',
                })),
            });
        } else {
            return NextResponse.json({ error: 'Procurement category not found' }, { status: 404 });
        }
    } catch (error) {
        console.error('Error updating project budget:', error);
        return NextResponse.json({ error: 'Failed to budget transaction' }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Quotation approved successfully' }, { status: 200 });


  } catch (error) {
    console.error('Error updating quotation:', error);
    return NextResponse.json({ error: 'Failed to update quotation' }, { status: 500 });
  }


}