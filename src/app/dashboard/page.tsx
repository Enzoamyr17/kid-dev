"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { getColorsForLabels, getColorsForSeries } from "@/lib/chartColors";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface DashboardMetrics {
  period: {
    year: number | null;
    month: number | null;
    startDate: string;
    endDate: string;
  };
  summary: {
    projectIncome: number;
    transactionIncome: number;
    revenue: number;
    projectExpenses: number;
    generalExpenses: number;
    companyExpenses: number;
    companyExpensesProjected: number;
    totalExpenses: number;
    totalExpensesProjected: number;
    grossProfit: number;
    grossProfitProjected: number;
    profitMargin: number;
    profitMarginProjected: number;
    currentFunds: number;
    currentFundsProjected: number;
  };
  expensesByCategory: Record<string, number>;
  monthlyData: {
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
  }[] | null;
  projectCount: number;
  activeCompanyExpenses: number;
  debug?: {
    dateRange: {
      startDate: string;
      endDate: string;
    };
    counts: {
      projectTransactions: number;
      generalTransactions: number;
      companyExpenses: number;
      allProjects: number;
    };
  };
}

interface Transaction {
  id: number;
  transactionType: 'general' | 'project';
  datePurchased: string;
  type: 'Income' | 'Expense';
  projectId: number | null;
  categoryId: number | null;
  category: string | null;
  subCategory: string | null;
  itemDescription: string;
  cost: number;
  status: 'pending' | 'completed';
  remarks: string | null;
  attachment: string | null;
  project: {
    id: number;
    code: string;
    description: string;
  } | null;
  budgetCategory: {
    id: number;
    name: string;
    color: string;
  } | null;
}

interface CompanyExpense {
  id: number;
  name: string;
  amount: number;
  frequency: string;
  dayOfWeek: number | null;
  daysOfMonth: string | null;
  monthOfYear: number | null;
  specificDate: string | null;
  startOfPayment: string | null;
  isActive: boolean;
  category: string | null;
  notes: string | null;
}

