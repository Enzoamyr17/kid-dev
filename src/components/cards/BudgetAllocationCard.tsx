"use client";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Plus, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";

interface Category {
    id: number;
    name: string;
    description?: string | null;
    budget: number;
    color: string;
    expenses: number;
    remaining: number;
}

interface Transaction {
    id: number;
    projectId: number;
    categoryId: number;
    category: {
        id: number;
        name: string;
        color: string;
    };
    description: string;
    amount: number;
    attachment?: string | null;
    createdAt: string;
    updatedAt: string;
}

const BudgetAllocationCard = ({ projectBudget, projectId }: { projectBudget: number; projectId: number }) => {

    const labelClasses = "text-sm";
    const metricClasses = "flex justify-between items-center w-1/2 px-4 border-b py-2";

    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [isAddingTransaction, setIsAddingTransaction] = useState(false);
    const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
    const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);

    const [editingCell, setEditingCell] = useState<{ id: number; field: string; type: "category" | "transaction" } | null>(null);
    const [editValue, setEditValue] = useState("");

    const [newCategory, setNewCategory] = useState({
        name: "",
        budget: 0,
    });

    const [newTransaction, setNewTransaction] = useState({
        categoryId: 0,
        description: "",
        amount: 0,
    });

    useEffect(() => {
        fetchCategories();
        fetchTransactions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const fetchCategories = async () => {
        try {
            const response = await fetch(`/api/categories?projectId=${projectId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch categories");
            }
            const data = await response.json();
            // Empty array is valid, no error needed
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching categories:", error);
            toast.error("Failed to load budget categories. Please try again.");
            // Set empty array on error so UI still renders
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await fetch(`/api/transaction?projectId=${projectId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch transactions");
            }
            const data = await response.json();
            // Empty array is valid, no error needed
            setTransactions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            toast.error("Failed to load transactions. Please try again.");
            // Set empty array on error so UI still renders
            setTransactions([]);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    // Calculate metrics
    const budgetedExpenses = categories.reduce((sum, cat) => sum + cat.budget, 0);
    const actualExpenses = categories.reduce((sum, cat) => sum + cat.expenses, 0);
    const actualBalance = projectBudget - actualExpenses;

    // Category handlers
    const handleAddCategory = async () => {
        if (!newCategory.name || newCategory.budget <= 0) {
            toast.error("Please provide a category name and budget");
            return;
        }

        setIsSubmittingCategory(true);

        try {
            const response = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    name: newCategory.name,
                    budget: newCategory.budget,
                    color: "#3b82f6",
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create category");
            }

            const createdCategory = await response.json();
            setCategories([...categories, createdCategory]);
            setNewCategory({ name: "", budget: 0 });
            setIsAddingCategory(false);
            toast.success("Category created successfully");
        } catch (error) {
            console.error("Error creating category:", error);
            toast.error("Unable to create category. Please try again.");
        } finally {
            setIsSubmittingCategory(false);
        }
    };

    const handleCancelCategory = () => {
        setNewCategory({ name: "", budget: 0 });
        setIsAddingCategory(false);
    };

    const handleCategoryCellClick = (categoryId: number, field: string, currentValue: string | number) => {
        setEditingCell({ id: categoryId, field, type: "category" });
        setEditValue(String(currentValue));
    };

    const saveCategoryEdit = async (categoryId: number, field: string, oldValue: string | number) => {
        if (editValue === String(oldValue)) {
            setEditingCell(null);
            return;
        }

        const updateValue = field === "budget" ? parseFloat(editValue) : editValue;

        // Optimistic update
        setCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, [field]: updateValue } : cat));
        setEditingCell(null);

        try {
            const response = await fetch("/api/categories", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: categoryId, [field]: updateValue }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update category");
            }

            const updatedCategory = await response.json();
            setCategories(prev => prev.map(cat => cat.id === categoryId ? updatedCategory : cat));
            toast.success("Category updated");
        } catch (error) {
            // Rollback on error
            setCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, [field]: oldValue } : cat));
            toast.error("Unable to update category");
        }
    };

    const handleCategoryKeyPress = (e: React.KeyboardEvent, categoryId: number, field: string, oldValue: string | number) => {
        if (e.key === 'Enter') saveCategoryEdit(categoryId, field, oldValue);
        else if (e.key === 'Escape') { setEditingCell(null); setEditValue(""); }
    };

    // Transaction handlers
    const handleAddTransaction = async () => {
        if (!newTransaction.description || newTransaction.amount <= 0 || newTransaction.categoryId === 0) {
            toast.error("Please fill in description, category, and amount");
            return;
        }

        setIsSubmittingTransaction(true);

        try {
            const response = await fetch("/api/transaction", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    categoryId: newTransaction.categoryId,
                    description: newTransaction.description,
                    amount: newTransaction.amount,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create transaction");
            }

            const createdTransaction = await response.json();
            setTransactions([createdTransaction, ...transactions]);
            setNewTransaction({ categoryId: 0, description: "", amount: 0 });
            setIsAddingTransaction(false);
            toast.success("Transaction added");

            // Refresh categories to update expenses
            fetchCategories();
        } catch (error) {
            console.error("Error creating transaction:", error);
            toast.error("Unable to create transaction. Please try again.");
        } finally {
            setIsSubmittingTransaction(false);
        }
    };

    const handleCancelTransaction = () => {
        setNewTransaction({ categoryId: 0, description: "", amount: 0 });
        setIsAddingTransaction(false);
    };

    const handleTransactionCellClick = (transactionId: number, field: string, currentValue: string | number) => {
        setEditingCell({ id: transactionId, field, type: "transaction" });
        setEditValue(String(currentValue));
    };

    const saveTransactionEdit = async (transactionId: number, field: string, oldValue: string | number) => {
        if (editValue === String(oldValue)) {
            setEditingCell(null);
            return;
        }

        const updateValue = field === "amount" ? parseFloat(editValue) : editValue;

        // Optimistic update
        setTransactions(prev => prev.map(tx => tx.id === transactionId ? { ...tx, [field]: updateValue } : tx));
        setEditingCell(null);

        try {
            const response = await fetch("/api/transaction", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: transactionId, [field]: updateValue }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update transaction");
            }

            const updatedTransaction = await response.json();
            setTransactions(prev => prev.map(tx => tx.id === transactionId ? updatedTransaction : tx));
            toast.success("Transaction updated");

            // Refresh categories to update expenses
            fetchCategories();
        } catch (error) {
            // Rollback on error
            setTransactions(prev => prev.map(tx => tx.id === transactionId ? { ...tx, [field]: oldValue } : tx));
            toast.error("Unable to update transaction");
        }
    };

    const handleTransactionKeyPress = (e: React.KeyboardEvent, transactionId: number, field: string, oldValue: string | number) => {
        if (e.key === 'Enter') saveTransactionEdit(transactionId, field, oldValue);
        else if (e.key === 'Escape') { setEditingCell(null); setEditValue(""); }
    };

    if (loading) {
        return (
            <div className="flex flex-col rounded-lg border w-full p-4 py-5 gap-4">
                <div className="flex flex-wrap w-full gap-y-4">
                    <Skeleton className="h-16 w-1/2" />
                    <Skeleton className="h-16 w-1/2" />
                    <Skeleton className="h-16 w-1/2" />
                    <Skeleton className="h-16 w-1/2" />
                </div>
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="flex flex-col rounded-lg border w-full p-4 py-5 gap-4">

            {/* Metrics */}
            <div className="flex flex-wrap w-full gap-y-4">

                <div className={metricClasses}>
                    <h1 className={labelClasses}>Project Budget</h1>
                    <h1 className={labelClasses}>{formatCurrency(projectBudget)}</h1>
                </div>

                <div className={metricClasses}>
                    <h1 className={labelClasses}>Budgeted Expenses</h1>
                    <h1 className={labelClasses}>{formatCurrency(budgetedExpenses)}</h1>
                </div>

                <div className={metricClasses}>
                    <h1 className={labelClasses}>Actual Expenses</h1>
                    <h1 className={labelClasses}>{formatCurrency(actualExpenses)}</h1>
                </div>

                <div className={metricClasses}>
                    <h1 className={labelClasses}>Actual Balance</h1>
                    <h1 className={labelClasses}>{formatCurrency(actualBalance)}</h1>
                </div>

            </div>

            {/* Budget Allocation Table */}
            <div className="flex flex-col w-full border rounded-md">
                <div className="flex justify-between items-center p-4">
                    <h1 className="text-sm font-medium">Categories</h1>
                    {!isAddingCategory && (
                        <Button variant="outline" onClick={() => setIsAddingCategory(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create
                        </Button>
                    )}
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[150px]">Name</TableHead>
                            <TableHead>Budget</TableHead>
                            <TableHead>Expenses</TableHead>
                            <TableHead>Remaining</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Add Category Row */}
                        {isAddingCategory && (
                            <TableRow className="bg-muted/50">
                                <TableCell>
                                    <Input
                                        value={newCategory.name}
                                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                        placeholder="Category name"
                                        disabled={isSubmittingCategory}
                                        className="h-8"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={newCategory.budget || ""}
                                        onChange={(e) => setNewCategory({ ...newCategory, budget: parseFloat(e.target.value) || 0 })}
                                        placeholder="0.00"
                                        disabled={isSubmittingCategory}
                                        className="h-8"
                                    />
                                </TableCell>
                                <TableCell>0</TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" onClick={handleAddCategory} disabled={isSubmittingCategory}>
                                            {isSubmittingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={handleCancelCategory} disabled={isSubmittingCategory}>
                                            <X className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Category Rows */}
                        {categories.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell
                                    onClick={() => handleCategoryCellClick(category.id, 'name', category.name)}
                                    className="cursor-pointer hover:bg-muted/50"
                                >
                                    {editingCell?.id === category.id && editingCell?.field === 'name' && editingCell?.type === 'category' ? (
                                        <Input
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => saveCategoryEdit(category.id, 'name', category.name)}
                                            onKeyDown={(e) => handleCategoryKeyPress(e, category.id, 'name', category.name)}
                                            className="h-8"
                                            autoFocus
                                        />
                                    ) : category.name}
                                </TableCell>
                                <TableCell
                                    onClick={() => handleCategoryCellClick(category.id, 'budget', category.budget)}
                                    className="cursor-pointer hover:bg-muted/50"
                                >
                                    {editingCell?.id === category.id && editingCell?.field === 'budget' && editingCell?.type === 'category' ? (
                                        <Input
                                            type="number"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => saveCategoryEdit(category.id, 'budget', category.budget)}
                                            onKeyDown={(e) => handleCategoryKeyPress(e, category.id, 'budget', category.budget)}
                                            className="h-8"
                                            autoFocus
                                        />
                                    ) : formatCurrency(category.budget)}
                                </TableCell>
                                <TableCell>{formatCurrency(category.expenses)}</TableCell>
                                <TableCell className={category.remaining < 0 ? "text-red-600 font-semibold" : ""}>
                                    {formatCurrency(category.remaining)}
                                </TableCell>
                            </TableRow>
                        ))}

                        {categories.length === 0 && !isAddingCategory && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                    No categories yet. Click &quot;Create&quot; to add one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Transactions Table */}
            <div className="flex flex-col w-full border rounded-md">
                <div className="flex justify-between items-center p-4">
                    <h1 className="text-sm font-medium">Transactions</h1>
                    {!isAddingTransaction && (
                        <Button variant="outline" onClick={() => setIsAddingTransaction(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                        </Button>
                    )}
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[150px]">Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Add Transaction Row */}
                        {isAddingTransaction && (
                            <TableRow className="bg-muted/50">
                                <TableCell>
                                    <Input
                                        value={newTransaction.description}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                                        placeholder="Transaction description"
                                        disabled={isSubmittingTransaction}
                                        className="h-8"
                                    />
                                </TableCell>
                                <TableCell>
                                    <select
                                        value={newTransaction.categoryId}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, categoryId: parseInt(e.target.value) })}
                                        disabled={isSubmittingTransaction}
                                        className="h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    >
                                        <option value={0}>Select category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={newTransaction.amount || ""}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })}
                                        placeholder="0.00"
                                        disabled={isSubmittingTransaction}
                                        className="h-8"
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" onClick={handleAddTransaction} disabled={isSubmittingTransaction}>
                                            {isSubmittingTransaction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={handleCancelTransaction} disabled={isSubmittingTransaction}>
                                            <X className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Transaction Rows */}
                        {transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell
                                    onClick={() => handleTransactionCellClick(transaction.id, 'description', transaction.description)}
                                    className="cursor-pointer hover:bg-muted/50"
                                >
                                    {editingCell?.id === transaction.id && editingCell?.field === 'description' && editingCell?.type === 'transaction' ? (
                                        <Input
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => saveTransactionEdit(transaction.id, 'description', transaction.description)}
                                            onKeyDown={(e) => handleTransactionKeyPress(e, transaction.id, 'description', transaction.description)}
                                            className="h-8"
                                            autoFocus
                                        />
                                    ) : transaction.description}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className="px-2 py-1 rounded-md text-xs font-medium"
                                        style={{ backgroundColor: `${transaction.category.color}20`, color: transaction.category.color }}
                                    >
                                        {transaction.category.name}
                                    </span>
                                </TableCell>
                                <TableCell
                                    onClick={() => handleTransactionCellClick(transaction.id, 'amount', transaction.amount)}
                                    className="cursor-pointer hover:bg-muted/50"
                                >
                                    {editingCell?.id === transaction.id && editingCell?.field === 'amount' && editingCell?.type === 'transaction' ? (
                                        <Input
                                            type="number"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => saveTransactionEdit(transaction.id, 'amount', transaction.amount)}
                                            onKeyDown={(e) => handleTransactionKeyPress(e, transaction.id, 'amount', transaction.amount)}
                                            className="h-8"
                                            autoFocus
                                        />
                                    ) : formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}

                        {transactions.length === 0 && !isAddingTransaction && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                    No transactions yet. Click &quot;Add&quot; to create one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

        </div>
    );
};

export default BudgetAllocationCard;
