/**
 * Audit Context Helper
 *
 * This module provides utilities to set user context for database audit logging.
 * When you set the audit user before performing database operations, the PostgreSQL
 * triggers will automatically capture who made the changes.
 *
 * Usage in API routes:
 *
 * import { setAuditUser, clearAuditUser, withAuditUser } from '@/lib/audit-context';
 *
 * // Option 1: Manual set/clear
 * await setAuditUser(userId);
 * const result = await prisma.product.update({ ... });
 * await clearAuditUser();
 *
 * // Option 2: Automatic with callback (recommended)
 * const result = await withAuditUser(userId, async () => {
 *   return await prisma.product.update({ ... });
 * });
 */

import { prisma } from './db';

/**
 * Set the current user ID for audit logging
 * This sets a PostgreSQL session variable that the audit triggers will read
 *
 * @param userId - The ID of the user making the changes
 */
export async function setAuditUser(userId: number | null): Promise<void> {
  if (userId === null) {
    await clearAuditUser();
    return;
  }

  try {
    await prisma.$executeRawUnsafe(
      `SELECT set_config('audit.user_id', '${userId}', false)`
    );
  } catch (error) {
    console.error('Failed to set audit user context:', error);
    // Don't throw - we don't want to break the main operation if audit context fails
  }
}

/**
 * Clear the audit user context
 * This resets the PostgreSQL session variable
 */
export async function clearAuditUser(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `SELECT set_config('audit.user_id', NULL, false)`
    );
  } catch (error) {
    console.error('Failed to clear audit user context:', error);
    // Don't throw - we don't want to break the main operation if audit context fails
  }
}

/**
 * Execute a callback with audit user context
 * Automatically sets and clears the user context
 *
 * @param userId - The ID of the user making the changes
 * @param callback - The async function to execute with the audit context
 * @returns The result of the callback
 *
 * @example
 * const product = await withAuditUser(req.userId, async () => {
 *   return await prisma.product.create({
 *     data: { name: 'New Product', ... }
 *   });
 * });
 */
export async function withAuditUser<T>(
  userId: number | null,
  callback: () => Promise<T>
): Promise<T> {
  await setAuditUser(userId);
  try {
    return await callback();
  } finally {
    await clearAuditUser();
  }
}

/**
 * Get the current audit user ID from the session
 * Useful for debugging or verification
 *
 * @returns The current user ID or null if not set
 */
export async function getAuditUser(): Promise<number | null> {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ current_setting: string }>>(
      `SELECT current_setting('audit.user_id', true) as current_setting`
    );

    if (result && result[0] && result[0].current_setting) {
      const userId = parseInt(result[0].current_setting, 10);
      return isNaN(userId) ? null : userId;
    }

    return null;
  } catch (error) {
    console.error('Failed to get audit user context:', error);
    return null;
  }
}
