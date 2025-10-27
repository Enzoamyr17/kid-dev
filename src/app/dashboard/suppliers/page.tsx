"use client";

import { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Plus, Loader2, ChevronLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface Company {
  id: number;
  companyName: string;
  isSupplier: boolean;
}

interface ProductPrice {
  id: number;
  productId: number;
  companyId: number;
  price: string;
  product: Product;
  company: Company;
}

interface SupplierWithPrices extends Company {
  priceCount: number;
}

export default function SuppliersPage() {
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<Company | null>(null);
  const [isAddPriceOpen, setIsAddPriceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ priceId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const productInputRef = useRef<HTMLDivElement>(null);

  const [newPrice, setNewPrice] = useState({
    productId: "",
    companyId: "",
    price: "",
  });

  // Fetch product prices
  const fetchProductPrices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/product-prices");
      if (!response.ok) throw new Error("Failed to fetch product prices");
      const data = await response.json();
      setProductPrices(data);
      console.log(data);
    } catch (error) {
      console.error("Error fetching product prices:", error);
      toast.error("Failed to load product prices");
    } finally {
      setLoading(false);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?active=true");
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    }
  };

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/companies");
      if (!response.ok) throw new Error("Failed to fetch companies");
      const data = await response.json();
      // Filter only suppliers
      const supplierList = data.filter((company: Company) => company.isSupplier);
      setSuppliers(supplierList);
      console.log(supplierList);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Failed to load suppliers");
    }
  };

  useEffect(() => {
    fetchProductPrices();
    fetchProducts();
    fetchSuppliers();
  }, []);

  // Click outside handler to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productInputRef.current && !productInputRef.current.contains(event.target as Node)) {
        setShowProductSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle form submission
  const handleSubmit = async () => {
    if (!newPrice.productId || !newPrice.companyId || !newPrice.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isNaN(Number(newPrice.price)) || Number(newPrice.price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/product-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: Number(newPrice.productId),
          companyId: Number(newPrice.companyId),
          price: Number(newPrice.price),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create product price");
      }

      const createdPrice = await response.json();
      setProductPrices([createdPrice, ...productPrices]);

      // Reset form
      setNewPrice({
        productId: "",
        companyId: "",
        price: "",
      });

      setIsAddPriceOpen(false);
      toast.success("Product price added successfully");
    } catch (error) {
      console.error("Error creating product price:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add product price");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNewPrice({
      productId: "",
      companyId: "",
      price: "",
    });
    setProductSearch("");
    setShowProductSuggestions(false);
    setIsAddPriceOpen(false);
  };

  // Filter products based on search
  const filteredProducts = products.filter(product => {
    const searchLower = productSearch.toLowerCase();
    return (
      product.sku.toLowerCase().includes(searchLower) ||
      product.name.toLowerCase().includes(searchLower)
    );
  });

  // Get selected product details
  const selectedProduct = products.find(p => p.id.toString() === newPrice.productId);

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    setNewPrice({ ...newPrice, productId: product.id.toString() });
    setProductSearch(`${product.sku} - ${product.name}`);
    setShowProductSuggestions(false);
  };

  // Handle cell click to start editing
  const handleCellClick = (priceId: number, field: string, currentValue: string) => {
    setEditingCell({ priceId, field });
    setEditValue(currentValue);
  };

  // Save edited value with optimistic update
  const saveEdit = async (priceId: number, oldValue: string) => {
    if (editValue === oldValue) {
      setEditingCell(null);
      return;
    }

    if (isNaN(Number(editValue)) || Number(editValue) <= 0) {
      toast.error("Please enter a valid price");
      setEditingCell(null);
      setEditValue("");
      return;
    }

    // Optimistic update
    setProductPrices(prevPrices =>
      prevPrices.map(p =>
        p.id === priceId ? { ...p, price: editValue } : p
      )
    );
    setEditingCell(null);

    try {
      const response = await fetch("/api/product-prices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: priceId,
          price: Number(editValue),
        }),
      });

      if (!response.ok) throw new Error("Failed to update product price");

      toast.success("Price updated successfully");
    } catch (error) {
      console.error("Error updating product price:", error);

      // Revert on error
      setProductPrices(prevPrices =>
        prevPrices.map(p =>
          p.id === priceId ? { ...p, price: oldValue } : p
        )
      );

      toast.error("Failed to update price");
    }
  };

  // Handle key press in edit input
  const handleKeyPress = (e: React.KeyboardEvent, priceId: number, oldValue: string) => {
    if (e.key === 'Enter') {
      saveEdit(priceId, oldValue);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue("");
    }
  };

  // Delete product price
  const handleDeletePrice = async (priceId: number) => {
    try {
      const response = await fetch(`/api/product-prices?id=${priceId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete product price");
      setProductPrices(productPrices.filter(p => p.id !== priceId));
      toast.success("Product price deleted successfully");
    } catch (error) {
      console.error("Error deleting product price:", error);
      toast.error("Failed to delete product price");
    }
  };

  // Format price for display
  const formatPrice = (price: string | number) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice)) {
      return '₱0.00';
    }
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(numericPrice);
  };

  // Get suppliers with price counts
  const getSuppliersWithPrices = (): SupplierWithPrices[] => {
    return suppliers
      .map(supplier => ({
        ...supplier,
        priceCount: productPrices.filter(pp => pp.companyId === supplier.id).length,
      }));
  };

  // Get product prices for selected supplier
  const getSupplierPrices = () => {
    if (!selectedSupplier) return [];
    return productPrices.filter(pp => pp.companyId === selectedSupplier.id);
  };

  // Render supplier list view
  if (!selectedSupplier) {
    const suppliersWithPrices = getSuppliersWithPrices();

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Supplier Management</h1>
            <p className="text-muted-foreground">Select a supplier to manage their product prices</p>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead className="text-right">Number of Products</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : suppliersWithPrices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-10 text-muted-foreground">
                    No suppliers found. Please add suppliers from the Companies page to get started.
                  </TableCell>
                </TableRow>
              ) : (
                suppliersWithPrices.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    onClick={() => setSelectedSupplier(supplier)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{supplier.companyName}</TableCell>
                    <TableCell className="text-right">{supplier.priceCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Render product prices view for selected supplier
  const supplierPrices = getSupplierPrices();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedSupplier(null)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{selectedSupplier.companyName}</h1>
            <p className="text-muted-foreground">Manage product prices for this supplier</p>
          </div>
        </div>
        <Button onClick={() => {
          setNewPrice({
            productId: "",
            companyId: selectedSupplier.id.toString(),
            price: "",
          });
          setIsAddPriceOpen(true);
        }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Price
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : supplierPrices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  No prices found for this supplier. Add your first product price to get started.
                </TableCell>
              </TableRow>
            ) : (
              supplierPrices.map((productPrice) => (
                <TableRow key={productPrice.id}>
                  <TableCell className="font-medium">{productPrice.product.sku}</TableCell>
                  <TableCell>{productPrice.product.name}</TableCell>
                  <TableCell
                    onClick={() => handleCellClick(productPrice.id, 'price', productPrice.price)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {editingCell?.priceId === productPrice.id && editingCell?.field === 'price' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(productPrice.id, productPrice.price)}
                        onKeyDown={(e) => handleKeyPress(e, productPrice.id, productPrice.price)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      formatPrice(productPrice.price)
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeletePrice(productPrice.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Price Sheet */}
      <Sheet open={isAddPriceOpen} onOpenChange={setIsAddPriceOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-[540px]">
          <SheetHeader>
            <SheetTitle>Add Supplier Price</SheetTitle>
            <SheetDescription>Add a new price for a product from {selectedSupplier.companyName}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product</label>
              <div className="relative" ref={productInputRef}>
                <Input
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductSuggestions(true);
                    if (!e.target.value) {
                      setNewPrice({ ...newPrice, productId: "" });
                    }
                  }}
                  onFocus={() => setShowProductSuggestions(true)}
                  placeholder="Search by SKU or name..."
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                {showProductSuggestions && productSearch && filteredProducts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.slice(0, 50).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleProductSelect(product)}
                        className="w-full px-3 py-2 text-left hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                      >
                        <div className="font-medium text-sm">{product.sku}</div>
                        <div className="text-xs text-muted-foreground">{product.name}</div>
                      </button>
                    ))}
                  </div>
                )}
                {showProductSuggestions && productSearch && filteredProducts.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg p-3">
                    <p className="text-sm text-muted-foreground">No products found</p>
                  </div>
                )}
              </div>
              {selectedProduct && (
                <div className="text-xs text-muted-foreground">
                  Selected: {selectedProduct.sku} - {selectedProduct.name}
                </div>
              )}
            </div>

            <Field
              label="Price"
              type="text"
              value={newPrice.price}
              onChange={(value) => setNewPrice({ ...newPrice, price: value })}
              disabled={isSubmitting}
              placeholder="0.00"
            />

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Price'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
