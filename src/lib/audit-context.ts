/**
 * Audit Context Helper
 *
 * This module provides utilities to set user context for database audit logging.
 * When you set the audit user before performing database operations, the PostgreSQL
 * triggers will automatically capture who made the changes.
 *
 * Usage in API routes:
 *
 * import { withAuditUser } from '@/lib/audit-context';
 *
 * // Recommended: Automatic with callback (uses transaction to ensure same connection)
 * const result = await withAuditUser(userId, async (tx) => {
 *   return await tx.product.update({ ... });
 * });
 */

import { prisma } from './db';
import { Prisma } from '@prisma/client';

/**
 * Execute a callback with audit user context using a transaction
 * This ensures all operations use the same database connection
 *
 * IMPORTANT: The callback receives a transaction client (tx) that MUST be used
 * for all database operations to ensure the audit context is preserved.
 *
 * @param userId - The ID of the user making the changes (null for system operations)
 * @param callback - The async function to execute with the audit context
 * @returns The result of the callback
 *
 * @example
 * const product = await withAuditUser(userId, async (tx) => {
 *   return await tx.product.create({
 *     data: { name: 'New Product', sku: 'SKU001' }
 *   });
 * });
 *
 * @example Multiple operations in one transaction
 * await withAuditUser(userId, async (tx) => {
 *   await tx.product.create({ data: { ... } });
 *   await tx.productPrice.create({ data: { ... } });
 *   return { success: true };
 * });
 */
export async function withAuditUser<T>(
  userId: number | null,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    try {
      // Set the audit user context for this connection/transaction
      if (userId !== null) {
        await tx.$executeRaw`SELECT set_config('audit.user_id', ${userId.toString()}, false)`;
      }

      // Execute the callback with the transaction client
      return await callback(tx);
    } catch (error) {
      // Log error but re-throw to allow proper transaction rollback
      console.error('Error in audit context transaction:', error);
      throw error;
    } finally {
      // Clear the audit context (optional, as transaction will close anyway)
      try {
        await tx.$executeRaw`SELECT set_config('audit.user_id', '', true)`;
      } catch (clearError) {
        // Ignore clear errors as transaction is ending
        console.error('Failed to clear audit context (non-critical):', clearError);
      }
    }
  });
}

/**
 * Get the current audit user ID from the session
 * Useful for debugging or verification
 *
 * @returns The current user ID or null if not set
 */
export async function getAuditUser(): Promise<number | null> {
  try {
    const result = await prisma.$queryRaw<Array<{ current_setting: string }>>`
      SELECT current_setting('audit.user_id', true) as current_setting
    `;

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
