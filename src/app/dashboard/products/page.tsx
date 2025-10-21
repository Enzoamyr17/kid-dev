"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductSearch } from "@/components/ui/product-search";

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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        {!isAddingRow && (
          <Button onClick={handleAddRow} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        )}
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
              <TableHead>Category</TableHead>
              <TableHead>Ad Category</TableHead>
              <TableHead>Sub Category</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
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
                <TableCell>
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
                <TableCell>
                </TableCell>
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
                    onClick={() => handleCellClick(product.id, 'category', product.category)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {editingCell?.productId === product.id && editingCell?.field === 'category' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(product.id, 'category', product.category)}
                        onKeyDown={(e) => handleKeyPress(e, product.id, 'category', product.category)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      product.category
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => handleCellClick(product.id, 'adCategory', product.adCategory)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {editingCell?.productId === product.id && editingCell?.field === 'adCategory' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(product.id, 'adCategory', product.adCategory)}
                        onKeyDown={(e) => handleKeyPress(e, product.id, 'adCategory', product.adCategory)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      product.adCategory
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
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDeleteProduct(product.id)}>
                      <Trash2 className="h-4 w-4" />
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

