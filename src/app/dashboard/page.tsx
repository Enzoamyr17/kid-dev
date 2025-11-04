"use client";

import { useState, useEffect } from "react";
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
                          label: function (context: any) {
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
                          callback: function (value: any) {
                            return `₱${value.toLocaleString()}`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            )}
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
                      <th className="text-right py-2">Project</th>
                      <th className="text-right py-2">General</th>
                      <th className="text-right py-2">Company</th>
                      <th className="text-right py-2">Total</th>
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
