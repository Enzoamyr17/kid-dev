import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
    console.log('Updating company...');

    try {
        const body = await request.json();
        console.log('Body...', body);
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }

        const company = await prisma.company.update({ where: { id: Number(id) }, data: updateData });
        return NextResponse.json({ message: 'Company updated successfully', data: updateData });
    } catch (error) {
        console.error('Error updating company:', error);
        return NextResponse.json({ error: 'Failed to update company', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}