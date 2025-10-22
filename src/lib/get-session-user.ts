/**
 * Helper to get the current user ID from NextAuth session
 * Use this in API routes to get the authenticated user ID for audit logging
 */

import { auth } from '@/lib/auth';

/**
 * Get the current authenticated user's ID from the session
 * Returns null if not authenticated
 */
export async function getSessionUserId(): Promise<number | null> {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return null;
    }

    // Convert string ID to number
    const userId = parseInt(session.user.id, 10);
    return isNaN(userId) ? null : userId;
  } catch (error) {
    console.error('Error getting session user ID:', error);
    return null;
  }
}

/**
 * Get the full authenticated user from the session
 * Returns null if not authenticated
 */
export async function getSessionUser() {
  try {
    const session = await auth();
    return session?.user || null;
  } catch (error) {
    console.error('Error getting session user:', error);
    return null;
  }
}
