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
  type?: string | null;
  datePurchased: string;
  projectId?: number | null;
  categoryId?: number | null;
  category?: string | null;
  subCategory?: string | null;
  itemDescription: string;
  cost: number;
  status: string;
  note?: string | null;
  link?: string | null;
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
  note: string;
  link: string;
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
  type?: string;
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
  const [editingCell, setEditingCell] = useState<{ transactionId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string | number>("");
  const [transactionTab, setTransactionTab] = useState<"expense" | "income">("expense");
  const [filterType, setFilterType] = useState<string>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableSubCategories, setAvailableSubCategories] = useState<Record<string, string[]>>({});
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubCategory, setFilterSubCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterBudgetCategory, setFilterBudgetCategory] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

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
    note: "",
    link: "",
  });

  useEffect(() => {
    fetchTransactions();
    fetchProjects();
    fetchAvailableCategories();
  }, []);

  useEffect(() => {
    console.log('[Filter Debug] Starting filter - Tab:', transactionTab, 'Total transactions:', transactions.length);
    let filtered = transactions;

    // Filter by Income/Expense tab
    filtered = filtered.filter(t => {
      const type = t.type || "Expense"; // Default to Expense if not set
      const match = transactionTab === "expense" ? type === "Expense" : type === "Income";
      console.log('[Filter Debug] ID:', t.id, 'Raw type:', t.type, 'Computed type:', type, 'Match:', match);
      return match;
    });

    console.log('[Filter Debug] After income/expense filter:', filtered.length);

    // Filter by type (all, general, project)
    if (filterType !== "all") {
      filtered = filtered.filter(t => t.transactionType === filterType);
    }

    // Filter by search query (search in description, category, subcategory)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.itemDescription.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.subCategory?.toLowerCase().includes(query) ||
        t.project?.code.toLowerCase().includes(query) ||
        t.project?.description.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus) {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    // Filter by date (month/year)
    if (filterYear) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.datePurchased);
        return transactionDate.getFullYear() === Number(filterYear);
      });
    }
    if (filterMonth) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.datePurchased);
        return transactionDate.getMonth() + 1 === Number(filterMonth);
      });
    }

    // Type-specific filters
    if (filterType === "general") {
      // General transaction filters
      if (filterCategory) {
        filtered = filtered.filter(t => t.category === filterCategory);
      }
      if (filterSubCategory) {
        filtered = filtered.filter(t => t.subCategory === filterSubCategory);
      }
    } else if (filterType === "project") {
      // Project transaction filters
      if (filterProject) {
        filtered = filtered.filter(t => String(t.projectId) === filterProject);
      }
      if (filterBudgetCategory) {
        filtered = filtered.filter(t => String(t.categoryId) === filterBudgetCategory);
      }
    }

    setFilteredTransactions(filtered);
  }, [
    transactionTab,
    filterType,
    transactions,
    searchQuery,
    filterCategory,
    filterSubCategory,
    filterStatus,
    filterProject,
    filterBudgetCategory,
    filterMonth,
    filterYear
  ]);

  useEffect(() => {
    if (newTransaction.projectId) {
      fetchBudgetCategories(Number(newTransaction.projectId));
    } else {
      setBudgetCategories([]);
      setNewTransaction(prev => ({ ...prev, categoryId: "" }));
    }
    // Reset category creation state when project changes
    setIsAddingCategory(false);
    setNewCategoryName("");
  }, [newTransaction.projectId]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions");
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch transactions");
      console.log('[Fetch Debug] Received transactions:', data.length);
      console.log('[Fetch Debug] First transaction:', data[0]);
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

  const fetchAvailableCategories = async () => {
    try {
      const response = await fetch("/api/transactions/categories");
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch categories");
      setAvailableCategories(data.categories || []);
      setAvailableSubCategories(data.subCategories || {});
    } catch (error) {
      console.error("Failed to fetch available categories:", error);
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
        type: transactionTab === "expense" ? "Expense" : "Income",
        datePurchased: newTransaction.datePurchased.toISOString(),
        itemDescription: newTransaction.itemDescription,
        cost: Number(newTransaction.cost),
        status: newTransaction.status,
        note: newTransaction.note || null,
        link: newTransaction.link || null,
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

      // Refresh categories if it was a general transaction
      if (newTransaction.transactionType === "general") {
        await fetchAvailableCategories();
      }

      setIsAddingRow(false);
      setIsAddingCategory(false);
      setNewCategoryName("");
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
        note: "",
        link: "",
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
    setIsAddingCategory(false);
    setNewCategoryName("");
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
      note: "",
      link: "",
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

  // Inline editing handlers
  const handleCellClick = (transactionId: string, field: string, currentValue: string | number) => {
    setEditingCell({ transactionId, field });
    setEditValue(currentValue);
  };

  const saveEdit = async (transactionId: string, field: string, oldValue: string | number) => {
    if (String(editValue) === String(oldValue)) {
      setEditingCell(null);
      return;
    }

    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Prepare update value based on field type
    let updateValue: string | number = editValue;
    if (field === 'cost') {
      updateValue = Number(editValue);
    }

    // Optimistic update
    setTransactions(prev => prev.map(t =>
      t.id === transactionId ? { ...t, [field]: updateValue } : t
    ));
    setEditingCell(null);

    try {
      const response = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(transactionId), [field]: updateValue }),
      });

      if (!response.ok) throw new Error("Failed to update transaction");

      toast.success("Transaction updated successfully");

      // Refresh categories if it was a general transaction
      if (transaction.transactionType === "general" && (field === "category" || field === "subCategory")) {
        await fetchAvailableCategories();
      }
    } catch (error) {
      // Revert on error
      setTransactions(prev => prev.map(t =>
        t.id === transactionId ? { ...t, [field]: oldValue } : t
      ));
      toast.error("Failed to update transaction");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, transactionId: string, field: string, oldValue: string | number) => {
    if (e.key === 'Enter') {
      saveEdit(transactionId, field, oldValue);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    if (!newTransaction.projectId) {
      toast.error("Please select a project first");
      return;
    }

    setIsCreatingCategory(true);

    try {
      const response = await fetch(`/api/projects/${newTransaction.projectId}/budget-categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName,
          description: "",
          budget: 0,
          color: "#3b82f6",
          type: transactionTab === "expense" ? "Expense" : "Income",
        }),
      });

      if (!response.ok) throw new Error("Failed to create category");

      const newCategory = await response.json();

      // Update local state
      setBudgetCategories(prev => [...prev, newCategory]);

      // Select the newly created category
      setNewTransaction(prev => ({ ...prev, categoryId: String(newCategory.id) }));

      // Reset form
      setNewCategoryName("");
      setIsAddingCategory(false);

      toast.success("Category created successfully");
    } catch (error) {
      console.error("Failed to create category:", error);
      toast.error("Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const projectOptions = projects.map(p => ({
    value: String(p.id),
    label: `${p.code} - ${p.description}`,
  }));

  // Filter categories by type based on current tab (Income/Expense)
  const filteredBudgetCategories = budgetCategories.filter(c => {
    const categoryType = c.type || 'Expense';
    return transactionTab === 'expense' ? categoryType === 'Expense' : categoryType === 'Income';
  });

  const categoryOptions = filteredBudgetCategories.map(c => ({
    value: String(c.id),
    label: c.name,
  }));

  // Generate year options (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: "", label: "All Years" },
    ...Array.from({ length: 6 }, (_, i) => {
      const year = currentYear - i;
      return { value: String(year), label: String(year) };
    }),
  ];

  // Month options
  const monthOptions = [
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

  // Category filter options for general transactions
  const categoryFilterOptions = [
    { value: "", label: "All Categories" },
    ...availableCategories.map(cat => ({ value: cat, label: cat })),
  ];

  // Subcategory filter options (filtered by selected category)
  const subCategoryFilterOptions = [
    { value: "", label: "All Sub-categories" },
    ...(filterCategory && availableSubCategories[filterCategory]
      ? availableSubCategories[filterCategory].map(sub => ({ value: sub, label: sub }))
      : []),
  ];

  // Budget category filter options for project transactions (filtered by type)
  const budgetCategoryFilterOptions = [
    { value: "", label: "All Categories" },
    ...filteredBudgetCategories.map(c => ({ value: String(c.id), label: c.name })),
  ];

  // Project filter options
  const projectFilterOptions = [
    { value: "", label: "All Projects" },
    ...projects.map(p => ({ value: String(p.id), label: `${p.code} - ${p.description}` })),
  ];

  // Status filter options
  const statusFilterOptions = [
    { value: "", label: "All Statuses" },
    ...STATUS_OPTIONS,
  ];

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory("");
    setFilterSubCategory("");
    setFilterStatus("");
    setFilterProject("");
    setFilterBudgetCategory("");
    setFilterMonth("");
    setFilterYear("");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Log and track income and expense transactions</p>
        </div>
        {!isAddingRow && (
          <Button onClick={() => setIsAddingRow(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        )}
      </div>

      {/* Income/Expense Tab */}
      <div className="mb-4">
        <Tabs value={transactionTab} onValueChange={(value) => { setTransactionTab(value as "expense" | "income"); clearFilters(); }}>
          <TabsList>
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filter Tab */}
      <div className="mb-4">
        <Tabs value={filterType} onValueChange={(value) => { setFilterType(value); clearFilters(); }}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Advanced Filters */}
      <div className="mb-4 p-4 bg-muted/30 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Search</label>
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Year Filter */}
          <Field
            type="select"
            label="Year"
            value={filterYear}
            onChange={setFilterYear}
            options={yearOptions}
            className="h-9"
          />

          {/* Month Filter */}
          <Field
            type="select"
            label="Month"
            value={filterMonth}
            onChange={setFilterMonth}
            options={monthOptions}
            disabled={!filterYear}
            className="h-9"
          />

          {/* Status Filter */}
          <Field
            type="select"
            label="Status"
            value={filterStatus}
            onChange={setFilterStatus}
            options={statusFilterOptions}
            className="h-9"
          />

          {/* Type-specific filters */}
          {filterType === "general" && (
            <>
              <Field
                type="select"
                label="Category"
                value={filterCategory}
                onChange={(value) => { setFilterCategory(value); setFilterSubCategory(""); }}
                options={categoryFilterOptions}
                className="h-9"
              />
              <Field
                type="select"
                label="Sub-Category"
                value={filterSubCategory}
                onChange={setFilterSubCategory}
                options={subCategoryFilterOptions}
                disabled={!filterCategory}
                className="h-9"
              />
            </>
          )}

          {filterType === "project" && (
            <>
              <Field
                type="select"
                label="Project"
                value={filterProject}
                onChange={(value) => {
                  setFilterProject(value);
                  setFilterBudgetCategory("");
                  if (value) {
                    fetchBudgetCategories(Number(value));
                  }
                }}
                options={projectFilterOptions}
                className="h-9"
              />
              <Field
                type="select"
                label="Budget Category"
                value={filterBudgetCategory}
                onChange={setFilterBudgetCategory}
                options={budgetCategoryFilterOptions}
                disabled={!filterProject}
                className="h-9"
              />
            </>
          )}

          {/* Clear Filters Button */}
          <div className="flex flex-col justify-end">
            <Button variant="outline" size="sm" onClick={clearFilters} className="h-9">
              Clear Filters
            </Button>
          </div>
        </div>
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
              <TableHead>Note</TableHead>
              <TableHead>Link</TableHead>
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
                    captionLayout="dropdown"
                    disabled={isSubmitting}
                    fromYear={2000}
                    toYear={new Date().getFullYear()}
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
                      {isAddingCategory ? (
                        <div className="flex gap-1">
                          <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateCategory();
                              else if (e.key === 'Escape') {
                                setIsAddingCategory(false);
                                setNewCategoryName("");
                              }
                            }}
                            disabled={isCreatingCategory}
                            className="h-8 flex-1"
                            placeholder="Category name"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleCreateCategory}
                            disabled={isCreatingCategory}
                            className="h-8 w-8"
                          >
                            {isCreatingCategory ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setIsAddingCategory(false);
                              setNewCategoryName("");
                            }}
                            disabled={isCreatingCategory}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Field
                            type="select"
                            value={newTransaction.categoryId}
                            onChange={(value) => setNewTransaction({ ...newTransaction, categoryId: value })}
                            options={categoryOptions}
                            disabled={isSubmitting || !newTransaction.projectId}
                            placeholder="Select category"
                            className="h-8"
                          />
                          {newTransaction.projectId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsAddingCategory(true)}
                              disabled={isSubmitting}
                              className="h-7 w-full text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add New Category
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        value={newTransaction.category}
                        onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value, subCategory: "" })}
                        disabled={isSubmitting}
                        className="h-8"
                        placeholder="Category"
                        list="category-suggestions"
                      />
                      <datalist id="category-suggestions">
                        {availableCategories.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                      <Input
                        value={newTransaction.subCategory}
                        onChange={(e) => setNewTransaction({ ...newTransaction, subCategory: e.target.value })}
                        disabled={isSubmitting}
                        className="h-8"
                        placeholder="Sub-category (optional)"
                        list="subcategory-suggestions"
                      />
                      <datalist id="subcategory-suggestions">
                        {newTransaction.category && availableSubCategories[newTransaction.category]?.map((subCat) => (
                          <option key={subCat} value={subCat} />
                        ))}
                      </datalist>
                      {/* Datalist for editing */}
                      <datalist id="edit-category-suggestions">
                        {availableCategories.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
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
                    min="0"
                    step="0.01"
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
                  <Input
                    value={newTransaction.note}
                    onChange={(e) => setNewTransaction({ ...newTransaction, note: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="Note"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newTransaction.link}
                    onChange={(e) => setNewTransaction({ ...newTransaction, link: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="OneDrive Link"
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
                  <TableCell
                    onClick={() => {
                      if (transaction.transactionType === "general") {
                        handleCellClick(transaction.id, 'category', transaction.category || "");
                      }
                    }}
                    className={transaction.transactionType === "general" ? "cursor-pointer hover:bg-muted/50" : ""}
                  >
                    {transaction.transactionType === "project" ? (
                      <div>
                        <div className="font-medium">{transaction.project?.code}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.budgetCategory?.name}
                        </div>
                      </div>
                    ) : (
                      editingCell?.transactionId === transaction.id && editingCell?.field === 'category' ? (
                        <Input
                          value={editValue as string}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(transaction.id, 'category', transaction.category || "")}
                          onKeyDown={(e) => handleKeyPress(e, transaction.id, 'category', transaction.category || "")}
                          className="h-8"
                          placeholder="Category"
                          list="edit-category-suggestions"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <div className="font-medium">{transaction.category}</div>
                          {transaction.subCategory && (
                            <div className="text-sm text-muted-foreground">
                              {transaction.subCategory}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => handleCellClick(transaction.id, 'itemDescription', transaction.itemDescription)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {editingCell?.transactionId === transaction.id && editingCell?.field === 'itemDescription' ? (
                      <Input
                        value={editValue as string}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(transaction.id, 'itemDescription', transaction.itemDescription)}
                        onKeyDown={(e) => handleKeyPress(e, transaction.id, 'itemDescription', transaction.itemDescription)}
                        className="h-8"
                        autoFocus
                      />
                    ) : transaction.itemDescription}
                  </TableCell>
                  <TableCell
                    onClick={() => handleCellClick(transaction.id, 'cost', transaction.cost)}
                    className="text-right font-medium cursor-pointer hover:bg-muted/50"
                  >
                    {editingCell?.transactionId === transaction.id && editingCell?.field === 'cost' ? (
                      <Input
                        type="number"
                        value={editValue as number}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(transaction.id, 'cost', transaction.cost)}
                        onKeyDown={(e) => handleKeyPress(e, transaction.id, 'cost', transaction.cost)}
                        className="h-8 text-right"
                        min="0"
                        step="0.01"
                        autoFocus
                      />
                    ) : formatCurrency(transaction.cost)}
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
                  <TableCell>
                    {transaction.note}
                  </TableCell>
                  <TableCell>
                    {transaction.link}
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
