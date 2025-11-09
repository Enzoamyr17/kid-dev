import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Calculate occurrences of a recurring expense within a date range (ACTUAL - only up to today)
 */
function calculateExpenseOccurrences(
  expense: {
    frequency: string;
    dayOfWeek?: number | null;
    daysOfMonth?: string | null;
    monthOfYear?: number | null;
    specificDate?: Date | null;
    startOfPayment?: Date | null;
    endOfPayment?: Date | null;
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

  // Only count expenses that have actually occurred (up to today)
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Include all of today

  // If endOfPayment is set, use the earlier of: endOfPayment, today, or query endDate
  // If not set, use the earlier of: today or query endDate
  const effectiveEndDate = expense.endOfPayment
    ? new Date(Math.min(new Date(expense.endOfPayment).getTime(), today.getTime(), endDate.getTime()))
    : new Date(Math.min(today.getTime(), endDate.getTime()));

  if (expense.frequency === 'one_time') {
    if (expense.specificDate) {
      const expenseDate = new Date(expense.specificDate);
      if (expenseDate >= effectiveStartDate && expenseDate <= effectiveEndDate) {
        return amount;
      }
    }
    return 0;
  }

  // Calculate months in range
  const monthsInRange: Date[] = [];
  const current = new Date(effectiveStartDate);
  current.setDate(1); // Start from first day of month

  while (current <= effectiveEndDate) {
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
              date <= effectiveEndDate
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
            if (date >= effectiveStartDate && date <= effectiveEndDate) {
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
          if (date >= effectiveStartDate && date <= effectiveEndDate) {
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
            if (date >= effectiveStartDate && date <= effectiveEndDate) {
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
            if (date >= effectiveStartDate && date <= effectiveEndDate) {
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

/**
 * Calculate occurrences of a recurring expense within a date range (PROJECTED - full period, no today limit)
 */
function calculateExpenseOccurrencesProjected(
  expense: {
    frequency: string;
    dayOfWeek?: number | null;
    daysOfMonth?: string | null;
    monthOfYear?: number | null;
    specificDate?: Date | null;
    startOfPayment?: Date | null;
    endOfPayment?: Date | null;
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

  // For projected: use endOfPayment if set, otherwise use query endDate (no today limit)
  const effectiveEndDate = expense.endOfPayment
    ? new Date(Math.min(new Date(expense.endOfPayment).getTime(), endDate.getTime()))
    : endDate;

  if (expense.frequency === 'one_time') {
    if (expense.specificDate) {
      const expenseDate = new Date(expense.specificDate);
      if (expenseDate >= effectiveStartDate && expenseDate <= effectiveEndDate) {
        return amount;
      }
    }
    return 0;
  }

  // Calculate months in range
  const monthsInRange: Date[] = [];
  const current = new Date(effectiveStartDate);
  current.setDate(1); // Start from first day of month

  while (current <= effectiveEndDate) {
    monthsInRange.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  for (const monthStart of monthsInRange) {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();

    switch (expense.frequency) {
      case 'weekly': {
        if (expense.dayOfWeek !== null && expense.dayOfWeek !== undefined) {
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            if (
              date.getDay() === expense.dayOfWeek &&
              date >= effectiveStartDate &&
              date <= effectiveEndDate
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
            const actualDay = Math.min(day, daysInMonth);
            const date = new Date(year, month, actualDay);
            if (date >= effectiveStartDate && date <= effectiveEndDate) {
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

          const actualDay = Math.min(day, daysInMonth);
          const date = new Date(year, month, actualDay);
          if (date >= effectiveStartDate && date <= effectiveEndDate) {
            occurrences++;
          }
        }
        break;
      }

      case 'quarterly': {
        if (expense.monthOfYear !== null && expense.monthOfYear !== undefined && expense.daysOfMonth) {
          const expenseMonth = expense.monthOfYear;
          const startMonth = expenseMonth - 1;
          const currentMonth = month;
          if ((currentMonth - startMonth) % 3 === 0 && currentMonth >= startMonth) {
            const day = parseInt(expense.daysOfMonth);
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            const actualDay = Math.min(day, daysInMonth);
            const date = new Date(year, month, actualDay);
            if (date >= effectiveStartDate && date <= effectiveEndDate) {
              occurrences++;
            }
          }
        }
        break;
      }

      case 'yearly': {
        if (expense.monthOfYear !== null && expense.monthOfYear !== undefined && expense.daysOfMonth) {
          const expenseMonth = expense.monthOfYear;
          if (month === expenseMonth - 1) {
            const day = parseInt(expense.daysOfMonth);
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            const actualDay = Math.min(day, daysInMonth);
            const date = new Date(year, month, actualDay);
            if (date >= effectiveStartDate && date <= effectiveEndDate) {
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

      // Also check for latest transaction and future company expenses
      const latestTransaction = await prisma.transaction.findFirst({
        orderBy: { datePurchased: 'desc' },
        select: { datePurchased: true },
      });
      const latestCompanyExpense = await prisma.companyExpense.findFirst({
        where: { isActive: true },
        orderBy: { startOfPayment: 'desc' },
        select: { startOfPayment: true },
      });

      const currentYear = new Date().getFullYear();
      const earliestDate = earliestTransaction?.datePurchased || earliestProject?.createdAt || new Date(currentYear, 0, 1);
      startDate = new Date(earliestDate);
      startDate.setMonth(0, 1); // Start from beginning of that year

      // Set end date to the later of: current year, latest transaction year, or latest company expense start year
      const latestTransactionYear = latestTransaction ? new Date(latestTransaction.datePurchased).getFullYear() : currentYear;
      const latestExpenseYear = latestCompanyExpense && latestCompanyExpense.startOfPayment
        ? new Date(latestCompanyExpense.startOfPayment).getFullYear()
        : currentYear;
      const maxYear = Math.max(currentYear, latestTransactionYear, latestExpenseYear);
      endDate = new Date(maxYear, 11, 31, 23, 59, 59, 999);
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

    // Fetch ALL general transactions - only completed EXPENSES
    const generalTransactions = await prisma.transaction.findMany({
      where: {
        transactionType: 'general',
        type: 'Expense',
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
          endOfPayment: expense.endOfPayment,
          amount: Number(expense.amount),
        },
        startDate,
        endDate
      );
      return sum + expenseAmount;
    }, 0);

    // Calculate PROJECTED company expenses (full period, no today limit)
    const companyExpensesProjected = companyExpenses.reduce((sum, expense) => {
      const expenseAmount = calculateExpenseOccurrencesProjected(
        {
          frequency: expense.frequency,
          dayOfWeek: expense.dayOfWeek,
          daysOfMonth: expense.daysOfMonth,
          monthOfYear: expense.monthOfYear,
          specificDate: expense.specificDate,
          startOfPayment: expense.startOfPayment,
          endOfPayment: expense.endOfPayment,
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

    // Calculate project income (sum of receivable from ALL projects including encoded)
    const projectIncome = allProjects.reduce(
      (sum, project) => sum + Number(project.receivable || 0),
      0
    );

    // Calculate transaction income (sum of income transactions)
    const incomeTransactions = await prisma.transaction.findMany({
      where: {
        type: 'Income',
        datePurchased: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const transactionIncome = incomeTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.cost),
      0
    );

    // Calculate total revenue
    const revenue = projectIncome + transactionIncome;

    // Calculate totals (actual)
    const totalExpenses = projectExpensesTotal + generalTransactionsTotal + companyExpensesTotal;
    const grossProfit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // Calculate projected totals
    const totalExpensesProjected = projectExpensesTotal + generalTransactionsTotal + companyExpensesProjected;
    const grossProfitProjected = revenue - totalExpensesProjected;
    const profitMarginProjected = revenue > 0 ? (grossProfitProjected / revenue) * 100 : 0;

    // Calculate Current Funds (all-time cumulative balance)
    // Fetch ALL income and expenses regardless of date filter
    const allTimeProjects = await prisma.project.findMany({
      select: { receivable: true },
    });
    const allTimeProjectIncome = allTimeProjects.reduce(
      (sum, project) => sum + Number(project.receivable || 0),
      0
    );

    const allTimeIncomeTransactions = await prisma.transaction.findMany({
      where: { type: 'Income' },
      select: { cost: true },
    });
    const allTimeTransactionIncome = allTimeIncomeTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.cost),
      0
    );

    const allTimeProjectTransactions = await prisma.transaction.findMany({
      where: {
        transactionType: 'project',
        type: 'Expense',
        status: 'completed',
      },
      select: { cost: true },
    });
    const allTimeProjectExpenses = allTimeProjectTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.cost),
      0
    );

    const allTimeGeneralTransactions = await prisma.transaction.findMany({
      where: {
        transactionType: 'general',
        type: 'Expense',
        status: 'completed',
      },
      select: { cost: true },
    });
    const allTimeGeneralExpenses = allTimeGeneralTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.cost),
      0
    );

    // Calculate all-time company expenses (from beginning of time to now)
    const allTimeStartDate = new Date(2000, 0, 1); // Arbitrary early date
    const now = new Date();
    const allTimeCompanyExpenses = companyExpenses.reduce((sum, expense) => {
      const expenseAmount = calculateExpenseOccurrences(
        {
          frequency: expense.frequency,
          dayOfWeek: expense.dayOfWeek,
          daysOfMonth: expense.daysOfMonth,
          monthOfYear: expense.monthOfYear,
          specificDate: expense.specificDate,
          startOfPayment: expense.startOfPayment,
          endOfPayment: expense.endOfPayment,
          amount: Number(expense.amount),
        },
        allTimeStartDate,
        now
      );
      return sum + expenseAmount;
    }, 0);

    const allTimeTotalIncome = allTimeProjectIncome + allTimeTransactionIncome;
    const allTimeTotalExpenses = allTimeProjectExpenses + allTimeGeneralExpenses + allTimeCompanyExpenses;
    const currentFunds = allTimeTotalIncome - allTimeTotalExpenses;

    // Calculate projected current funds (all-time income - projected expenses up to end of year)
    const currentYear = new Date().getFullYear();
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    const allTimeCompanyExpensesProjected = companyExpenses.reduce((sum, expense) => {
      const expenseAmount = calculateExpenseOccurrencesProjected(
        {
          frequency: expense.frequency,
          dayOfWeek: expense.dayOfWeek,
          daysOfMonth: expense.daysOfMonth,
          monthOfYear: expense.monthOfYear,
          specificDate: expense.specificDate,
          startOfPayment: expense.startOfPayment,
          endOfPayment: expense.endOfPayment,
          amount: Number(expense.amount),
        },
        allTimeStartDate,
        endOfYear
      );
      return sum + expenseAmount;
    }, 0);
    const allTimeTotalExpensesProjected = allTimeProjectExpenses + allTimeGeneralExpenses + allTimeCompanyExpensesProjected;
    const currentFundsProjected = allTimeTotalIncome - allTimeTotalExpensesProjected;

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
          endOfPayment: expense.endOfPayment,
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
      projectIncome: number;
      transactionIncome: number;
      revenue: number;
      projectExpenses: number;
      generalExpenses: number;
      companyExpenses: number;
      companyExpensesProjected: number;
      totalExpenses: number;
      totalExpensesProjected: number;
      profit: number;
      profitProjected: number;
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

        // Company expenses for this month (ACTUAL - only occurred)
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
                endOfPayment: expense.endOfPayment,
                amount: Number(expense.amount),
              },
              monthStart,
              monthEnd
            )
          );
        }, 0);

        // Company expenses for this month (PROJECTED - full month)
        const monthCompanyExpensesProjected = companyExpenses.reduce((sum, expense) => {
          return (
            sum +
            calculateExpenseOccurrencesProjected(
              {
                frequency: expense.frequency,
                dayOfWeek: expense.dayOfWeek,
                daysOfMonth: expense.daysOfMonth,
                monthOfYear: expense.monthOfYear,
                specificDate: expense.specificDate,
                startOfPayment: expense.startOfPayment,
                endOfPayment: expense.endOfPayment,
                amount: Number(expense.amount),
              },
              monthStart,
              monthEnd
            )
          );
        }, 0);

        // Project income for this month (include all projects)
        const monthProjects = allProjects.filter(
          (p) => p.createdAt >= monthStart && p.createdAt <= monthEnd
        );
        const monthProjectIncome = monthProjects.reduce(
          (sum, p) => sum + Number(p.receivable || 0),
          0
        );

        // Transaction income for this month
        const monthIncomeTransactions = incomeTransactions.filter(
          (t) => t.datePurchased >= monthStart && t.datePurchased <= monthEnd
        );
        const monthTransactionIncome = monthIncomeTransactions.reduce(
          (sum, t) => sum + Number(t.cost),
          0
        );

        const monthRevenue = monthProjectIncome + monthTransactionIncome;
        const monthTotalExpenses = monthProjectExpenses + monthGeneralExpenses + monthCompanyExpenses;
        const monthTotalExpensesProjected = monthProjectExpenses + monthGeneralExpenses + monthCompanyExpensesProjected;

        monthlyData.push({
          month: m + 1,
          projectIncome: monthProjectIncome,
          transactionIncome: monthTransactionIncome,
          revenue: monthRevenue,
          projectExpenses: monthProjectExpenses,
          generalExpenses: monthGeneralExpenses,
          companyExpenses: monthCompanyExpenses,
          companyExpensesProjected: monthCompanyExpensesProjected,
          totalExpenses: monthTotalExpenses,
          totalExpensesProjected: monthTotalExpensesProjected,
          profit: monthRevenue - monthTotalExpenses,
          profitProjected: monthRevenue - monthTotalExpensesProjected,
        });
      }
    } else if (!year && !month) {
      // All time - Generate yearly breakdown in reverse chronological order
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      for (let y = endYear; y >= startYear; y--) {
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

        // Company expenses for this year (ACTUAL)
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
                endOfPayment: expense.endOfPayment,
                amount: Number(expense.amount),
              },
              yearStart,
              yearEnd
            )
          );
        }, 0);

        // Company expenses for this year (PROJECTED)
        const yearCompanyExpensesProjected = companyExpenses.reduce((sum, expense) => {
          return (
            sum +
            calculateExpenseOccurrencesProjected(
              {
                frequency: expense.frequency,
                dayOfWeek: expense.dayOfWeek,
                daysOfMonth: expense.daysOfMonth,
                monthOfYear: expense.monthOfYear,
                specificDate: expense.specificDate,
                startOfPayment: expense.startOfPayment,
                endOfPayment: expense.endOfPayment,
                amount: Number(expense.amount),
              },
              yearStart,
              yearEnd
            )
          );
        }, 0);

        // Project income for this year
        const yearProjects = allProjects.filter(
          (p) => p.createdAt >= yearStart && p.createdAt <= yearEnd
        );
        const yearProjectIncome = yearProjects.reduce(
          (sum, p) => sum + Number(p.receivable || 0),
          0
        );

        // Transaction income for this year
        const yearIncomeTransactions = incomeTransactions.filter(
          (t) => t.datePurchased >= yearStart && t.datePurchased <= yearEnd
        );
        const yearTransactionIncome = yearIncomeTransactions.reduce(
          (sum, t) => sum + Number(t.cost),
          0
        );

        const yearRevenue = yearProjectIncome + yearTransactionIncome;
        const yearTotalExpenses = yearProjectExpenses + yearGeneralExpenses + yearCompanyExpenses;
        const yearTotalExpensesProjected = yearProjectExpenses + yearGeneralExpenses + yearCompanyExpensesProjected;

        // Use year as "month" field for yearly breakdown (will be handled differently in frontend)
        monthlyData.push({
          month: y, // Store year number instead of month
          projectIncome: yearProjectIncome,
          transactionIncome: yearTransactionIncome,
          revenue: yearRevenue,
          projectExpenses: yearProjectExpenses,
          generalExpenses: yearGeneralExpenses,
          companyExpenses: yearCompanyExpenses,
          companyExpensesProjected: yearCompanyExpensesProjected,
          totalExpenses: yearTotalExpenses,
          totalExpensesProjected: yearTotalExpensesProjected,
          profit: yearRevenue - yearTotalExpenses,
          profitProjected: yearRevenue - yearTotalExpensesProjected,
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
        projectIncome,
        transactionIncome,
        revenue,
        projectExpenses: projectExpensesTotal,
        generalExpenses: generalTransactionsTotal,
        companyExpenses: companyExpensesTotal,
        companyExpensesProjected,
        totalExpenses,
        totalExpensesProjected,
        grossProfit,
        grossProfitProjected,
        profitMargin,
        profitMarginProjected,
        currentFunds,
        currentFundsProjected,
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
