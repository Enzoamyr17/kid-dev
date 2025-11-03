"use client";

import { useState, useEffect } from "react";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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
    fixedExpenses: number;
    totalExpenses: number;
    grossProfit: number;
    profitMargin: number;
  };
  expensesByCategory: Record<string, number>;
  monthlyData: {
    month: number;
    revenue: number;
    projectExpenses: number;
    fixedExpenses: number;
    totalExpenses: number;
    profit: number;
  }[] | null;
  projectCount: number;
  activeFixedExpenses: number;
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
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate year options (current year and past 10 years)
  const yearOptions = [
    { value: "", label: "All Time" },
    ...Array.from({ length: 11 }, (_, i) => {
      const year = currentYear - i;
      return { value: String(year), label: String(year) };
    }),
  ];

  useEffect(() => {
    fetchMetrics();
  }, [selectedYear, selectedMonth]);

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
            {/* Expense Types */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Expense Types</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Project Expenses</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(metrics.summary.projectExpenses)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${
                        metrics.summary.totalExpenses > 0
                          ? (metrics.summary.projectExpenses / metrics.summary.totalExpenses) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm font-medium">Fixed Expenses</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(metrics.summary.fixedExpenses)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${
                        metrics.summary.totalExpenses > 0
                          ? (metrics.summary.fixedExpenses / metrics.summary.totalExpenses) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Active Projects</span>
                  <span className="font-bold">{metrics.projectCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="font-medium">Active Fixed Expenses</span>
                  <span className="font-bold">{metrics.activeFixedExpenses}</span>
                </div>
              </div>
            </div>

            {/* Company Expenses by Category */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Company Expenses by Category</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {Object.entries(metrics.expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">
                          {category.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-bold">{formatCurrency(amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{
                            width: `${
                              metrics.summary.totalExpenses > 0
                                ? (amount / metrics.summary.totalExpenses) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                {Object.keys(metrics.expensesByCategory).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No expense data available
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Breakdown (only if viewing full year) */}
          {metrics.monthlyData && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Monthly Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Month</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Project Expenses</th>
                      <th className="text-right py-2">Fixed Expenses</th>
                      <th className="text-right py-2">Total Expenses</th>
                      <th className="text-right py-2">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.monthlyData.map((data) => (
                      <tr key={data.month} className="border-b hover:bg-gray-50">
                        <td className="py-2">
                          {MONTHS.find((m) => m.value === String(data.month))?.label}
                        </td>
                        <td className="text-right">{formatCurrency(data.revenue)}</td>
                        <td className="text-right">{formatCurrency(data.projectExpenses)}</td>
                        <td className="text-right">{formatCurrency(data.fixedExpenses)}</td>
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
