"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  brand: string;
  category: string;
  subCategory: string;
  adCategory: string;
  uom: string;
  isActive: boolean;
}

interface CartItem extends Product {
  quantity: number;
  internalPrice: number;
  supplier: string;
  abcPrice: number;
  proposalPrice: number;
}

interface Company {
  id: string;
  companyName: string;
  type: string;
}

interface Project {
  id: string;
  code: string;
  company_id: string;
  description: string;
  company: Company;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface QuotationFormData {
  // Basic Info
  quote_no: string;
  for_company_id: string;
  project_id: string;
  requestor_id: string;
  delivery_date: string;
  approved_budget: number;

  // Pricing & Settings
  bid_percentage: number;
  supplier_price_vat_inclusive: "yes" | "no";
  payment_method: string;

  // Tax & Financial
  ewt_percentage: number;
  contingency_percentage: number;
  loan_interest_percentage: number;
  loan_months: number;
}



export default function QuotationPage(){
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState("products");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState<QuotationFormData>({
    quote_no: "",
    for_company_id: "",
    project_id: "",
    requestor_id: "",
    delivery_date: "",
    approved_budget: 0,
    bid_percentage: 15,
    supplier_price_vat_inclusive: "no",
    payment_method: "",
    ewt_percentage: 1,
    contingency_percentage: 5,
    loan_interest_percentage: 3,
    loan_months: 0,
  });

  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = async () => {
    const response = await fetch("/api/products");
    const data = await response.json();
    if (!response.ok) throw new Error("Failed to fetch products");
    setProducts(data);
  };

  const fetchCompanies = async () => {
    const response = await fetch("/api/companies");
    const data = await response.json();
    if (!response.ok) throw new Error("Failed to fetch companies");
    setCompanies(data);
  };

  const fetchProjects = async () => {
    const response = await fetch("/api/projects");
    const data = await response.json();
    if (!response.ok) throw new Error("Failed to fetch projects");
    setProjects(data);
  };

  const fetchUsers = async () => {
    const response = await fetch("/api/users");
    const data = await response.json();
    if (!response.ok) throw new Error("Failed to fetch users");
    setUsers(data);
  };

  useEffect(() => {
    fetchProducts();
    fetchCompanies();
    fetchProjects();
    fetchUsers();
  }, []);

  const updateFormData = useCallback(<K extends keyof QuotationFormData>(
    field: K,
    value: QuotationFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Filter projects when company changes
  useEffect(() => {
    if (formData.for_company_id) {
      const filtered = projects.filter(p => p.company_id === formData.for_company_id);
      setFilteredProjects(filtered);
      // Reset project if not in filtered list
      if (formData.project_id && !filtered.find(p => p.id === formData.project_id)) {
        updateFormData("project_id", "");
      }
    } else {
      setFilteredProjects([]);
      updateFormData("project_id", "");
    }
  }, [formData.for_company_id, formData.project_id, projects, updateFormData]);

  const handleAddToCart = (product: Product) => {
    const existingItem = cart.find(item => item.sku === product.sku);

    if (existingItem) {
      // Increment quantity if already in cart
      setCart(cart.map(item =>
        item.sku === product.sku
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item with default internal price of 0
      const basePrice = 0;
      const calculatedPrice = basePrice * (1 + formData.bid_percentage / 100);
      const proposalPrice = calculatedPrice; // ABC is 0 by default, so no cap initially

      const newItem: CartItem = {
        ...product,
        quantity: 1,
        internalPrice: basePrice,
        supplier: "OFPS",
        abcPrice: 0,
        proposalPrice: proposalPrice,
      };
      setCart([...cart, newItem]);
    }
  };

  const handleRemoveFromCart = (sku: string) => {
    setCart(cart.filter(item => item.sku !== sku));
  };

  const handleUpdateQuantity = (sku: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(cart.map(item =>
      item.sku === sku ? { ...item, quantity } : item
    ));
  };

  const handleUpdateInternalPrice = (sku: string, price: number) => {
    setCart(cart.map(item => {
      if (item.sku === sku) {
        const calculatedPrice = price * (1 + formData.bid_percentage / 100);
        const newProposalPrice = item.abcPrice > 0 ? Math.min(calculatedPrice, item.abcPrice) : calculatedPrice;
        return { ...item, internalPrice: price, proposalPrice: newProposalPrice };
      }
      return item;
    }));
  };

  const handleUpdateProposalPrice = (sku: string, price: number) => {
    setCart(cart.map(item => {
      if (item.sku === sku) {
        const cappedPrice = item.abcPrice > 0 ? Math.min(price, item.abcPrice) : price;
        return { ...item, proposalPrice: cappedPrice };
      }
      return item;
    }));
  };

  const handleUpdateABCPrice = (sku: string, price: number) => {
    setCart(cart.map(item => {
      if (item.sku === sku) {
        // Cap proposal price if it exceeds new ABC price
        const cappedProposalPrice = price > 0 ? Math.min(item.proposalPrice, price) : item.proposalPrice;
        return { ...item, abcPrice: price, proposalPrice: cappedProposalPrice };
      }
      return item;
    }));
  };

  const handleUpdateSupplier = (sku: string, supplier: string) => {
    setCart(cart.map(item =>
      item.sku === sku ? { ...item, supplier } : item
    ));
  };

  const handleBidPercentageChange = (percentage: number) => {
    updateFormData("bid_percentage", percentage);
    // Update all proposal prices based on new bid percentage, capped by ABC price
    setCart(cart.map(item => {
      const calculatedPrice = item.internalPrice * (1 + percentage / 100);
      let proposalPrice = item.abcPrice > 0 ? Math.min(calculatedPrice, item.abcPrice) : calculatedPrice;
      proposalPrice = Math.ceil(proposalPrice * 100) / 100;
      return { ...item, proposalPrice };
    }));
  };

  // Financial Calculations based on Philippine tax regulations
  const calculateFinancials = () => {
    const VAT_RATE = 0.12;
    const INCOME_TAX_RATE = 0.25;

    const totalInternal = cart.reduce((sum, item) => sum + (item.internalPrice * item.quantity), 0);
    const totalProposal = cart.reduce((sum, item) => sum + (item.proposalPrice * item.quantity), 0);

    // Bid price is always VAT-inclusive
    const totalBidPrice = totalProposal;
    const vatExcludedSales = totalBidPrice / (1 + VAT_RATE);
    const outputVat = totalBidPrice - vatExcludedSales;

    // Cost calculation depends on whether supplier prices include VAT
    let totalCost: number;
    let vatExcludedCost: number;
    let inputVat: number;

    if (formData.supplier_price_vat_inclusive === "yes") {
      // Supplier prices already include VAT
      totalCost = totalInternal;
      vatExcludedCost = totalCost / (1 + VAT_RATE);
      inputVat = totalCost - vatExcludedCost;
    } else {
      // Supplier prices don't include VAT, need to add it
      vatExcludedCost = totalInternal;
      inputVat = vatExcludedCost * VAT_RATE;
      totalCost = vatExcludedCost + inputVat;
    }

    const vatPayable = outputVat - inputVat;
    const grossProfit = vatExcludedSales - vatExcludedCost;
    const ewtAmount = vatExcludedSales * (formData.ewt_percentage / 100);
    const incomeTax25 = grossProfit * INCOME_TAX_RATE;
    const finalIncomeTax = Math.max(0, incomeTax25 - ewtAmount);

    const netProfit = grossProfit - finalIncomeTax;
    const contingencyAmount = totalCost * (formData.contingency_percentage / 100);
    const finalNetProfit = netProfit - contingencyAmount;
    const netProfitMargin = totalInternal > 0 ? (netProfit / totalInternal) * 100 : 0;

    // Loan calculations (based on Total Cost)
    const calculatedLoanAmount = formData.loan_months > 0 ? totalCost : 0;
    const loanInterest = calculatedLoanAmount * (formData.loan_interest_percentage / 100) * formData.loan_months;
    const netProfitWithLoan = finalNetProfit - loanInterest;

    return {
      totalBidPrice,
      vatExcludedSales,
      outputVat,
      totalCost,
      vatExcludedCost,
      inputVat,
      vatPayable,
      grossProfit,
      ewtAmount,
      incomeTax25,
      finalIncomeTax,
      netProfit,
      contingencyAmount,
      finalNetProfit,
      netProfitMargin,
      loanAmount: calculatedLoanAmount,
      loanInterest,
      netProfitWithLoan,
    };
  };

  const financials = calculateFinancials();

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveQuotation = async () => {
    // Validate required fields
    if (!formData.for_company_id) {
      toast.error("Please select a client");
      return;
    }
    if (!formData.project_id) {
      toast.error("Please select a project");
      return;
    }
    if (cart.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        quote_no: formData.quote_no || "", // Will be auto-generated if empty
        company_id: formData.for_company_id,
        project_id: formData.project_id,
        requestor_id: formData.requestor_id || null,
        delivery_date: formData.delivery_date || null,
        approved_budget: formData.approved_budget,
        bid_percentage: formData.bid_percentage,
        payment_method: formData.payment_method || null,
        cartItems: cart.map(item => ({
          productId: item.id,
          sku: item.sku,
          quantity: item.quantity,
          internalPrice: item.internalPrice,
          proposalPrice: item.proposalPrice,
          supplier: item.supplier,
        })),
        financials: {
          totalCost: financials.totalCost,
          totalBidPrice: financials.totalBidPrice,
        },
      };

      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save quotation");
      }

      const result = await response.json();
      toast.success(`Quotation saved successfully! Quote No: ${result.quotationDetail.quote_no}`);

      // Clear form after successful save
      handleClearForm();
      setActiveTab("list");
    } catch (error) {
      console.error("Error saving quotation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save quotation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearForm = () => {
    setFormData({
      quote_no: "",
      for_company_id: "",
      project_id: "",
      requestor_id: "",
      delivery_date: "",
      approved_budget: 0,
      bid_percentage: 15,
      supplier_price_vat_inclusive: "no",
      payment_method: "",
      ewt_percentage: 1,
      contingency_percentage: 5,
      loan_interest_percentage: 3,
      loan_months: 0,
    });
    setCart([]);
  };

  return (
    <div className="flex flex-col justify-start items-center gap-1 h-full w-full">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col justify-start items-center gap-1 h-full w-full">

        {/* Tabs List */}
        <TabsList className="">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="form">Form</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="w-full p-2">
          <div className="bg-sidebar border border-blue-900/10 rounded-lg w-full h-auto max-h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Adtl. Category</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.sku}>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.brand}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.subCategory}</TableCell>
                    <TableCell>{product.adCategory}</TableCell>
                    <TableCell>{product.uom}</TableCell>
                    <TableCell className="min-w-28 flex justify-center items-center">
                    {cart.some(item => item.sku === product.sku) ? (
                      <Button
                        variant="outline"
                        onClick={() => handleRemoveFromCart(product.sku)}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleAddToCart(product)}
                      >
                        Add
                      </Button>
                    )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Form Tab */}
        <TabsContent value="form" className="w-full p-2">
          <div className="bg-sidebar border border-blue-900/10 rounded-lg w-full p-6">
            <h2 className="text-xl font-semibold mb-6">New Quotation</h2>

            {/* Basic Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Field
                type="text"
                label={<>Quote No. <span className="text-red-500">*</span></>}
                placeholder="Auto-generated if empty"
                value={formData.quote_no}
                onChange={(value) => updateFormData("quote_no", value)}
                className="h-10"
              />

              <Field
                type="select"
                label={<>Client <span className="text-red-500">*</span></>}
                placeholder="Select client"
                value={formData.for_company_id}
                onChange={(value) => updateFormData("for_company_id", value)}
                options={companies.map(c => ({ value: c.id, label: c.companyName }))}
                className="h-10"
              />

              <Field
                type="select"
                label={<>Project <span className="text-red-500">*</span></>}
                placeholder="Select project"
                value={formData.project_id}
                onChange={(value) => updateFormData("project_id", value)}
                options={filteredProjects.map(p => ({ value: p.id, label: `${p.code} - ${p.description}` }))}
                className="h-10"
              />

              <Field
                type="select"
                label={<>Requested By <span className="text-red-500">*</span></>}
                placeholder="Select requestor"
                value={formData.requestor_id}
                onChange={(value) => updateFormData("requestor_id", value)}
                options={users.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))}
                className="h-10"
              />

              <Field
                type="text"
                label={<>Payment Method</>}
                placeholder="Enter payment method"
                value={formData.payment_method}
                onChange={(value) => updateFormData("payment_method", value)}
                className="h-10"
              />

              <Field
                type="date"
                label={<>Date Required <span className="text-red-500">*</span></>}
                placeholder="Select date"
                value={formData.delivery_date ? new Date(formData.delivery_date) : undefined}
                onChange={(value) => updateFormData("delivery_date", value ? value.toISOString().split('T')[0] : "")}
                className="h-10"
              />

              <Field
                type="number"
                label="Approved Budget Cost (ABC)"
                placeholder="0.00"
                value={formData.approved_budget}
                onChange={(value) => updateFormData("approved_budget", value)}
                decimals={2}
                className="h-10"
              />

              <Field
                type="number"
                label="Bid Percentage (Markup %)"
                placeholder="40"
                value={formData.bid_percentage}
                onChange={handleBidPercentageChange}
                decimals={2}
                className="h-10"
              />

              <Field
                type="select"
                label="Supplier Price VAT Inclusive?"
                value={formData.supplier_price_vat_inclusive}
                onChange={(value) => updateFormData("supplier_price_vat_inclusive", value as "yes" | "no")}
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Yes" }
                ]}
                className="h-10"
              />
            </div>


            {/* Items Table */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Items / Products</h3>
                {cart.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("products")}
                  >
                    Add Products
                  </Button>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead colSpan={4} className="text-left text-xs font-semibold border-r-2 border-border bg-slate-100">PRODUCT DETAILS</TableHead>
                      <TableHead colSpan={3} className="text-left text-xs font-semibold border-r-2 border-border bg-amber-50">INTERNAL PRICING</TableHead>
                      <TableHead colSpan={4} className="text-left text-xs font-semibold bg-blue-50">CLIENT PRICING</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="border-r">Item Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="border-r-2 border-border">Brand</TableHead>
                      <TableHead className="bg-amber-50/30">Internal Price</TableHead>
                      <TableHead className="bg-amber-50/30">Supplier</TableHead>
                      <TableHead className="border-r-2 border-border bg-amber-50/30">Amount to Pay</TableHead>
                      <TableHead className="bg-blue-50/30">ABC Price</TableHead>
                      <TableHead className="bg-blue-50/30">Quantity</TableHead>
                      <TableHead className="bg-blue-50/30">Proposal Price</TableHead>
                      <TableHead className="bg-blue-50/30">Total Amount</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                          No items added yet. Please add products from the Products tab.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cart.map((item) => (
                        <TableRow key={item.sku} className="hover:bg-muted/50">
                          {/* Product Details */}
                          <TableCell className="border-r">
                            <span className="text-xs font-mono">{item.sku}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium">{item.name}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </TableCell>
                          <TableCell className="border-r-2 border-border">
                            <span className="text-xs">{item.brand}</span>
                          </TableCell>

                          {/* Internal Pricing bat ganon */}
                          <TableCell className="bg-amber-50/20">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium">₱</span>
                              <Field
                                type="number"
                                value={item.internalPrice}
                                onChange={(value) => handleUpdateInternalPrice(item.sku, value)}
                                decimals={2}
                                className="h-8 text-xs w-24 font-medium"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="bg-amber-50/20">
                            <Field
                              type="select"
                              value={item.supplier}
                              onChange={(value) => handleUpdateSupplier(item.sku, value)}
                              options={[
                                { value: "OFPS", label: "OFPS" },
                                { value: "Shopee", label: "Shopee" },
                                { value: "P-lim", label: "P-lim" }
                              ]}
                              className="h-8 text-xs w-full"
                            />
                          </TableCell>
                          <TableCell className="border-r-2 border-border bg-amber-50/20">
                            <span className="text-xs font-bold">₱{(item.internalPrice * item.quantity).toFixed(2)}</span>
                          </TableCell>

                          {/* Client Pricing */}
                          <TableCell className="bg-blue-50/20">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium">₱</span>
                              <Field
                                type="number"
                                value={item.abcPrice}
                                onChange={(value) => handleUpdateABCPrice(item.sku, value)}
                                decimals={2}
                                className="h-8 text-xs w-24"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="bg-blue-50/20">
                            <Field
                              type="number"
                              value={item.quantity}
                              onChange={(value) => handleUpdateQuantity(item.sku, Math.round(value))}
                              decimals={2}
                              className="h-8 text-xs w-16"
                            />
                          </TableCell>
                          <TableCell className="bg-blue-50/20">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium">₱</span>
                              <Field
                                type="number"
                                value={item.proposalPrice}
                                onChange={(value) => handleUpdateProposalPrice(item.sku, value)}
                                decimals={2}
                                className="h-8 text-xs w-24 font-medium border-blue-300"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="bg-blue-50/20">
                            <span className="text-xs font-bold">₱{(item.proposalPrice * item.quantity).toFixed(2)}</span>
                          </TableCell>

                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleRemoveFromCart(item.sku)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="border rounded-lg p-6 bg-muted/30 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6 pb-6 border-b">
                {/* Bid Price Column */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Bid Price (VAT-inclusive)</h4>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>VAT-excluded Sales Revenue:</span>
                    <span>₱{financials.vatExcludedSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Output VAT (12%):</span>
                    <span>₱{financials.outputVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold">Total Bid Price:</span>
                    <span className="font-bold text-blue-600">₱{financials.totalBidPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Cost Column */}
                <div className="space-y-2 border-l pl-6">
                  <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">Cost {formData.supplier_price_vat_inclusive === "yes" ? "(VAT-inclusive)" : "(VAT-exclusive)"}</h4>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>VAT-excluded Cost:</span>
                    <span>₱{financials.vatExcludedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Input VAT (12%):</span>
                    <span>₱{financials.inputVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold">Total Cost:</span>
                    <span className="font-bold text-amber-600">₱{financials.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Tax Summary Column */}
                <div className="space-y-2 border-l pl-6">
                  <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">Tax Summary</h4>
                  <div className="flex justify-between text-xs">
                    <span>VAT Payable to BIR:</span>
                    <span className="font-medium">₱{financials.vatPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Gross Profit:</span>
                    <span className="font-medium">₱{financials.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs items-center">
                    <span>EWT:</span>
                    <div className="flex items-center gap-2">
                      <Field
                        type="number"
                        value={formData.ewt_percentage}
                        onChange={(value) => updateFormData("ewt_percentage", value)}
                        className="h-7 w-16 text-xs text-right"
                      />
                      <span className="text-xs">%</span>
                      <span className="text-xs text-muted-foreground">= ₱{financials.ewtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Calculations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Tax & Contingency */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Income Tax @ 25%:</span>
                    <span className="font-medium">₱{financials.incomeTax25.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>EWT ({formData.ewt_percentage}%):</span>
                    <span>₱{financials.ewtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Final Income Tax (Less EWT):</span>
                    <span className="font-medium">₱{financials.finalIncomeTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Net Profit (Gross - Tax):</span>
                    <span className="font-medium text-green-600">₱{financials.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span>Contingency:</span>
                    <div className="flex items-center gap-2">
                      <Field
                        type="number"
                        value={formData.contingency_percentage}
                        onChange={(value) => updateFormData("contingency_percentage", value)}
                        className="h-7 w-16 text-xs text-right"
                      />
                      <span className="text-xs">%</span>
                      <span className="text-xs text-muted-foreground">= ₱{financials.contingencyAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span>Final Net Profit:</span>
                    <span className="text-green-600">₱{financials.finalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground pt-1">
                    <span>Profit Margin:</span>
                    <span className="font-bold text-green-600">{financials.netProfitMargin.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Loan Calculations */}
                <div className="space-y-2 border-l pl-6">
                  <div className="flex justify-between text-sm">
                    <span>Capital Loan % Interest:</span>
                    <div className="flex items-center gap-2">
                      <Field
                        type="number"
                        value={formData.loan_interest_percentage}
                        onChange={(value) => updateFormData("loan_interest_percentage", value)}
                        className="h-7 w-16 text-xs text-right"
                      />
                      <span className="text-xs">%</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Number of Months:</span>
                    <Field
                      type="number"
                      value={formData.loan_months}
                      onChange={(value) => updateFormData("loan_months", value)}
                      className="h-7 w-16 text-xs text-right"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Loan Amount (Total Cost):</span>
                    <span>₱{financials.loanAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Loan Interest:</span>
                    <span>₱{financials.loanInterest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span>Net Profit (with Loan):</span>
                    <span className="text-green-600">₱{financials.netProfitWithLoan.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={handleClearForm} disabled={isSaving}>Clear Form</Button>
              <Button onClick={handleSaveQuotation} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Quotation"
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list">
          <div>List</div>
        </TabsContent>

      </Tabs>
    </div>
  );
}