import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Calculate occurrences of a recurring expense within a date range
 */
function calculateExpenseOccurrences(
  expense: {
    frequency: string;
    dayOfWeek?: number | null;
    daysOfMonth?: string | null;
    monthOfYear?: number | null;
    specificDate?: Date | null;
    startOfPayment?: Date | null;
    amount: number;
  },
  startDate: Date,
  endDate: Date
): number {
  let occurrences = 0;
  const amount = Number(expense.amount);

  // If startOfPayment is set, use it as the effective start date
  const effectiveStartDate = expense.startOfPayment
    ? new Date(Math.max(new Date(expense.startOfPayment).getTime(), startDate.getTime()))
    : startDate;

  if (expense.frequency === 'one_time') {
    if (expense.specificDate) {
      const expenseDate = new Date(expense.specificDate);
      if (expenseDate >= effectiveStartDate && expenseDate <= endDate) {
        return amount;
      }
    }
    return 0;
  }

  // Calculate months in range
  const monthsInRange: Date[] = [];
  const current = new Date(effectiveStartDate);
  current.setDate(1); // Start from first day of month

  while (current <= endDate) {
    monthsInRange.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  for (const monthStart of monthsInRange) {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();

    switch (expense.frequency) {
      case 'weekly': {
        // Count occurrences of dayOfWeek in this month
        if (expense.dayOfWeek !== null && expense.dayOfWeek !== undefined) {
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            if (
              date.getDay() === expense.dayOfWeek &&
              date >= effectiveStartDate &&
              date <= endDate
            ) {
              occurrences++;
            }
          }
        }
        break;
      }

      case 'twice_monthly': {
        if (expense.daysOfMonth) {
          const days = expense.daysOfMonth.split(',').map((d) => parseInt(d.trim()));
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          for (const day of days) {
            // If day exceeds month's max (e.g., 30 in Feb), use last day of month
            const actualDay = Math.min(day, daysInMonth);
            const date = new Date(year, month, actualDay);
            if (date >= effectiveStartDate && date <= endDate) {
              occurrences++;
            }
          }
        }
        break;
      }

      case 'monthly': {
        if (expense.daysOfMonth) {
          const day = parseInt(expense.daysOfMonth);
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          // If day exceeds month's max (e.g., 30 in Feb), use last day of month
          const actualDay = Math.min(day, daysInMonth);
          const date = new Date(year, month, actualDay);
          if (date >= effectiveStartDate && date <= endDate) {
            occurrences++;
          }
        }
        break;
      }

      case 'quarterly': {
        // Check if this month matches the quarterly schedule
        if (expense.monthOfYear !== null && expense.monthOfYear !== undefined && expense.daysOfMonth) {
          const expenseMonth = expense.monthOfYear; // Store in a const to satisfy TypeScript
          const startMonth = expenseMonth - 1; // 0-indexed
          const currentMonth = month;
          // Check if current month is in the quarter cycle (every 3 months from start)
          if ((currentMonth - startMonth) % 3 === 0 && currentMonth >= startMonth) {
            const day = parseInt(expense.daysOfMonth);
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // If day exceeds month's max (e.g., 30 in Feb), use last day of month
            const actualDay = Math.min(day, daysInMonth);
            const date = new Date(year, month, actualDay);
            if (date >= effectiveStartDate && date <= endDate) {
              occurrences++;
            }
          }
        }
        break;
      }

      case 'yearly': {
        // Check if this month matches the yearly schedule
        if (expense.monthOfYear !== null && expense.monthOfYear !== undefined && expense.daysOfMonth) {
          const expenseMonth = expense.monthOfYear; // Store in a const to satisfy TypeScript
          if (month === expenseMonth - 1) {
            // Month matches
            const day = parseInt(expense.daysOfMonth);
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // If day exceeds month's max (e.g., 30 in Feb), use last day of month
            const actualDay = Math.min(day, daysInMonth);
            const date = new Date(year, month, actualDay);
            if (date >= effectiveStartDate && date <= endDate) {
              occurrences++;
            }
          }
        }
        break;
      }
    }
  }

  return occurrences * amount;
}

