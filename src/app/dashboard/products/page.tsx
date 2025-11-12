"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, X, Trash2, Pencil, Package } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductSearch } from "@/components/ui/product-search";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Field } from "@/components/ui/field";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  subCategory: string;
  adCategory: string;
  uom: string;
  incomingStock: number;
  outgoingStock: number;
  currentStock: number;
  isActive: boolean;
}

interface NewProduct {
  sku: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  subCategory: string;
  adCategory: string;
  uom: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ productId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isStockAdjustmentOpen, setIsStockAdjustmentOpen] = useState(false);
  const [adjustmentProduct, setAdjustmentProduct] = useState<Product | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("");
  const [adjustmentRemarks, setAdjustmentRemarks] = useState("");
  const [adjustmentUnitPrice, setAdjustmentUnitPrice] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState<Date>(new Date());
  const [adjustmentCategory, setAdjustmentCategory] = useState("");
  const [adjustmentSubCategory, setAdjustmentSubCategory] = useState("");
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    sku: "",
    name: "",
    description: "",
    brand: "",
    category: "",
    subCategory: "",
    adCategory: "",
    uom: "",
  });

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Generate next SKU
  const generateNextSKU = () => {
    const currentYear = new Date().getFullYear().toString().slice(-2); // Get last 2 digits of year
    const currentYearPrefix = `KMCI${currentYear}-`;
    
    // Filter products with current year prefix
    const currentYearProducts = products.filter(p => p.sku.startsWith(currentYearPrefix));
    
    if (currentYearProducts.length === 0) {
      return `${currentYearPrefix}00001`;
    }
    
    // Get the highest number
    const numbers = currentYearProducts.map(p => {
      const parts = p.sku.split('-');
      return parseInt(parts[1] || '0', 10);
    });
    
    const maxNumber = Math.max(...numbers);
    const nextNumber = (maxNumber + 1).toString().padStart(5, '0');
    
    return `${currentYearPrefix}${nextNumber}`;
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate required fields
    if (!newProduct.sku || !newProduct.name || !newProduct.description || 
        !newProduct.brand || !newProduct.category || !newProduct.subCategory || 
        !newProduct.adCategory || !newProduct.uom) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku: newProduct.sku,
          name: newProduct.name,
          description: newProduct.description,
          brand: newProduct.brand,
          category: newProduct.category,
          sub_category: newProduct.subCategory,
          ad_category: newProduct.adCategory,
          uom: newProduct.uom,
        }),
      });

      if (!response.ok) throw new Error("Failed to create product");

      const createdProduct = await response.json();
      setProducts([createdProduct, ...products]);
      
      // Reset form
      setNewProduct({
        sku: "",
        name: "",
        description: "",
        brand: "",
        category: "",
        subCategory: "",
        adCategory: "",
        uom: "",
      });

      setIsAddingRow(false);
      toast.success("Product added successfully");
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNewProduct({
      sku: "",
      name: "",
      description: "",
      brand: "",
      category: "",
      subCategory: "",
      adCategory: "",
      uom: "",
    });
    setIsAddingRow(false);
  };

  const handleAddRow = () => {
    const nextSKU = generateNextSKU();
    setNewProduct({
      sku: nextSKU,
      name: "",
      description: "",
      brand: "",
      category: "",
      subCategory: "",
      adCategory: "",
      uom: "",
    });
    setIsAddingRow(true);
  };

  // Toggle product active status with optimistic update
  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic update - update UI immediately
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId ? { ...p, isActive: newStatus } : p
      )
    );

    try {
      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: productId,
          is_active: newStatus,
        }),
      });

      if (!response.ok) throw new Error("Failed to update product status");

      toast.success(`Product ${newStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error("Error updating product status:", error);
      
      // Revert optimistic update on error
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === productId ? { ...p, isActive: currentStatus } : p
        )
      );
      
      toast.error("Failed to update product status");
    }
  };

  // Handle cell click to start editing
  const handleCellClick = (productId: string, field: string, currentValue: string) => {
    setEditingCell({ productId, field });
    setEditValue(currentValue);
  };

  // Save edited value with optimistic update
  const saveEdit = async (productId: string, field: string, oldValue: string) => {
    if (editValue === oldValue) {
      setEditingCell(null);
      return;
    }

    // Optimistic update
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId ? { ...p, [field]: editValue } : p
      )
    );
    setEditingCell(null);

    try {
      // Map camelCase field names to snake_case for API
      const fieldMap: Record<string, string> = {
        subCategory: 'sub_category',
        adCategory: 'ad_category',
        isActive: 'is_active',
      };
      const apiField = fieldMap[field] || field;

      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: productId,
          [apiField]: editValue,
        }),
      });

      if (!response.ok) throw new Error("Failed to update product");

      toast.success("Product updated successfully");
    } catch (error) {
      console.error("Error updating product:", error);
      
      // Revert on error
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === productId ? { ...p, [field]: oldValue } : p
        )
      );
      
      toast.error("Failed to update product");
    }
  };

  // Handle key press in edit input
  const handleKeyPress = (e: React.KeyboardEvent, productId: string, field: string, oldValue: string) => {
    if (e.key === 'Enter') {
      saveEdit(productId, field, oldValue);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const response = await fetch("/api/products", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
            body: JSON.stringify({ id: productId }),
      });
      if (!response.ok) throw new Error("Failed to delete product");
      setProducts(products.filter(p => p.id !== productId));
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  // Fuzzy search function - searches across name, description, uom, category, subCategory, and adCategory
  // Supports word order independence (e.g., "black pen" matches "pen black")
  const filterProducts = (products: Product[]) => {
    if (!searchQuery.trim()) return products;

    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);

    return products.filter((product) => {
      const searchableText = [
        product.name,
        product.description,
        product.uom,
        product.category,
        product.subCategory,
        product.adCategory,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      // All search terms must be present in the searchable text (order independent)
      return searchTerms.every((term) => searchableText.includes(term));
    });
  };

  const filteredProducts = filterProducts(products);

  // Handle save from edit sidebar
  const handleSaveFromSidebar = async () => {
    if (!editingProduct) return;

    // Validate required fields
    if (!editingProduct.name || !editingProduct.description ||
        !editingProduct.brand || !editingProduct.category ||
        !editingProduct.subCategory || !editingProduct.adCategory || !editingProduct.uom) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSavingEdit(true);

    try {
      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingProduct.id,
          name: editingProduct.name,
          description: editingProduct.description,
          brand: editingProduct.brand,
          category: editingProduct.category,
          sub_category: editingProduct.subCategory,
          ad_category: editingProduct.adCategory,
          uom: editingProduct.uom,
        }),
      });

      if (!response.ok) throw new Error("Failed to update product");

      // Update local state
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === editingProduct.id ? editingProduct : p
        )
      );

      toast.success("Product updated successfully");
      setIsEditSidebarOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle stock adjustment
  const handleStockAdjustment = async () => {
    if (!adjustmentProduct) return;

    const qty = parseFloat(adjustmentQuantity);
    if (isNaN(qty) || qty === 0) {
      toast.error("Please enter a valid adjustment quantity");
      return;
    }

    // Validate unit price for positive adjustments
    if (qty > 0) {
      const unitPrice = parseFloat(adjustmentUnitPrice);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        toast.error("Please enter a valid unit price for adding stock");
        return;
      }
    }

    setIsSubmittingAdjustment(true);

    // Store old stock value for rollback
    const oldStock = adjustmentProduct.currentStock;
    const newStock = oldStock + qty;

    // Optimistic update
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === adjustmentProduct.id ? { ...p, currentStock: newStock } : p
      )
    );

    try {
      const requestBody: Record<string, unknown> = {
        productId: adjustmentProduct.id,
        type: "adjustment",
        quantity: qty,
        status: "completed",
        remarks: adjustmentRemarks || null,
      };

      // Add pricing fields for positive adjustments
      if (qty > 0) {
        requestBody.unitPrice = parseFloat(adjustmentUnitPrice);
        requestBody.datePurchased = adjustmentDate.toISOString();
        if (adjustmentCategory) requestBody.category = adjustmentCategory;
        if (adjustmentSubCategory) requestBody.subCategory = adjustmentSubCategory;
      }

      const response = await fetch("/api/stock-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create stock adjustment");
      }

      toast.success(`Stock adjusted successfully. New stock: ${newStock}`);
      setIsStockAdjustmentOpen(false);
      setAdjustmentProduct(null);
      setAdjustmentQuantity("");
      setAdjustmentRemarks("");
      setAdjustmentUnitPrice("");
      setAdjustmentDate(new Date());
      setAdjustmentCategory("");
      setAdjustmentSubCategory("");
    } catch (error) {
      console.error("Error adjusting stock:", error);

      // Revert optimistic update
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === adjustmentProduct.id ? { ...p, currentStock: oldStock } : p
        )
      );

      toast.error(error instanceof Error ? error.message : "Failed to adjust stock");
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <Button onClick={handleAddRow} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <ProductSearch value={searchQuery} onChange={setSearchQuery} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Brand</TableHead>
              {isAddingRow && (
                <TableHead>Category</TableHead>
              )}
              {isAddingRow && (
                <TableHead>Ad Category</TableHead>
              )}
              <TableHead>Sub Category</TableHead>
              <TableHead className={`${isAddingRow ? 'min-w-32' : ''}`}>UOM</TableHead>
              {!isAddingRow && (
                <>
                  <TableHead className="text-right">Outgoing</TableHead>
                  <TableHead className="text-right">Incoming</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                </>
              )}
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAddingRow && (
              <TableRow className="bg-muted/50">
                <TableCell>
                  <Input
                    placeholder="Auto-generated"
                    value={newProduct.sku}
                    disabled
                    className="h-8 bg-muted/30"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Product Name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Brand"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  <Input
                    placeholder="Category"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Ad Category"
                    value={newProduct.adCategory}
                    onChange={(e) => setNewProduct({ ...newProduct, adCategory: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Sub Category"
                    value={newProduct.subCategory}
                    onChange={(e) => setNewProduct({ ...newProduct, subCategory: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="UOM"
                    value={newProduct.uom}
                    onChange={(e) => setNewProduct({ ...newProduct, uom: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>

                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : filteredProducts.length === 0 && !isAddingRow ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  {searchQuery ? "No products match your search." : "No products found. Add your first product to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.sku}</TableCell>
                  <TableCell
                    onClick={() => handleCellClick(product.id, 'name', product.name)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {editingCell?.productId === product.id && editingCell?.field === 'name' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(product.id, 'name', product.name)}
                        onKeyDown={(e) => handleKeyPress(e, product.id, 'name', product.name)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      product.name
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => handleCellClick(product.id, 'description', product.description)}
                    className="max-w-xs truncate cursor-pointer hover:bg-muted/50"
                    title={product.description}
                  >
                    {editingCell?.productId === product.id && editingCell?.field === 'description' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(product.id, 'description', product.description)}
                        onKeyDown={(e) => handleKeyPress(e, product.id, 'description', product.description)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      product.description
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => handleCellClick(product.id, 'brand', product.brand)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {editingCell?.productId === product.id && editingCell?.field === 'brand' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(product.id, 'brand', product.brand)}
                        onKeyDown={(e) => handleKeyPress(e, product.id, 'brand', product.brand)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      product.brand
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => handleCellClick(product.id, 'subCategory', product.subCategory)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {editingCell?.productId === product.id && editingCell?.field === 'subCategory' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(product.id, 'subCategory', product.subCategory)}
                        onKeyDown={(e) => handleKeyPress(e, product.id, 'subCategory', product.subCategory)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      product.subCategory
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => handleCellClick(product.id, 'uom', product.uom)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {editingCell?.productId === product.id && editingCell?.field === 'uom' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(product.id, 'uom', product.uom)}
                        onKeyDown={(e) => handleKeyPress(e, product.id, 'uom', product.uom)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      product.uom
                    )}
                  </TableCell>
                  <TableCell className="text-right">{product.outgoingStock}</TableCell>
                  <TableCell className="text-right">{product.incomingStock}</TableCell>
                  <TableCell className="text-right">{product.currentStock}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleProductStatus(product.id, product.isActive)}
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${
                        product.isActive
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setAdjustmentProduct(product);
                          setAdjustmentQuantity("");
                          setAdjustmentRemarks("");
                          setAdjustmentUnitPrice("");
                          setAdjustmentDate(new Date());
                          setAdjustmentCategory("");
                          setAdjustmentSubCategory("");
                          setIsStockAdjustmentOpen(true);
                        }}
                        title="Adjust Stock"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingProduct(product);
                          setIsEditSidebarOpen(true);
                        }}
                        title="Edit Product"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteProduct(product.id)}
                        title="Delete Product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Product Sidebar */}
      <Sheet open={isEditSidebarOpen} onOpenChange={setIsEditSidebarOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Product</SheetTitle>
            <SheetDescription>
              Update product information. All fields are required.
            </SheetDescription>
          </SheetHeader>

          {editingProduct && (
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Field
                  type="text"
                  label="SKU"
                  value={editingProduct.sku}
                  disabled
                />
                <p className="text-xs text-muted-foreground">SKU cannot be changed</p>
              </div>

              <Field
                type="text"
                label="Product Name"
                value={editingProduct.name}
                onChange={(value) => setEditingProduct({ ...editingProduct, name: value })}
              />

              <Field
                type="text"
                label="Description"
                value={editingProduct.description}
                onChange={(value) => setEditingProduct({ ...editingProduct, description: value })}
              />

              <Field
                type="text"
                label="Brand"
                value={editingProduct.brand}
                onChange={(value) => setEditingProduct({ ...editingProduct, brand: value })}
              />

              <Field
                type="text"
                label="Category"
                value={editingProduct.category}
                onChange={(value) => setEditingProduct({ ...editingProduct, category: value })}
              />

              <Field
                type="text"
                label="Ad Category"
                value={editingProduct.adCategory}
                onChange={(value) => setEditingProduct({ ...editingProduct, adCategory: value })}
              />

              <Field
                type="text"
                label="Sub Category"
                value={editingProduct.subCategory}
                onChange={(value) => setEditingProduct({ ...editingProduct, subCategory: value })}
              />

              <Field
                type="text"
                label="Unit of Measure"
                value={editingProduct.uom}
                onChange={(value) => setEditingProduct({ ...editingProduct, uom: value })}
              />

              <div className="pt-4 border-t space-y-4">
                <h3 className="text-sm font-medium">Stock Information</h3>
                <p className="text-xs text-muted-foreground">Stock values are managed through stock transactions and cannot be edited directly.</p>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Outgoing</label>
                    <p className="text-2xl font-bold">{editingProduct.outgoingStock}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Incoming</label>
                    <p className="text-2xl font-bold">{editingProduct.incomingStock}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Current</label>
                    <p className="text-2xl font-bold">{editingProduct.currentStock}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveFromSidebar}
                  disabled={isSavingEdit}
                  className="flex-1"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditSidebarOpen(false);
                    setEditingProduct(null);
                  }}
                  disabled={isSavingEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Stock Adjustment Sidebar */}
      <Sheet open={isStockAdjustmentOpen} onOpenChange={setIsStockAdjustmentOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Adjust Stock</SheetTitle>
            <SheetDescription>
              Make manual adjustments to stock levels. Use positive numbers to increase and negative numbers to decrease.
            </SheetDescription>
          </SheetHeader>

          {adjustmentProduct && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Product</label>
                  <p className="text-sm font-medium">{adjustmentProduct.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">SKU</label>
                  <p className="text-sm">{adjustmentProduct.sku}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Current Stock</label>
                  <p className="text-2xl font-bold">{adjustmentProduct.currentStock}</p>
                </div>
              </div>

              <Field
                type="text"
                label="Adjustment Quantity"
                value={adjustmentQuantity}
                onChange={setAdjustmentQuantity}
                placeholder="e.g., +10 or -5"
              />
              <p className="text-xs text-muted-foreground">
                Enter a positive number to add stock or a negative number to remove stock.
              </p>

              {/* Show pricing fields only for positive adjustments (adding stock) */}
              {adjustmentQuantity && parseFloat(adjustmentQuantity) > 0 && (
                <>
                  <div className="pt-2 space-y-4">
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold mb-3">Purchase Information</h3>

                      <div className="space-y-4">
                        <Field
                          type="number"
                          label="Unit Price"
                          value={adjustmentUnitPrice}
                          onChange={(value) => setAdjustmentUnitPrice(String(value))}
                          placeholder="0.00"
                        />

                        <Field
                          type="date"
                          label="Date Purchased"
                          value={adjustmentDate}
                          onChange={(value) => setAdjustmentDate(value as Date)}
                        />

                        <Field
                          type="text"
                          label="TransactionCategory (Optional)"
                          value={adjustmentCategory}
                          onChange={setAdjustmentCategory}
                          placeholder="e.g., Inventory Purchase"
                        />

                        <Field
                          type="text"
                          label="TransactionSub Category (Optional)"
                          value={adjustmentSubCategory}
                          onChange={setAdjustmentSubCategory}
                          placeholder="e.g., Office Supplies"
                        />
                      </div>
                    </div>

                    {adjustmentUnitPrice && !isNaN(parseFloat(adjustmentUnitPrice)) && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-green-900 dark:text-green-100 uppercase tracking-wide">
                            Total Cost
                          </p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            ₱{(parseFloat(adjustmentQuantity) * parseFloat(adjustmentUnitPrice)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {adjustmentQuantity} units × ₱{parseFloat(adjustmentUnitPrice).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {adjustmentQuantity && !isNaN(parseFloat(adjustmentQuantity)) && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    New stock level: {adjustmentProduct.currentStock + parseFloat(adjustmentQuantity)}
                  </p>
                </div>
              )}

              <Field
                type="text"
                label="Remarks (Optional)"
                value={adjustmentRemarks}
                onChange={setAdjustmentRemarks}
                placeholder="Reason for adjustment..."
              />

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleStockAdjustment}
                  disabled={isSubmittingAdjustment || !adjustmentQuantity}
                  className="flex-1"
                >
                  {isSubmittingAdjustment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adjusting...
                    </>
                  ) : (
                    "Confirm Adjustment"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsStockAdjustmentOpen(false);
                    setAdjustmentProduct(null);
                    setAdjustmentQuantity("");
                    setAdjustmentRemarks("");
                    setAdjustmentUnitPrice("");
                    setAdjustmentDate(new Date());
                    setAdjustmentCategory("");
                    setAdjustmentSubCategory("");
                  }}
                  disabled={isSubmittingAdjustment}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

