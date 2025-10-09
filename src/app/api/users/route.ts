import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to convert BigInt to string
function serializeUser(user: { id: bigint; [key: string]: unknown }) {
  return {
    ...user,
    id: user.id.toString(),
  };
}

// GET - Fetch all users (for requestor dropdown)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        firstName: 'asc',
      },
    });

    const serializedUsers = users.map(serializeUser);
    return NextResponse.json(serializedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
