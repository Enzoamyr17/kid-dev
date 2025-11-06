import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import { withAuditUser } from '@/lib/audit-context';
import { getSessionUserId } from '@/lib/get-session-user';

export async function PATCH(request: NextRequest) {

  try {
    const body = await request.json();
    const { id, projectId, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Quotation ID is required' }, { status: 400 });
    }

    const userId = await getSessionUserId();

    await withAuditUser(userId, async (tx) => {
      const quotation = await tx.quotationForm.update({
        where: { id },
        data: updateData,
      });

      // Update project budget if quotation is approved
      const procurementCategory = await tx.budgetCategory.findFirst({
        where: { projectId: projectId, name: 'Procurement' }
      });

      if(procurementCategory) {
        await tx.budgetCategory.update({
          where: { id: procurementCategory.id },
          data: { budget: Number(quotation.totalCost) },
        });
      } else {
        await tx.budgetCategory.create({
          data: { projectId: projectId, name: 'Procurement', budget: Number(quotation.totalCost), color: '#3b82f6' },
        });
      }

      const budgetCategory = await tx.budgetCategory.findFirst({
        where: { projectId: projectId, name: 'Procurement' },
      });

      const quotationForm = await tx.quotationForm.findUnique({
        where: { id: id },
        include: { quotationItems: { include: { product: true } } },
      });

      if(budgetCategory && quotationForm?.quotationItems) {
        await tx.transaction.createMany({
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
        throw new Error('Procurement category not found');
      }
    });

    return NextResponse.json({ message: 'Quotation approved successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error updating quotation:', error);
    return NextResponse.json({ error: 'Failed to update quotation' }, { status: 500 });
  }
}