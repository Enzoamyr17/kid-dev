import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/audit-logs
 * Fetch audit logs with optional filtering
 *
 * Query parameters:
 * - tableName: Filter by specific table
 * - recordId: Filter by specific record ID
 * - action: Filter by action type (INSERT, UPDATE, DELETE)
 * - changedBy: Filter by user ID who made the change
 * - startDate: Filter logs from this date onwards (ISO format)
 * - endDate: Filter logs up to this date (ISO format)
 * - limit: Number of records to return (default: 100, max: 1000)
 * - offset: Number of records to skip for pagination (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract filter parameters
    const tableName = searchParams.get('tableName');
    const recordId = searchParams.get('recordId');
    const action = searchParams.get('action');
    const changedBy = searchParams.get('changedBy');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '100', 10),
      1000
    );
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (tableName) {
      where.tableName = tableName;
    }

    if (recordId) {
      where.recordId = recordId;
    }

    if (action) {
      where.action = action.toUpperCase();
    }

    if (changedBy) {
      where.changedBy = parseInt(changedBy, 10);
    }

    // Date range filtering
    if (startDate || endDate) {
      where.changedAt = {};
      if (startDate) {
        (where.changedAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.changedAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    // Fetch audit logs with pagination
    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Optionally enrich with user information
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        if (log.changedBy) {
          const user = await prisma.user.findUnique({
            where: { id: log.changedBy },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          });

          return {
            ...log,
            user,
          };
        }
        return {
          ...log,
          user: null,
        };
      })
    );

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch audit logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