// GET - Fetch dashboard metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // Calculate date range
    let startDate: Date;
    let endDate: Date;

    if (year && month) {
      // Specific month
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    } else if (year) {
      // Entire year
      startDate = new Date(parseInt(year), 0, 1);
      endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
    } else {
      // All time - use earliest transaction date or beginning of current year as fallback
      const earliestTransaction = await prisma.transaction.findFirst({
        orderBy: { datePurchased: 'asc' },
        select: { datePurchased: true },
      });
      const earliestProject = await prisma.project.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      const currentYear = new Date().getFullYear();
      const earliestDate = earliestTransaction?.datePurchased || earliestProject?.createdAt || new Date(currentYear, 0, 1);
      startDate = new Date(earliestDate);
      startDate.setMonth(0, 1); // Start from beginning of that year
      endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999); // End of current year
    }

    console.log('[Dashboard API] Date range:', { startDate, endDate, year, month });

    // Fetch ALL project transactions (project expenses) - only completed
    const projectTransactions = await prisma.transaction.findMany({
      where: {
        transactionType: 'project',
        status: 'completed',
        datePurchased: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        project: {
          include: {
            company: true,
          },
        },
        budgetCategory: true,
      },
    });

    // Fetch ALL general transactions - only completed
    const generalTransactions = await prisma.transaction.findMany({
      where: {
        transactionType: 'general',
        status: 'completed',
        datePurchased: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Fetch active company expenses
    const companyExpenses = await prisma.companyExpense.findMany({
      where: {
        isActive: true,
      },
    });

    // Calculate project expenses total
    const projectExpensesTotal = projectTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.cost),
      0
    );

    // Calculate general transactions total
    const generalTransactionsTotal = generalTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.cost),
      0
    );

    // Calculate company expenses based on occurrences in date range
    const companyExpensesTotal = companyExpenses.reduce((sum, expense) => {
      const expenseAmount = calculateExpenseOccurrences(
        {
          frequency: expense.frequency,
          dayOfWeek: expense.dayOfWeek,
          daysOfMonth: expense.daysOfMonth,
          monthOfYear: expense.monthOfYear,
          specificDate: expense.specificDate,
          startOfPayment: expense.startOfPayment,
          amount: Number(expense.amount),
        },
        startDate,
        endDate
      );
      return sum + expenseAmount;
    }, 0);

    // Fetch ALL projects for revenue calculation (using receivable field)
    const allProjects = await prisma.project.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        company: true,
      },
    });

    // Count only active (non-encoded) projects
    const activeProjects = allProjects.filter(p => p.code.startsWith('PROJ'));

    // Calculate revenue (sum of receivable from ALL projects including encoded)
    const revenue = allProjects.reduce(
      (sum, project) => sum + Number(project.receivable || 0),
      0
    );

    // Calculate totals
    const totalExpenses = projectExpensesTotal + generalTransactionsTotal + companyExpensesTotal;
    const grossProfit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // Company Expense breakdown by category (planned company expenses + general transactions)
    const expensesByCategory: Record<string, number> = {};

    // Company expenses by category
    companyExpenses.forEach((expense) => {
      const categoryName = expense.category || 'Uncategorized';
      const expenseAmount = calculateExpenseOccurrences(
        {
          frequency: expense.frequency,
          dayOfWeek: expense.dayOfWeek,
          daysOfMonth: expense.daysOfMonth,
          monthOfYear: expense.monthOfYear,
          specificDate: expense.specificDate,
          startOfPayment: expense.startOfPayment,
          amount: Number(expense.amount),
        },
        startDate,
        endDate
      );
      expensesByCategory[categoryName] =
        (expensesByCategory[categoryName] || 0) + expenseAmount;
    });

    // Add general transactions by category
    generalTransactions.forEach((transaction) => {
      const categoryName = transaction.category || 'Uncategorized';
      expensesByCategory[categoryName] =
        (expensesByCategory[categoryName] || 0) + Number(transaction.cost);
    });

    // Monthly/Yearly breakdown
    const monthlyData: {
      month: number;
      revenue: number;
      projectExpenses: number;
      generalExpenses: number;
      companyExpenses: number;
      totalExpenses: number;
      profit: number;
    }[] = [];

    if (year && !month) {
      // Generate monthly breakdown for the specific year
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(parseInt(year), m, 1);
        const monthEnd = new Date(parseInt(year), m + 1, 0, 23, 59, 59, 999);

        // Project transactions for this month
        const monthProjectTransactions = projectTransactions.filter(
          (t) => t.datePurchased >= monthStart && t.datePurchased <= monthEnd
        );
        const monthProjectExpenses = monthProjectTransactions.reduce(
          (sum, t) => sum + Number(t.cost),
          0
        );

        // General transactions for this month
        const monthGeneralTransactions = generalTransactions.filter(
          (t) => t.datePurchased >= monthStart && t.datePurchased <= monthEnd
        );
        const monthGeneralExpenses = monthGeneralTransactions.reduce(
          (sum, t) => sum + Number(t.cost),
          0
        );

        // Company expenses for this month
        const monthCompanyExpenses = companyExpenses.reduce((sum, expense) => {
          return (
            sum +
            calculateExpenseOccurrences(
              {
                frequency: expense.frequency,
                dayOfWeek: expense.dayOfWeek,
                daysOfMonth: expense.daysOfMonth,
                monthOfYear: expense.monthOfYear,
                specificDate: expense.specificDate,
                startOfPayment: expense.startOfPayment,
                amount: Number(expense.amount),
              },
              monthStart,
              monthEnd
            )
          );
        }, 0);

        // Revenue for this month (include all projects)
        const monthProjects = allProjects.filter(
          (p) => p.createdAt >= monthStart && p.createdAt <= monthEnd
        );
        const monthRevenue = monthProjects.reduce(
          (sum, p) => sum + Number(p.receivable || 0),
          0
        );

        const monthTotalExpenses = monthProjectExpenses + monthGeneralExpenses + monthCompanyExpenses;

        monthlyData.push({
          month: m + 1,
          revenue: monthRevenue,
          projectExpenses: monthProjectExpenses,
          generalExpenses: monthGeneralExpenses,
          companyExpenses: monthCompanyExpenses,
          totalExpenses: monthTotalExpenses,
          profit: monthRevenue - monthTotalExpenses,
        });
      }
    } else if (!year && !month) {
      // All time - Generate yearly breakdown
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      for (let y = startYear; y <= endYear; y++) {
        const yearStart = new Date(y, 0, 1);
        const yearEnd = new Date(y, 11, 31, 23, 59, 59, 999);

        // Project transactions for this year
        const yearProjectTransactions = projectTransactions.filter(
          (t) => t.datePurchased >= yearStart && t.datePurchased <= yearEnd
        );
        const yearProjectExpenses = yearProjectTransactions.reduce(
          (sum, t) => sum + Number(t.cost),
          0
        );

        // General transactions for this year
        const yearGeneralTransactions = generalTransactions.filter(
          (t) => t.datePurchased >= yearStart && t.datePurchased <= yearEnd
        );
        const yearGeneralExpenses = yearGeneralTransactions.reduce(
          (sum, t) => sum + Number(t.cost),
          0
        );

        // Company expenses for this year
        const yearCompanyExpenses = companyExpenses.reduce((sum, expense) => {
          return (
            sum +
            calculateExpenseOccurrences(
              {
                frequency: expense.frequency,
                dayOfWeek: expense.dayOfWeek,
                daysOfMonth: expense.daysOfMonth,
                monthOfYear: expense.monthOfYear,
                specificDate: expense.specificDate,
                startOfPayment: expense.startOfPayment,
                amount: Number(expense.amount),
              },
              yearStart,
              yearEnd
            )
          );
        }, 0);

        // Revenue for this year
        const yearProjects = allProjects.filter(
          (p) => p.createdAt >= yearStart && p.createdAt <= yearEnd
        );
        const yearRevenue = yearProjects.reduce(
          (sum, p) => sum + Number(p.receivable || 0),
          0
        );

        const yearTotalExpenses = yearProjectExpenses + yearGeneralExpenses + yearCompanyExpenses;

        // Use year as "month" field for yearly breakdown (will be handled differently in frontend)
        monthlyData.push({
          month: y, // Store year number instead of month
          revenue: yearRevenue,
          projectExpenses: yearProjectExpenses,
          generalExpenses: yearGeneralExpenses,
          companyExpenses: yearCompanyExpenses,
          totalExpenses: yearTotalExpenses,
          profit: yearRevenue - yearTotalExpenses,
        });
      }
    }

    // Prepare response with debug info
    const metrics = {
      period: {
        year: year ? parseInt(year) : null,
        month: month ? parseInt(month) : null,
        startDate,
        endDate,
      },
      summary: {
        revenue,
        projectExpenses: projectExpensesTotal,
        generalExpenses: generalTransactionsTotal,
        companyExpenses: companyExpensesTotal,
        totalExpenses,
        grossProfit,
        profitMargin,
      },
      expensesByCategory,
      monthlyData: monthlyData.length > 0 ? monthlyData : null,
      projectCount: activeProjects.length, // Only count non-encoded projects (PROJ)
      activeCompanyExpenses: companyExpenses.length,
      // Debug info
      debug: {
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        counts: {
          projectTransactions: projectTransactions.length,
          generalTransactions: generalTransactions.length,
          companyExpenses: companyExpenses.length,
          allProjects: allProjects.length,
        },
      },
    };

    console.log('[Dashboard API] Metrics calculated:', {
      dateRange: { startDate, endDate, year, month },
      revenue,
      projectExpenses: projectExpensesTotal,
      projectTransactionsCount: projectTransactions.length,
      generalExpenses: generalTransactionsTotal,
      generalTransactionsCount: generalTransactions.length,
      companyExpenses: companyExpensesTotal,
      companyExpensesCount: companyExpenses.length,
      totalExpenses,
      grossProfit,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard metrics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
