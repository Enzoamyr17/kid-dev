import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuditUser } from '@/lib/audit-context';
import { getSessionUserId } from '@/lib/get-session-user';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {

    try {
        const body = await request.json();
        const { id, ...updateData } = body;


        if (!id) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }

        const userId = await getSessionUserId();

        const company = await withAuditUser(userId, async (tx) => {
            return await tx.company.update({ where: { id: Number(id) }, data: updateData });
        });

        return NextResponse.json({ message: 'Company updated successfully', data: updateData });
    } catch (error) {
        console.error('Error updating company:', error);
        return NextResponse.json({ error: 'Failed to update company', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}