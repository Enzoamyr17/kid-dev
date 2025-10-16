import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to serialize user data
function serializeUser(user: { id: number; [key: string]: unknown }) {
  return {
    ...user,
    id: user.id,
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
