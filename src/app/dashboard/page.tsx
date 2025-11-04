"use client";

import React, { useState, useEffect } from "react";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from "chart.js";
import { Pie, Bar } from "react-chartjs-2";

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
    revenue: number;
    projectExpenses: number;
    generalExpenses: number;
    companyExpenses: number;
    totalExpenses: number;
    grossProfit: number;
    profitMargin: number;
  };
  expensesByCategory: Record<string, number>;
  monthlyData: {
    month: number;
    revenue: number;
    projectExpenses: number;
    generalExpenses: number;
    companyExpenses: number;
    totalExpenses: number;
    profit: number;
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

  // Monthly breakdown data (uses the main selectedMonth state)
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [monthExpenses, setMonthExpenses] = useState<CompanyExpense[]>([]);
  const [loadingMonthDetails, setLoadingMonthDetails] = useState(false);

  // Generate year options (current year and past 10 years)
  const yearOptions = [
    { value: "", label: "All Time" },
    ...Array.from({ length: 11 }, (_, i) => {
      const year = currentYear - i;
      return { value: String(year), label: String(year) };
    }),
  ];

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      ) : metrics ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gross Profit */}
            <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium opacity-90">Gross Profit</h3>
              <p className="text-2xl font-bold mt-2">
                {formatCurrency(metrics.summary.grossProfit)}
              </p>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Revenue</h3>
              <p className="text-2xl font-bold mt-2">
                {formatCurrency(metrics.summary.revenue)}
              </p>
            </div>

            {/* Total Expenses */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
              <p className="text-2xl font-bold mt-2">
                {formatCurrency(metrics.summary.totalExpenses)}
              </p>
            </div>

            {/* Profit Margin */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Profit Margin</h3>
              <p className="text-2xl font-bold mt-2">
                {formatPercent(metrics.summary.profitMargin)}
              </p>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expense Types - Pie Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Expense Types</h3>
              <div className="flex flex-col items-center">
                <div className="w-full max-w-xs">
                  <Pie
                    data={{
                      labels: ["Project Expenses", "General Expenses", "Company Expenses"],
                      datasets: [
                        {
                          data: [
                            metrics.summary.projectExpenses,
                            metrics.summary.generalExpenses,
                            metrics.summary.companyExpenses,
                          ],
                          backgroundColor: [
                            "rgb(59, 130, 246)", // blue-500
                            "rgb(34, 197, 94)", // green-500
                            "rgb(168, 85, 247)", // purple-500
                          ],
                          borderColor: [
                            "rgb(59, 130, 246)",
                            "rgb(34, 197, 94)",
                            "rgb(168, 85, 247)",
                          ],
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: "bottom",
                          labels: {
                            padding: 15,
                            font: {
                              size: 12,
                            },
                          },
                        },
                        tooltip: {
                          callbacks: {
                            label: function (context) {
                              const label = context.label || "";
                              const value = context.parsed || 0;
                              return `${label}: ${formatCurrency(value)}`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
                <div className="mt-6 pt-6 border-t w-full">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Active Projects</span>
                    <span className="font-bold">{metrics.projectCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="font-medium">Planned Company Expenses</span>
                    <span className="font-bold">{metrics.activeCompanyExpenses}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Income vs Expenses Bar Graph */}
            {metrics.monthlyData && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Income vs Expenses</h3>
                <Bar
                  data={{
                    labels: metrics.monthlyData.map((data) =>
                      MONTHS.find((m) => m.value === String(data.month))?.label || ""
                    ),
                    datasets: [
                      {
                        label: "Income",
                        data: metrics.monthlyData.map((data) => data.revenue),
                        backgroundColor: "rgb(34, 197, 94)", // green-500
                        borderColor: "rgb(34, 197, 94)",
                        borderWidth: 1,
                      },
                      {
                        label: "Total Expenses",
                        data: metrics.monthlyData.map((data) => data.totalExpenses),
                        backgroundColor: "rgb(239, 68, 68)", // red-500
                        borderColor: "rgb(239, 68, 68)",
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    interaction: {
                      mode: "index",
                      intersect: false,
                    },
                    plugins: {
                      legend: {
                        position: "top",
                        labels: {
                          padding: 15,
                          font: {
                            size: 12,
                          },
                        },
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
                    <th className="text-left py-2">{selectedYear ? "Month" : "Year"}</th>
                    <th className="text-right py-2">Revenue</th>
                    <th className="text-right py-2">Project</th>
                    <th className="text-right py-2">General</th>
                    <th className="text-right py-2">Company</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.monthlyData?.map((data) => (
                    <tr
                      key={data.month}
                      className={`border-b ${
                        selectedMonth === String(data.month)
                          ? "bg-orange-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="py-2 font-medium">
                        {selectedYear
                          ? MONTHS.find((m) => m.value === String(data.month))?.label
                          : data.month}
                      </td>
                      <td className="text-right">{formatCurrency(data.revenue)}</td>
                      <td className="text-right">{formatCurrency(data.projectExpenses)}</td>
                      <td className="text-right">{formatCurrency(data.generalExpenses)}</td>
                      <td className="text-right">{formatCurrency(data.companyExpenses)}</td>
                      <td className="text-right">{formatCurrency(data.totalExpenses)}</td>
                      <td
                        className={`text-right font-semibold ${
                          data.profit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(data.profit)}
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
                  <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">Transactions</p>
                        <p className="text-2xl font-bold">{monthTransactions.length}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">Project Expenses</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {formatCurrency(
                            monthTransactions
                              .filter((t) => t.transactionType === "project")
                              .reduce((sum, t) => sum + Number(t.cost), 0)
                          )}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">General Expenses</p>
                        <p className="text-2xl font-bold text-green-700">
                          {formatCurrency(
                            monthTransactions
                              .filter((t) => t.transactionType === "general")
                              .reduce((sum, t) => sum + Number(t.cost), 0)
                          )}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">Company Expenses</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {formatCurrency(
                            monthExpenses.reduce((sum, e) => {
                              const amount = Number(e.amount);
                              // Calculate occurrences per month based on frequency
                              let multiplier = 1;
                              if (e.frequency === 'weekly') multiplier = 4;
                              else if (e.frequency === 'twice_monthly') multiplier = 2;
                              else if (e.frequency === 'monthly') multiplier = 1;
                              else if (e.frequency === 'quarterly') multiplier = 1/3;
                              else if (e.frequency === 'yearly') multiplier = 1/12;
                              else if (e.frequency === 'one_time') multiplier = 0; // Don't count one-time in monthly total
                              return sum + (amount * multiplier);
                            }, 0)
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Transactions Section */}
                    <div>
                      <h4 className="font-semibold mb-3 text-base">Transactions</h4>
                      {monthTransactions.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left py-3 px-4">Date</th>
                                <th className="text-left py-3 px-4">Type</th>
                                <th className="text-left py-3 px-4">Description</th>
                                <th className="text-left py-3 px-4">Category/Project</th>
                                <th className="text-right py-3 px-4">Amount</th>
                                <th className="text-center py-3 px-4">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthTransactions.map((transaction) => (
                                <tr key={transaction.id} className="border-b hover:bg-gray-50">
                                  <td className="py-3 px-4">
                                    {new Date(transaction.datePurchased).toLocaleDateString()}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                        transaction.transactionType === "project"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-green-100 text-green-800"
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
                                      <span className="text-green-700 font-medium">
                                        {transaction.category || "N/A"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-right py-3 px-4 font-medium">
                                    {formatCurrency(Number(transaction.cost))}
                                  </td>
                                  <td className="text-center py-3 px-4">
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                        transaction.status === "completed"
                                          ? "bg-green-100 text-green-800"
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
                          No transactions found for this month
                        </p>
                      )}
                    </div>

                    {/* Company Expenses Section */}
                    <div>
                      <h4 className="font-semibold mb-3 text-base">Active Company Expenses</h4>
                      {monthExpenses.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left py-3 px-4">Name</th>
                                <th className="text-left py-3 px-4">Category</th>
                                <th className="text-left py-3 px-4">Frequency</th>
                                <th className="text-right py-3 px-4">Amount</th>
                                <th className="text-left py-3 px-4">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthExpenses.map((expense) => (
                                <tr key={expense.id} className="border-b hover:bg-gray-50">
                                  <td className="py-3 px-4 font-medium">{expense.name}</td>
                                  <td className="py-3 px-4">
                                    {expense.category ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                        {expense.category}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">N/A</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 capitalize">
                                    {expense.frequency.replace(/_/g, " ")}
                                  </td>
                                  <td className="text-right py-3 px-4 font-medium">
                                    {formatCurrency(Number(expense.amount))}
                                  </td>
                                  <td className="py-3 px-4 text-muted-foreground">
                                    {expense.notes || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8 bg-gray-50 rounded-lg">
                          No active company expenses
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Debug Info */}
          {metrics?.debug && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <h3 className="text-sm font-semibold mb-2 text-yellow-800">Debug Information</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-medium text-yellow-900">Date Range:</p>
                  <p className="text-yellow-700">Start: {new Date(metrics.debug.dateRange.startDate).toLocaleDateString()}</p>
                  <p className="text-yellow-700">End: {new Date(metrics.debug.dateRange.endDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="font-medium text-yellow-900">Transaction Counts:</p>
                  <p className="text-yellow-700">Project Transactions: {metrics.debug.counts.projectTransactions}</p>
                  <p className="text-yellow-700">General Transactions: {metrics.debug.counts.generalTransactions}</p>
                  <p className="text-yellow-700">Company Expenses: {metrics.debug.counts.companyExpenses}</p>
                  <p className="text-yellow-700">All Projects: {metrics.debug.counts.allProjects}</p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No data available</p>
        </div>
      )}
    </div>
  );
}
