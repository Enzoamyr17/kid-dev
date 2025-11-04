"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Transaction {
  id: string;
  transactionType: string;
  datePurchased: string;
  projectId?: number | null;
  categoryId?: number | null;
  category?: string | null;
  subCategory?: string | null;
  itemDescription: string;
  cost: number;
  status: string;
  remarks?: string | null;
  createdAt: string;
  project?: {
    id: number;
    code: string;
    description: string;
  } | null;
  budgetCategory?: {
    id: number;
    name: string;
    color: string;
  } | null;
}

interface NewTransaction {
  transactionType: string;
  datePurchased: Date | undefined;
  projectId: string;
  categoryId: string;
  category: string;
  subCategory: string;
  itemDescription: string;
  cost: string;
  status: string;
  remarks: string;
}

interface Project {
  id: number;
  code: string;
  description: string;
}

interface BudgetCategory {
  id: number;
  name: string;
  color: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [newTransaction, setNewTransaction] = useState<NewTransaction>({
    transactionType: "general",
    datePurchased: undefined,
    projectId: "",
    categoryId: "",
    category: "",
    subCategory: "",
    itemDescription: "",
    cost: "",
    status: "completed",
    remarks: "",
  });

  useEffect(() => {
    fetchTransactions();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (filterType === "all") {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter(t => t.transactionType === filterType));
    }
  }, [filterType, transactions]);

  useEffect(() => {
    if (newTransaction.projectId) {
      fetchBudgetCategories(Number(newTransaction.projectId));
    } else {
      setBudgetCategories([]);
      setNewTransaction(prev => ({ ...prev, categoryId: "" }));
    }
  }, [newTransaction.projectId]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions");
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch transactions");
      setTransactions(data);
    } catch (error) {
      toast.error("Failed to fetch transactions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch projects");
      setProjects(data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const fetchBudgetCategories = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget-categories`);
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch budget categories");
      setBudgetCategories(data);
    } catch (error) {
      console.error("Failed to fetch budget categories:", error);
      setBudgetCategories([]);
    }
  };

  const handleSubmit = async () => {
    console.log('[Transactions] Starting submission with data:', newTransaction);

    // Validate required fields
    if (!newTransaction.transactionType || !newTransaction.datePurchased ||
        !newTransaction.itemDescription || !newTransaction.cost || !newTransaction.status) {
      console.log('[Transactions] Validation failed');
      toast.error("Please fill in all required fields");
      return;
    }

    // Type-specific validation
    if (newTransaction.transactionType === "project" && (!newTransaction.projectId || !newTransaction.categoryId)) {
      toast.error("Please select a project and budget category");
      return;
    }

    if (newTransaction.transactionType === "general" && !newTransaction.category) {
      toast.error("Please enter a category");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        transactionType: newTransaction.transactionType,
        datePurchased: newTransaction.datePurchased.toISOString(),
        itemDescription: newTransaction.itemDescription,
        cost: Number(newTransaction.cost),
        status: newTransaction.status,
        remarks: newTransaction.remarks || null,
      };

      if (newTransaction.transactionType === "project") {
        payload.projectId = Number(newTransaction.projectId);
        payload.categoryId = Number(newTransaction.categoryId);
      } else {
        payload.category = newTransaction.category;
        payload.subCategory = newTransaction.subCategory || null;
      }

      console.log('[Transactions] Sending payload to API:', payload);

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log('[Transactions] API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Transactions] API error response:', errorData);
        throw new Error(errorData.error || "Failed to create transaction");
      }

      console.log('[Transactions] Transaction created successfully');
      await fetchTransactions();

      setIsAddingRow(false);
      setNewTransaction({
        transactionType: "general",
        datePurchased: undefined,
        projectId: "",
        categoryId: "",
        category: "",
        subCategory: "",
        itemDescription: "",
        cost: "",
        status: "completed",
        remarks: "",
      });
      toast.success("Transaction created successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create transaction";
      console.error('[Transactions] Error during submission:', error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsAddingRow(false);
    setNewTransaction({
      transactionType: "general",
      datePurchased: undefined,
      projectId: "",
      categoryId: "",
      category: "",
      subCategory: "",
      itemDescription: "",
      cost: "",
      status: "completed",
      remarks: "",
    });
  };

  const toggleStatus = async (transactionId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const oldTransaction = transactions.find(t => t.id === transactionId);

    // Optimistic update
    setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, status: newStatus } : t));

    try {
      const response = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(transactionId), status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed");
      toast.success(`Transaction marked as ${newStatus}`);
    } catch (error) {
      // Revert on error
      if (oldTransaction) {
        setTransactions(prev => prev.map(t => t.id === transactionId ? oldTransaction : t));
      }
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const response = await fetch(`/api/transactions?id=${transactionId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete transaction");

      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
      toast.success("Transaction deleted successfully");
    } catch {
      toast.error("Failed to delete transaction");
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const projectOptions = projects.map(p => ({
    value: String(p.id),
    label: `${p.code} - ${p.description}`,
  }));

  const categoryOptions = budgetCategories.map(c => ({
    value: String(c.id),
    label: c.name,
  }));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Log and track completed expense transactions</p>
        </div>
        {!isAddingRow && (
          <Button onClick={() => setIsAddingRow(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-4">
        <Tabs value={filterType} onValueChange={setFilterType}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Project/Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Add Row */}
            {isAddingRow && (
              <TableRow className="bg-muted/50">
                <TableCell>
                  <Field
                    type="date"
                    value={newTransaction.datePurchased}
                    onChange={(d) => setNewTransaction({ ...newTransaction, datePurchased: d })}
                    className="h-8"
                    disabled={isSubmitting}
                  />
                </TableCell>
                <TableCell>
                  <Field
                    type="select"
                    value={newTransaction.transactionType}
                    onChange={(value) => setNewTransaction({
                      ...newTransaction,
                      transactionType: value,
                      projectId: "",
                      categoryId: "",
                      category: "",
                      subCategory: "",
                    })}
                    options={[
                      { value: "general", label: "General" },
                      { value: "project", label: "Project" },
                    ]}
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  {newTransaction.transactionType === "project" ? (
                    <div className="space-y-2">
                      <Field
                        type="select"
                        value={newTransaction.projectId}
                        onChange={(value) => setNewTransaction({ ...newTransaction, projectId: value })}
                        options={projectOptions}
                        disabled={isSubmitting}
                        placeholder="Select project"
                        className="h-8"
                      />
                      <Field
                        type="select"
                        value={newTransaction.categoryId}
                        onChange={(value) => setNewTransaction({ ...newTransaction, categoryId: value })}
                        options={categoryOptions}
                        disabled={isSubmitting || !newTransaction.projectId}
                        placeholder="Select category"
                        className="h-8"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        value={newTransaction.category}
                        onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                        disabled={isSubmitting}
                        className="h-8"
                        placeholder="Category"
                      />
                      <Input
                        value={newTransaction.subCategory}
                        onChange={(e) => setNewTransaction({ ...newTransaction, subCategory: e.target.value })}
                        disabled={isSubmitting}
                        className="h-8"
                        placeholder="Sub-category (optional)"
                      />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    value={newTransaction.itemDescription}
                    onChange={(e) => setNewTransaction({ ...newTransaction, itemDescription: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="Item description"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={newTransaction.cost}
                    onChange={(e) => setNewTransaction({ ...newTransaction, cost: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell>
                  <Field
                    type="select"
                    value={newTransaction.status}
                    onChange={(value) => setNewTransaction({ ...newTransaction, status: value })}
                    options={STATUS_OPTIONS}
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
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
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredTransactions.length === 0 && !isAddingRow ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No transactions found. Click &quot;Add Transaction&quot; to create one.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.datePurchased).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{transaction.transactionType}</span>
                  </TableCell>
                  <TableCell>
                    {transaction.transactionType === "project" ? (
                      <div>
                        <div className="font-medium">{transaction.project?.code}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.budgetCategory?.name}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">{transaction.category}</div>
                        {transaction.subCategory && (
                          <div className="text-sm text-muted-foreground">
                            {transaction.subCategory}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{transaction.itemDescription}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(transaction.cost)}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleStatus(transaction.id, transaction.status)}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        transaction.status === "completed"
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      }`}
                    >
                      {transaction.status === "completed" ? "Completed" : "Pending"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(transaction.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
