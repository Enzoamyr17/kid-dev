"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/ui/field";

interface CompanyExpense {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  dayOfWeek?: number | null;
  daysOfMonth?: string | null;
  monthOfYear?: number | null;
  specificDate?: string | null;
  startOfPayment?: string | null;
  endOfPayment?: string | null;
  category?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface NewExpense {
  name: string;
  amount: string;
  frequency: string;
  dayOfWeek: string;
  firstDay: string;
  secondDay: string;
  dayOfMonth: string;
  monthOfYear: string;
  specificDate: Date | undefined;
  startOfPayment: Date | undefined;
  endOfPayment: Date | undefined;
  category: string;
  notes: string;
}

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "twice_monthly", label: "Twice Monthly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One-Time" },
];

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const MONTHS = [
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

const QUARTER_START_MONTHS = [
  { value: "1", label: "Q1 (Jan, Apr, Jul, Oct)" },
  { value: "2", label: "Q2 (Feb, May, Aug, Nov)" },
  { value: "3", label: "Q3 (Mar, Jun, Sep, Dec)" },
  { value: "4", label: "Q4 (Apr, Jul, Oct, Jan)" },
];

export default function ExpenseManagementPage() {
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [newExpense, setNewExpense] = useState<NewExpense>({
    name: "",
    amount: "",
    frequency: "",
    dayOfWeek: "",
    firstDay: "15",
    secondDay: "30",
    dayOfMonth: "",
    monthOfYear: "",
    specificDate: undefined,
    startOfPayment: undefined,
    endOfPayment: undefined,
    category: "",
    notes: "",
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch("/api/expenses");
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch expenses");
      setExpenses(data);

      // Extract unique categories from expenses
      const uniqueCategories = Array.from(
        new Set(data.filter((e: CompanyExpense) => e.category).map((e: CompanyExpense) => e.category))
      ) as string[];
      setAvailableCategories(uniqueCategories);
    } catch (error) {
      toast.error("Failed to fetch expenses");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForAPI = (date: Date | undefined) => {
    if (!date) return null;
    // Format as YYYY-MM-DD in local timezone to avoid timezone shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00.000Z`;
  };

  const formatDateFromAPI = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    // Parse the UTC date and display it without timezone conversion
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
  };

  const handleSubmit = async () => {
    console.log('[Expense Management] Starting submission with data:', newExpense);

    if (!newExpense.name || !newExpense.amount || !newExpense.frequency) {
      console.log('[Expense Management] Validation failed');
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: newExpense.name,
        amount: Number(newExpense.amount),
        frequency: newExpense.frequency,
        startOfPayment: formatDateForAPI(newExpense.startOfPayment),
        endOfPayment: formatDateForAPI(newExpense.endOfPayment),
        category: newExpense.category || null,
        notes: newExpense.notes || null,
        isActive: true,
      };

      // Add frequency-specific fields
      switch (newExpense.frequency) {
        case 'weekly':
          if (!newExpense.dayOfWeek) {
            toast.error("Please select a day of week");
            setIsSubmitting(false);
            return;
          }
          payload.dayOfWeek = Number(newExpense.dayOfWeek);
          break;

        case 'twice_monthly':
          const firstDay = newExpense.firstDay || '15';
          const secondDay = newExpense.secondDay || '30';
          payload.daysOfMonth = `${firstDay},${secondDay}`;
          break;

        case 'monthly':
          if (!newExpense.dayOfMonth) {
            toast.error("Please enter day of month");
            setIsSubmitting(false);
            return;
          }
          payload.daysOfMonth = newExpense.dayOfMonth;
          break;

        case 'quarterly':
          if (!newExpense.dayOfMonth || !newExpense.monthOfYear) {
            toast.error("Please enter day and starting month");
            setIsSubmitting(false);
            return;
          }
          payload.daysOfMonth = newExpense.dayOfMonth;
          payload.monthOfYear = Number(newExpense.monthOfYear);
          break;

        case 'yearly':
          if (!newExpense.dayOfMonth || !newExpense.monthOfYear) {
            toast.error("Please select month and day");
            setIsSubmitting(false);
            return;
          }
          payload.daysOfMonth = newExpense.dayOfMonth;
          payload.monthOfYear = Number(newExpense.monthOfYear);
          break;

        case 'one_time':
          if (!newExpense.specificDate) {
            toast.error("Please select a date");
            setIsSubmitting(false);
            return;
          }
          payload.specificDate = formatDateForAPI(newExpense.specificDate);
          break;
      }

      console.log('[Expense Management] Sending payload to API:', payload);

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log('[Expense Management] API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Expense Management] API error response:', errorData);
        throw new Error(errorData.error || "Failed to create expense");
      }

      console.log('[Expense Management] Expense created successfully');
      await fetchExpenses();

      setIsAddingRow(false);
      setNewExpense({
        name: "",
        amount: "",
        frequency: "",
        dayOfWeek: "",
        firstDay: "15",
        secondDay: "30",
        dayOfMonth: "",
        monthOfYear: "",
        specificDate: undefined,
        startOfPayment: undefined,
        endOfPayment: undefined,
        category: "",
        notes: "",
      });
      toast.success("Expense created successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create expense";
      console.error('[Expense Management] Error during submission:', error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsAddingRow(false);
    setNewExpense({
      name: "",
      amount: "",
      frequency: "",
      dayOfWeek: "",
      firstDay: "15",
      secondDay: "30",
      dayOfMonth: "",
      monthOfYear: "",
      specificDate: undefined,
      startOfPayment: undefined,
      endOfPayment: undefined,
      category: "",
      notes: "",
    });
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const response = await fetch(`/api/expenses?id=${expenseId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete expense");

      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      toast.success("Expense deleted successfully");
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const formatFrequency = (freq: string) => {
    return FREQUENCY_OPTIONS.find(f => f.value === freq)?.label || freq;
  };

  const formatRecurrence = (expense: CompanyExpense) => {
    switch (expense.frequency) {
      case 'weekly':
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][expense.dayOfWeek || 0];
        return `Every ${dayName}`;

      case 'twice_monthly':
        const days = expense.daysOfMonth?.split(',') || ['15', '30'];
        return `${days[0]}th & ${days[1]}th of month`;

      case 'monthly':
        return `${expense.daysOfMonth}th of each month`;

      case 'quarterly':
        return `${expense.daysOfMonth}th (Quarterly)`;

      case 'yearly':
        const month = MONTHS.find(m => m.value === String(expense.monthOfYear))?.label || '';
        return `${month} ${expense.daysOfMonth}`;

      case 'one_time':
        return formatDateFromAPI(expense.specificDate) || '-';

      default:
        return '-';
    }
  };

  const getExpenseStatus = (expense: CompanyExpense) => {
    if (!expense.endOfPayment) {
      return { label: 'Ongoing', color: 'bg-green-100 text-green-700' };
    }

    const endDate = new Date(expense.endOfPayment);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (endDate < today) {
      return { label: 'Ended', color: 'bg-gray-100 text-gray-700' };
    }

    return { label: 'Active', color: 'bg-blue-100 text-blue-700' };
  };

  const renderRecurrenceInput = () => {
    switch (newExpense.frequency) {
      case 'weekly':
        return (
          <Field
            type="select"
            options={DAYS_OF_WEEK}
            value={newExpense.dayOfWeek}
            onChange={(v) => setNewExpense({ ...newExpense, dayOfWeek: v })}
            placeholder="Select day"
            className="h-8"
            disabled={isSubmitting}
          />
        );

      case 'twice_monthly':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="1st day"
              value={newExpense.firstDay}
              onChange={(e) => setNewExpense({ ...newExpense, firstDay: e.target.value })}
              min="1"
              max="31"
              className="h-8 w-20"
              disabled={isSubmitting}
            />
            <Input
              type="number"
              placeholder="2nd day"
              value={newExpense.secondDay}
              onChange={(e) => setNewExpense({ ...newExpense, secondDay: e.target.value })}
              min="1"
              max="31"
              className="h-8 w-20"
              disabled={isSubmitting}
            />
          </div>
        );

      case 'monthly':
        return (
          <Input
            type="number"
            placeholder="Day (1-31)"
            value={newExpense.dayOfMonth}
            onChange={(e) => setNewExpense({ ...newExpense, dayOfMonth: e.target.value })}
            min="1"
            max="31"
            className="h-8"
            disabled={isSubmitting}
          />
        );

      case 'quarterly':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Day"
              value={newExpense.dayOfMonth}
              onChange={(e) => setNewExpense({ ...newExpense, dayOfMonth: e.target.value })}
              min="1"
              max="31"
              className="h-8 w-20"
              disabled={isSubmitting}
            />
            <Field
              type="select"
              options={QUARTER_START_MONTHS}
              value={newExpense.monthOfYear}
              onChange={(v) => setNewExpense({ ...newExpense, monthOfYear: v })}
              placeholder="Starting month"
              className="h-8"
              disabled={isSubmitting}
            />
          </div>
        );

      case 'yearly':
        return (
          <div className="flex gap-2">
            <Field
              type="select"
              options={MONTHS}
              value={newExpense.monthOfYear}
              onChange={(v) => setNewExpense({ ...newExpense, monthOfYear: v })}
              placeholder="Month"
              className="h-8 flex-1"
              disabled={isSubmitting}
            />
            <Input
              type="number"
              placeholder="Day"
              value={newExpense.dayOfMonth}
              onChange={(e) => setNewExpense({ ...newExpense, dayOfMonth: e.target.value })}
              min="1"
              max="31"
              className="h-8 w-20"
              disabled={isSubmitting}
            />
          </div>
        );

      case 'one_time':
        return (
          <Field
            type="date"
            value={newExpense.specificDate}
            onChange={(d) => setNewExpense({ ...newExpense, specificDate: d })}
            className="h-8"
            disabled={isSubmitting}
          />
        );

      default:
        return <span className="text-sm text-muted-foreground">Select frequency first</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
      {!isAddingRow && (
        <div className="flex w-full justify-end gap-2 items-center">
            <Field
              type="select"
              options={[{ value: "", label: "All Months" }, ...MONTHS]}
              value={selectedMonth}
              onChange={(value) => setSelectedMonth(value)}
              placeholder="All Months"
              className="h-10"
              disabled={isSubmitting}
            />            
            <Button onClick={() => setIsAddingRow(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>

        </div>

      )}
      
      </div>

      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Recurrence Details</TableHead>
              <TableHead>Start of Payment</TableHead>
              <TableHead>End of Payment</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Add Row */}
            {isAddingRow && (
              <TableRow className="bg-muted/50">
                <TableCell>
                  <Input
                    value={newExpense.name}
                    onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="Expense name"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="0.00"
                    type="number"
                  />
                </TableCell>
                <TableCell>
                  <Field
                    type="select"
                    value={newExpense.frequency}
                    onChange={(value) => setNewExpense({ ...newExpense, frequency: value })}
                    options={FREQUENCY_OPTIONS}
                    disabled={isSubmitting}
                    placeholder="Select frequency"
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  {renderRecurrenceInput()}
                </TableCell>
                <TableCell>
                  <Field
                    type="date"
                    value={newExpense.startOfPayment}
                    onChange={(d) => setNewExpense({ ...newExpense, startOfPayment: d })}
                    className="h-8"
                    captionLayout="dropdown"
                    disabled={isSubmitting}
                    fromYear={2000}
                    toYear={new Date().getFullYear()}
                  />
                </TableCell>
                <TableCell>
                  <Field
                    type="date"
                    value={newExpense.endOfPayment}
                    onChange={(d) => setNewExpense({ ...newExpense, endOfPayment: d })}
                    className="h-8"
                    captionLayout="dropdown"
                    disabled={isSubmitting}
                    fromYear={2000}
                    toYear={new Date().getFullYear() + 50}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="Category"
                    list="expense-category-suggestions"
                  />
                  <datalist id="expense-category-suggestions">
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Loading State */}
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : expenses.length === 0 && !isAddingRow ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No expenses found. Click &quot;Add Expense&quot; to create one.
                </TableCell>
              </TableRow>
            ) : (
              expenses.filter((expense) => {
                // If no month is selected, show all expenses
                if (!selectedMonth) {
                  return true;
                }
                
                // If month is selected, filter expenses based on frequency and month matching
                const isMonthlyOrTwiceMonthly = expense.frequency === "monthly" || expense.frequency === "twice_monthly";
                
                // Monthly/Twice Monthly expenses occur every month, so always show them
                if (isMonthlyOrTwiceMonthly) {
                  return true;
                }
                
                // Weekly expenses occur every week, so always show them
                if (expense.frequency === "weekly") {
                  return true;
                }
                
                // For yearly expenses, check if monthOfYear matches selectedMonth
                if (expense.frequency === "yearly" && expense.monthOfYear && String(expense.monthOfYear) === selectedMonth) {
                  return true;
                }
                
                // For quarterly expenses, check if selected month is in the same quarter
                if (expense.frequency === "quarterly" && expense.monthOfYear) {
                  const startMonth = expense.monthOfYear;
                  const selectedMonthNum = Number(selectedMonth);
                  // Quarters: Q1 (1,4,7,10), Q2 (2,5,8,11), Q3 (3,6,9,12), Q4 (4,7,10,1)
                  const quarterMonths = [
                    [1, 4, 7, 10], // Q1
                    [2, 5, 8, 11], // Q2
                    [3, 6, 9, 12], // Q3
                    [4, 7, 10, 1], // Q4
                  ];
                  const quarterIndex = Math.floor((startMonth - 1) / 3);
                  if (quarterMonths[quarterIndex]?.includes(selectedMonthNum)) {
                    return true;
                  }
                }
                
                // For one-time expenses, check if specificDate is in the selected month
                if (expense.frequency === "one_time" && expense.specificDate) {
                  const expenseDate = new Date(expense.specificDate);
                  const expenseMonth = expenseDate.getMonth() + 1; // getMonth() returns 0-11
                  if (expenseMonth === Number(selectedMonth)) {
                    return true;
                  }
                }
                
                return false;
              }).map((expense) => {
                const status = getExpenseStatus(expense);
                return (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.name}</TableCell>
                    <TableCell className="text-right">₱{Number(expense.amount).toLocaleString()}</TableCell>
                    <TableCell>{formatFrequency(expense.frequency)}</TableCell>
                    <TableCell>{formatRecurrence(expense)}</TableCell>
                    <TableCell>
                      {formatDateFromAPI(expense.startOfPayment) || "-"}
                    </TableCell>
                    <TableCell>
                      {expense.endOfPayment
                        ? formatDateFromAPI(expense.endOfPayment)
                        : <span className="text-muted-foreground">Ongoing</span>}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{expense.category?.replace('_', ' ') || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}