const MONTHS = [
  { value: "", label: "All Months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function DashboardPage() {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [earliestYear, setEarliestYear] = useState<number>(currentYear);
  const [latestYear, setLatestYear] = useState<number>(currentYear);

  // Monthly breakdown data (uses the main selectedMonth state)
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [monthExpenses, setMonthExpenses] = useState<CompanyExpense[]>([]);
  const [loadingMonthDetails, setLoadingMonthDetails] = useState(false);
  // Transactions for charts based on current filters (year and optional month)
  const [chartTransactions, setChartTransactions] = useState<Transaction[]>([]);
  const [loadingChartTxns, setLoadingChartTxns] = useState(false);

  // Generate year options dynamically based on earliest and latest years
  const yearOptions = [
    { value: "", label: "All Time" },
    ...Array.from({ length: latestYear - earliestYear + 1 }, (_, i) => {
      const year = latestYear - i;
      return { value: String(year), label: String(year) };
    }),
  ];

  // Fetch earliest and latest years on mount to populate year dropdown
  useEffect(() => {
    const fetchYearRange = async () => {
      try {
        // Fetch earliest transaction and company expense years
        const [transactionsRes, expensesRes] = await Promise.all([
          fetch("/api/transactions"),
          fetch("/api/expenses?active=true"),
        ]);

        let minYear = currentYear;
        let maxYear = currentYear;

        // Check transactions for earliest and latest years
        if (transactionsRes.ok) {
          const transactions = await transactionsRes.json();
          if (transactions.length > 0) {
            const years = transactions.map((t: Transaction) =>
              new Date(t.datePurchased).getFullYear()
            );
            minYear = Math.min(minYear, ...years);
            maxYear = Math.max(maxYear, ...years);
          }
        }

        // Check company expenses for future years
        if (expensesRes.ok) {
          const expenses = await expensesRes.json();
          if (expenses.length > 0) {
            const years = expenses
              .filter((e: CompanyExpense) => e.startOfPayment)
              .map((e: CompanyExpense) => new Date(e.startOfPayment!).getFullYear());
            if (years.length > 0) {
              minYear = Math.min(minYear, ...years);
              maxYear = Math.max(maxYear, ...years);
            }
          }
        }

        setEarliestYear(minYear);
        setLatestYear(maxYear);
      } catch (error) {
        console.error("Error fetching year range:", error);
      }
    };

    fetchYearRange();
  }, [currentYear]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append("year", selectedYear);
      if (selectedMonth) params.append("month", selectedMonth);

      const response = await fetch(`/api/dashboard/metrics?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch metrics");

      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Fetch month details if a specific month is selected
    if (selectedYear && selectedMonth) {
      fetchMonthDetails(selectedMonth);
    } else {
      // Clear month details when viewing all months
      setMonthTransactions([]);
      setMonthExpenses([]);
    }
    // Fetch transactions for charts based on selected filters (year required, month optional)
    const fetchChartTxns = async () => {
      setLoadingChartTxns(true);
      try {
        const params = new URLSearchParams();
        if (selectedYear) params.append("year", selectedYear);
        if (selectedMonth) params.append("month", selectedMonth);
        const url = params.toString() ? `/api/transactions?${params.toString()}` : `/api/transactions`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const txns = await res.json();
        setChartTransactions(txns);
      } catch (e) {
        console.error("Error fetching chart transactions:", e);
        setChartTransactions([]);
      } finally {
        setLoadingChartTxns(false);
      }
    };
    fetchChartTxns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth]);

  const fetchMonthDetails = async (month: string) => {
    if (!selectedYear || !month) return;

    setLoadingMonthDetails(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear,
        month: month,
      });

      // Fetch transactions
      const transactionsResponse = await fetch(`/api/transactions?${params.toString()}`);
      if (!transactionsResponse.ok) throw new Error("Failed to fetch transactions");
      const transactions = await transactionsResponse.json();

      // Fetch active company expenses
      const expensesResponse = await fetch(`/api/expenses?active=true`);
      if (!expensesResponse.ok) throw new Error("Failed to fetch expenses");
      const expenses = await expensesResponse.json();

      setMonthTransactions(transactions);
      setMonthExpenses(expenses);
    } catch (error) {
      console.error("Error fetching month details:", error);
      toast.error("Failed to load month details");
    } finally {
      setLoadingMonthDetails(false);
    }
  };


  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getPeriodLabel = () => {
    if (!selectedYear) return "All Time";
    if (selectedMonth) {
      const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label;
      return `${monthLabel} ${selectedYear}`;
    }
    return selectedYear;
  };

  // Derived chart data: by subcategory (general) and by budget category (project)
  const expenseBreakdownCharts = useMemo(() => {
    const expensesOnly = chartTransactions.filter((t) => (t as Transaction).type === "Expense");
    const generalMap = new Map<string, number>();
    const projectMap = new Map<string, number>();

    for (const t of expensesOnly) {
      if (t.transactionType === "general") {
        const key = (t.subCategory && t.subCategory.trim()) || (t.category || "Uncategorized");
        generalMap.set(key, (generalMap.get(key) || 0) + Number(t.cost || 0));
      } else if (t.transactionType === "project") {
        const key = t.budgetCategory?.name || "Uncategorized";
        projectMap.set(key, (projectMap.get(key) || 0) + Number(t.cost || 0));
      }
    }

    const generalLabels = Array.from(generalMap.keys()).sort();
    const generalValues = generalLabels.map((l) => generalMap.get(l) || 0);
    const generalColors = getColorsForLabels(generalLabels);
    const generalTotal = generalValues.reduce((s, v) => s + v, 0);

    const projectLabels = Array.from(projectMap.keys()).sort();
    const projectValues = projectLabels.map((l) => projectMap.get(l) || 0);
    const projectColors = getColorsForLabels(projectLabels);
    const projectTotal = projectValues.reduce((s, v) => s + v, 0);

    return {
      general: { labels: generalLabels, values: generalValues, colors: generalColors, total: generalTotal },
      project: { labels: projectLabels, values: projectValues, colors: projectColors, total: projectTotal },
    };
  }, [chartTransactions]);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Filters */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Financial overview and expense tracking
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Viewing: <span className="font-semibold">{getPeriodLabel()}</span>
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="w-40">
            <Field
              type="select"
              label="Year"
              options={yearOptions}
              value={selectedYear}
              onChange={(value) => {
                setSelectedYear(value);
                if (!value) setSelectedMonth(""); // Reset month if "All Time" selected
              }}
            />
          </div>
          <div className="w-40">
            <Field
              type="select"
              label="Month"
              options={MONTHS}
              value={selectedMonth}
              onChange={setSelectedMonth}
              disabled={!selectedYear}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </>
      ) : metrics ? (
        <>
          {/* Summary Cards - Row 1: Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Gross Profit / Loss */}
            <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium opacity-90">Gross Profit / Loss</h3>
              <p className="text-xs opacity-80 mb-1">{getPeriodLabel()}</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(metrics?.summary?.grossProfit || 0)}
              </p>
              {metrics?.summary?.grossProfit !== metrics?.summary?.grossProfitProjected && (
                <p className="text-xs opacity-70 mt-2">
                  Projected: {formatCurrency(metrics?.summary?.grossProfitProjected || 0)}
                </p>
              )}
            </div>

            {/* Total Income */}
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium opacity-90">Total Income</h3>
              <p className="text-xs opacity-80 mb-1">{getPeriodLabel()}</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(metrics?.summary?.revenue || 0)}
              </p>
            </div>

            {/* Total Expenses */}
            <div className="bg-gradient-to-br from-red-400 to-red-600 text-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium opacity-90">Total Expenses</h3>
              <p className="text-xs opacity-80 mb-1">{getPeriodLabel()}</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(metrics?.summary?.totalExpenses || 0)}
              </p>
              {metrics?.summary?.totalExpenses !== metrics?.summary?.totalExpensesProjected && (
                <p className="text-xs opacity-70 mt-2">
                  Projected: {formatCurrency(metrics?.summary?.totalExpensesProjected || 0)}
                </p>
              )}
            </div>

            {/* Profit Margin */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Profit Margin</h3>
              <p className="text-xs text-muted-foreground mb-1">{getPeriodLabel()}</p>
              <p className="text-2xl font-bold mt-1">
                {formatPercent(metrics?.summary?.profitMargin || 0)}
              </p>
              {metrics?.summary?.profitMargin !== metrics?.summary?.profitMarginProjected && (
                <p className="text-xs text-muted-foreground mt-2">
                  Projected: {formatPercent(metrics?.summary?.profitMarginProjected || 0)}
                </p>
              )}
            </div>

            {/* Current Funds */}
            <div className={`rounded-lg shadow p-6 ${
              (metrics?.summary?.currentFunds || 0) >= 0
                ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                : 'bg-gradient-to-br from-gray-500 to-gray-700'
            } text-white`}>
              <h3 className="text-sm font-medium opacity-90">Current Funds</h3>
              <p className="text-xs opacity-80 mb-1">All Time Balance</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(metrics?.summary?.currentFunds || 0)}
              </p>
              {metrics?.summary?.currentFunds !== metrics?.summary?.currentFundsProjected && (
                <p className="text-xs opacity-70 mt-2">
                  Projected (EOY): {formatCurrency(metrics?.summary?.currentFundsProjected || 0)}
                </p>
              )}
            </div>
          </div>

          {/* Summary Cards - Row 2: Income & Expense Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Revenue (from Projects) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-emerald-600">Revenue</h3>
              <p className="text-xs text-muted-foreground mb-1">Income from Projects</p>
              <p className="text-2xl font-bold">
                {formatCurrency(metrics?.summary?.projectIncome || 0)}
              </p>
            </div>

            {/* Other Income (from Transactions) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-emerald-600">Other Income</h3>
              <p className="text-xs text-muted-foreground mb-1">Income from Transactions</p>
              <p className="text-2xl font-bold">
                {formatCurrency(metrics?.summary?.transactionIncome || 0)}
              </p>
            </div>

            {/* Project Expenses */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-red-600">Project Expenses</h3>
              <p className="text-xs text-muted-foreground mb-1">Expenses from Projects</p>
              <p className="text-2xl font-bold">
                {formatCurrency(metrics?.summary?.projectExpenses || 0)}
              </p>
            </div>

            {/* General Expenses */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-red-600">General Expenses</h3>
              <p className="text-xs text-muted-foreground mb-1">Transaction Expenses</p>
              <p className="text-2xl font-bold">
                {formatCurrency(metrics?.summary?.generalExpenses || 0)}
              </p>
            </div>

            {/* Company Expenses */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-red-600">Company Expenses</h3>
              <p className="text-xs text-muted-foreground mb-1">From Expense Management</p>
              <p className="text-2xl font-bold">
                {formatCurrency(metrics?.summary?.companyExpenses || 0)}
              </p>
              {metrics?.summary?.companyExpenses !== metrics?.summary?.companyExpensesProjected && (
                <p className="text-xs text-muted-foreground mt-2">
                  Projected: {formatCurrency(metrics?.summary?.companyExpensesProjected || 0)}
                </p>
              )}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Income Types - Pie Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Income Types</h3>
              <div className="w-full h-[400px]">
                <Pie
                  data={{
                    labels: ["Revenue", "Other Income"],
                    datasets: [
                      {
                        data: [
                          metrics?.summary?.projectIncome || 0,
                          metrics?.summary?.transactionIncome || 0,
                        ],
                        backgroundColor: getColorsForLabels(["Revenue", "Other Income"]),
                        borderColor: getColorsForLabels(["Revenue", "Other Income"]),
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "left",
                        labels: { padding: 12, font: { size: 12 }, boxWidth: 12, boxHeight: 12 },
                      },
                      tooltip: {
                        callbacks: {
                          label: function (context) {
                            const label = context.label || "";
                            const value = context.parsed || 0;
                            const total = metrics?.summary?.revenue || 0;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Expense Types - Pie Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Expense Types</h3>
              <div className="w-full h-[400px]">
                <Pie
                  data={{
                    labels: ["Project Expenses", "General Expenses", "Company Expenses"],
                    datasets: [
                      {
                        data: [
                          metrics?.summary?.projectExpenses || 0,
                          metrics?.summary?.generalExpenses || 0,
                          metrics?.summary?.companyExpenses || 0,
                        ],
                        backgroundColor: getColorsForLabels(["Project Expenses", "General Expenses", "Company Expenses"]),
                        borderColor: getColorsForLabels(["Project Expenses", "General Expenses", "Company Expenses"]),
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "left",
                        labels: { padding: 12, font: { size: 12 }, boxWidth: 12, boxHeight: 12 },
                      },
                      tooltip: {
                        callbacks: {
                          label: function (context) {
                            const label = context.label || "";
                            const value = context.parsed || 0;
                            const total = metrics?.summary?.totalExpenses || 0;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Expense Breakdown by Subcategory and Budget Category */}
          {(expenseBreakdownCharts.general.labels.length > 0 || expenseBreakdownCharts.project.labels.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* General - By Subcategory */}
              {expenseBreakdownCharts.general.labels.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">General Transactions - Expenses (By Subcategory)</h3>
                  <div className="w-full h-[400px]">
                    <Pie
                      data={{
                        labels: expenseBreakdownCharts.general.labels,
                        datasets: [
                          {
                            data: expenseBreakdownCharts.general.values,
                            backgroundColor: expenseBreakdownCharts.general.colors,
                            borderColor: expenseBreakdownCharts.general.colors,
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "left",
                            labels: { padding: 12, font: { size: 12 }, boxWidth: 12, boxHeight: 12 },
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const label = context.label || "";
                                const value = context.parsed || 0;
                                const total = expenseBreakdownCharts.general.total;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                              },
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
              {/* Project - By Budget Category */}
              {expenseBreakdownCharts.project.labels.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Project Transactions - Expenses (By Budget Category)</h3>
                  <div className="w-full h-[400px]">
                    <Pie
                      data={{
                        labels: expenseBreakdownCharts.project.labels,
                        datasets: [
                          {
                            data: expenseBreakdownCharts.project.values,
                            backgroundColor: expenseBreakdownCharts.project.colors,
                            borderColor: expenseBreakdownCharts.project.colors,
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "left",
                            labels: { padding: 12, font: { size: 12 }, boxWidth: 12, boxHeight: 12 },
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const label = context.label || "";
                                const value = context.parsed || 0;
                                const total = expenseBreakdownCharts.project.total;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                              },
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            {/* Income vs Expenses Bar Graph */}
            {metrics?.monthlyData && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Income vs Expenses</h3>
                <div className="w-full h-[300px]">
                  <Bar
                    data={{
                      labels: metrics?.monthlyData?.map((data) =>
                        MONTHS.find((m) => m.value === String(data.month))?.label || ""
                      ),
                      datasets: [
                        {
                          label: "Income",
                          data: metrics?.monthlyData?.map((data) => data.revenue) || [],
                          backgroundColor: getColorsForSeries(["Income", "Expenses"]).background[0],
                          borderColor: getColorsForSeries(["Income", "Expenses"]).border[0],
                          borderWidth: 1,
                        },
                        {
                          label: "Expenses",
                          data: metrics?.monthlyData?.map((data) => data.totalExpenses) || [],
                          backgroundColor: getColorsForSeries(["Income", "Expenses"]).background[1],
                          borderColor: getColorsForSeries(["Income", "Expenses"]).border[1],
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: "index",
                        intersect: false,
                      },
                      plugins: {
                        legend: {
                          position: "top",
                          labels: { padding: 12, font: { size: 12 }, boxWidth: 12, boxHeight: 12 },
                        },
                        tooltip: {
                          callbacks: {
                            label: function (context) {
                              const label = context.dataset.label || "";
                              const value = context.parsed.y || 0;
                              return `${label}: ${formatCurrency(value)}`;
                            },
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function (value) {
                              return `₱${Number(value).toLocaleString()}`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Active Projects</span>
                    <span className="font-bold">{metrics?.projectCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="font-medium">Company Expense Items</span>
                    <span className="font-bold">{metrics?.activeCompanyExpenses || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Monthly/Yearly Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              {selectedYear ? "Monthly Breakdown" : "Yearly Breakdown"}
            </h3>

            {/* Summary Table - Always show */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">{selectedYear ? "Month" : "Year"}</th>
                    <th colSpan={3} className="text-center py-2 bg-emerald-50 font-semibold border-l border-r border-emerald-200">Income(Projected)</th>
                    <th colSpan={4} className="text-center py-2 bg-red-50 font-semibold border-l border-r border-red-200">Expenses(Projected)</th>
                    <th className="text-center py-2 font-semibold border-l border-orange-200">Summary</th>
                  </tr>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2"></th>
                    <th className="text-right py-2 bg-emerald-50 px-2 border-l border-emerald-200">Revenue</th>
                    <th className="text-right py-2 bg-emerald-50 px-2">Other Income</th>
                    <th className="text-right py-2 bg-emerald-50 px-2 font-semibold border-r border-emerald-200">Total Income</th>
                    <th className="text-right py-2 bg-red-50 px-2 border-l border-red-200">Project</th>
                    <th className="text-right py-2 bg-red-50 px-2">General</th>
                    <th className="text-right py-2 bg-red-50 px-2">Company</th>
                    <th className="text-right py-2 bg-red-50 px-2 font-semibold border-r border-red-200">Total Expenses</th>
                    <th className="text-right py-2 px-2 font-semibold border-l border-orange-200">Gross Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics?.monthlyData?.map((data) => (
                    <tr
                      key={data.month}
                      className={`border-b ${
                        selectedMonth === String(data.month)
                          ? "bg-orange-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="py-2 px-2 font-medium">
                        {selectedYear
                          ? MONTHS.find((m) => m.value === String(data.month))?.label
                          : data.month}
                      </td>
                      <td className="text-right bg-emerald-50 px-2 border-l border-emerald-200">{formatCurrency(data.projectIncome)}</td>
                      <td className="text-right bg-emerald-50 px-2">{formatCurrency(data.transactionIncome)}</td>
                      <td className="text-right bg-emerald-50 px-2 font-semibold border-r border-emerald-200">{formatCurrency(data.revenue)}</td>
                      <td className="text-right bg-red-50 px-2 border-l border-red-200">{formatCurrency(data.projectExpenses)}</td>
                      <td className="text-right bg-red-50 px-2">{formatCurrency(data.generalExpenses)}</td>
                      <td className="text-right bg-red-50 px-2">
                        <div>{formatCurrency(data.companyExpenses)}</div>
                        {data.companyExpenses !== data.companyExpensesProjected && (
                          <div className="text-xs text-muted-foreground">({formatCurrency(data.companyExpensesProjected)})</div>
                        )}
                      </td>
                      <td className="text-right bg-red-50 px-2 font-semibold border-r border-red-200">
                        <div>{formatCurrency(data.totalExpenses)}</div>
                        {data.totalExpenses !== data.totalExpensesProjected && (
                          <div className="text-xs text-muted-foreground">({formatCurrency(data.totalExpensesProjected)})</div>
                        )}
                      </td>
                      <td className={`text-right px-2 font-semibold border-l border-orange-200 ${data.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        <div>{formatCurrency(data.profit)}</div>
                        {data.profit !== data.profitProjected && (
                          <div className={`text-xs ${data.profitProjected >= 0 ? "text-emerald-600/70" : "text-red-600/70"}`}>
                            ({formatCurrency(data.profitProjected)})
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Month Details View - Show below table when month is selected */}
            {selectedMonth && (
              <div className="border-t pt-6">
                {loadingMonthDetails ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-5 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">Total Transactions</p>
                        <p className="text-2xl font-bold">{monthTransactions.length}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">Income</p>
                        <p className="text-2xl font-bold text-emerald-700">
                          {formatCurrency(
                            monthTransactions
                              .filter((t) => (t as Transaction).type === "Income")
                              .reduce((sum, t) => sum + Number(t.cost), 0)
                          )}
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">Project Expenses</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {formatCurrency(
                            monthTransactions
                              .filter((t) => t.transactionType === "project" && (t as Transaction).type === "Expense")
                              .reduce((sum, t) => sum + Number(t.cost), 0)
                          )}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">General Expenses</p>
                        <p className="text-2xl font-bold bg-green-50 px-1">
                          {formatCurrency(
                            monthTransactions
                              .filter((t) => t.transactionType === "general" && (t as Transaction).type === "Expense")
                              .reduce((sum, t) => sum + Number(t.cost), 0)
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Income Transactions Section */}
                    <div>
                      <h4 className="font-semibold mb-3 text-base text-emerald-700">Income Transactions</h4>
                      {monthTransactions.filter((t) => (t as Transaction).type === "Income").length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-emerald-50">
                                <th className="text-left py-3 px-4">Date</th>
                                <th className="text-left py-3 px-4">Type</th>
                                <th className="text-left py-3 px-4">Description</th>
                                <th className="text-left py-3 px-4">Category/Project</th>
                                <th className="text-right py-3 px-4">Amount</th>
                                <th className="text-center py-3 px-4">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthTransactions
                                .filter((t) => (t as Transaction).type === "Income")
                                .map((transaction) => (
                                  <tr key={transaction.id} className="border-b hover:bg-emerald-50">
                                    <td className="py-3 px-4">
                                      {new Date(transaction.datePurchased).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                          transaction.transactionType === "project"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-green-50 px-1 text-green-800"
                                        }`}
                                      >
                                        {transaction.transactionType === "project" ? "Project" : "General"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">{transaction.itemDescription}</td>
                                    <td className="py-3 px-4">
                                      {transaction.transactionType === "project" ? (
                                        <span className="text-blue-700 font-medium">
                                          {transaction.project?.code || "N/A"}
                                        </span>
                                      ) : (
                                        <span className="bg-green-50 px-1 font-medium">
                                          {transaction.category || "N/A"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="text-right py-3 px-4 font-medium text-emerald-700">
                                      {formatCurrency(Number(transaction.cost))}
                                    </td>
                                    <td className="text-center py-3 px-4">
                                      <span
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                          transaction.status === "completed"
                                            ? "bg-green-50 px-1 text-green-800"
                                            : "bg-yellow-100 text-yellow-800"
                                        }`}
                                      >
                                        {transaction.status === "completed" ? "Completed" : "Pending"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8 bg-gray-50 rounded-lg">
                          No income transactions found for this month
                        </p>
                      )}
                    </div>

                    {/* Expense Transactions Section */}
                    <div>
                      <h4 className="font-semibold mb-3 text-base bg-red-50 px-1">Expense Transactions</h4>
                      {monthTransactions.filter((t) => (t as Transaction).type === "Expense").length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-red-50">
                                <th className="text-left py-3 px-4">Date</th>
                                <th className="text-left py-3 px-4">Type</th>
                                <th className="text-left py-3 px-4">Description</th>
                                <th className="text-left py-3 px-4">Category/Project</th>
                                <th className="text-right py-3 px-4">Amount</th>
                                <th className="text-center py-3 px-4">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthTransactions
                                .filter((t) => (t as Transaction).type === "Expense")
                                .map((transaction) => (
                                  <tr key={transaction.id} className="border-b hover:bg-red-50">
                                    <td className="py-3 px-4">
                                      {new Date(transaction.datePurchased).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                          transaction.transactionType === "project"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-green-50 px-1 text-green-800"
                                        }`}
                                      >
                                        {transaction.transactionType === "project" ? "Project" : "General"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">{transaction.itemDescription}</td>
                                    <td className="py-3 px-4">
                                      {transaction.transactionType === "project" ? (
                                        <span className="text-blue-700 font-medium">
                                          {transaction.project?.code || "N/A"}
                                        </span>
                                      ) : (
                                        <span className="bg-green-50 px-1 font-medium">
                                          {transaction.category || "N/A"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="text-right py-3 px-4 font-medium bg-red-50 px-1">
                                      {formatCurrency(Number(transaction.cost))}
                                    </td>
                                    <td className="text-center py-3 px-4">
                                      <span
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                          transaction.status === "completed"
                                            ? "bg-green-50 px-1 text-green-800"
                                            : "bg-yellow-100 text-yellow-800"
                                        }`}
                                      >
                                        {transaction.status === "completed" ? "Completed" : "Pending"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8 bg-gray-50 rounded-lg">
                          No expense transactions found for this month
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No data available</p>
        </div>
      )}
    </div>
  );
}
