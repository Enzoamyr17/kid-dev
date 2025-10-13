"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { X, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface QuotationCardProps {
  projectId: string;
  bidPercentage: number;
  clientDetails: Array<{
    id: string;
    companyName: string;
    tinNumber: string;
    address: string;
    contactPerson: string;
    contactNumber: string;
    email: string | null;
  }>; 
  approvedBudget: number;
  initialData?: unknown; // For creating new versions from existing quotations
}

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



function QuotationCard({ projectId, bidPercentage, clientDetails, approvedBudget, initialData }: QuotationCardProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState("products");
  const [users, setUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState<QuotationFormData>({
    quote_no: "",
    for_company_id: clientDetails[0].id,
    project_id: projectId,
    requestor_id: "",
    delivery_date: "",
    approved_budget: approvedBudget,
    bid_percentage: bidPercentage,
    supplier_price_vat_inclusive: "yes",
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

  const fetchUsers = async () => {
    const response = await fetch("/api/users");
    const data = await response.json();
    if (!response.ok) throw new Error("Failed to fetch users");
    setUsers(data);
  };

  useEffect(() => {
    fetchProducts();
    fetchUsers();
  }, []);

  const updateFormData = useCallback(<K extends keyof QuotationFormData>(
    field: K,
    value: QuotationFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

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

  const handleBidPercentageChange = async (percentage: number) => {
    updateFormData("bid_percentage", percentage);
    // Update all proposal prices based on new bid percentage, capped by ABC price
    setCart(cart.map(item => {
      const calculatedPrice = item.internalPrice * (1 + percentage / 100);
      let proposalPrice = item.abcPrice > 0 ? Math.min(calculatedPrice, item.abcPrice) : calculatedPrice;
      proposalPrice = Math.ceil(proposalPrice * 100) / 100;
      return { ...item, proposalPrice };
    }));

    const oldValue = bidPercentage;
    if (oldValue != percentage) {
      // Optimistic update
      setFormData(prev => ({ ...prev, bid_percentage: percentage }));

      try {
          const response = await fetch(`/api/projects/${projectId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bidPercentage: percentage }),
          });

          if (!response.ok) throw new Error("Failed to update");
          toast.success("Bid percentage updated");
          bidPercentage = percentage;
      } catch {
          // Revert on error
          setFormData(prev => ({ ...prev, bid_percentage: oldValue }));
          toast.error("Failed to update bid percentage");
      }
    }
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
        cart_items: cart.map(item => ({
          product_id: item.id,
          sku: item.sku,
          quantity: item.quantity,
          internal_price: item.internalPrice,
          proposal_price: item.proposalPrice,
          supplier: item.supplier,
        })),
        financials: {
          total_cost: financials.totalCost,
          total_bid_price: financials.totalBidPrice,
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
      setActiveTab("products");
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

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("QUOTATION", pageWidth / 2, 20, { align: "center" });

    // Client Details
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Client Information:", 14, 35);
    doc.setFont("helvetica", "normal");
    doc.text(`Company: ${clientDetails[0].companyName}`, 14, 42);
    doc.text(`Address: ${clientDetails[0].address}`, 14, 47);
    doc.text(`TIN: ${clientDetails[0].tinNumber}`, 14, 52);
    doc.text(`Contact Person: ${clientDetails[0].contactPerson}`, 14, 57);
    doc.text(`Contact Number: ${clientDetails[0].contactNumber}`, 14, 62);

    // Quotation Details
    doc.setFont("helvetica", "bold");
    doc.text("Quotation Details:", 120, 35);
    doc.setFont("helvetica", "normal");
    const requestor = users.find(u => u.id === formData.requestor_id);
    doc.text(`Requested By: ${requestor ? `${requestor.first_name} ${requestor.last_name}` : "N/A"}`, 120, 42);
    doc.text(`Payment Term: ${formData.payment_method || "N/A"}`, 120, 47);
    doc.text(`Delivery Term: ${formData.delivery_date || "N/A"}`, 120, 52);
    doc.text(`ABC: ₱${formData.approved_budget.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 120, 57);
    doc.text(`Bid Percentage: ${formData.bid_percentage}%`, 120, 62);

    // Items Table
    const tableData = cart.map(item => [
      item.sku,
      item.name,
      item.brand,
      item.quantity.toString(),
      `₱${item.internalPrice.toFixed(2)}`,
      item.supplier,
      `₱${(item.internalPrice * item.quantity).toFixed(2)}`,
      `₱${item.abcPrice.toFixed(2)}`,
      `₱${item.proposalPrice.toFixed(2)}`,
      `₱${(item.proposalPrice * item.quantity).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['SKU', 'Name', 'Brand', 'Qty', 'Internal Price', 'Supplier', 'Amount to Pay', 'ABC Price', 'Proposal Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20 },
        3: { cellWidth: 10 },
        4: { cellWidth: 20 },
        5: { cellWidth: 18 },
        6: { cellWidth: 22 },
        7: { cellWidth: 20 },
        8: { cellWidth: 20 },
        9: { cellWidth: 22 },
      },
    });

    // Financial Summary
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Financial Summary:", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    let currentY = finalY + 7;
    doc.text(`Total Bid Price (VAT-inclusive): ₱${financials.totalBidPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 14, currentY);
    currentY += 5;
    doc.text(`Total Cost: ₱${financials.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 14, currentY);
    currentY += 5;
    doc.text(`VAT Payable: ₱${financials.vatPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 14, currentY);
    currentY += 5;
    doc.text(`Gross Profit: ₱${financials.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 14, currentY);
    currentY += 5;
    doc.text(`Net Profit: ₱${financials.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 14, currentY);
    currentY += 5;
    doc.text(`Final Net Profit: ₱${financials.finalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 14, currentY);
    currentY += 5;
    doc.text(`Profit Margin: ${financials.netProfitMargin.toFixed(2)}%`, 14, currentY);

    // Save PDF
    const fileName = `Quotation_${formData.quote_no || 'Draft'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF exported successfully");
  };

  // Load initial data if provided (for creating new versions)
  useEffect(() => {
    if (initialData) {
      const data = initialData as {
        details?: {
          forCompanyId?: string;
          requestorId?: string;
          deliveryDate?: string;
          approvedBudget?: string;
          bidPercentage?: number;
          paymentMethod?: string;
        };
        formItems?: Array<{
          product?: {
            id?: string;
            sku?: string;
            name?: string;
            description?: string;
            brand?: string;
            category?: string;
            subCategory?: string;
            adCategory?: string;
            uom?: string;
            isActive?: boolean;
          };
          quantity?: string;
          supplierPrice?: string;
          supplierName?: string;
          clientPrice?: string;
        }>;
      };

      // Load form data from initial quotation
      setFormData({
        quote_no: "", // New quote number will be generated
        for_company_id: data.details?.forCompanyId || clientDetails[0].id,
        project_id: projectId,
        requestor_id: data.details?.requestorId || "",
        delivery_date: data.details?.deliveryDate || "",
        approved_budget: data.details?.approvedBudget ? parseInt(data.details.approvedBudget) / 100 : approvedBudget,
        bid_percentage: data.details?.bidPercentage || bidPercentage,
        supplier_price_vat_inclusive: "yes",
        payment_method: data.details?.paymentMethod || "",
        ewt_percentage: 1,
        contingency_percentage: 5,
        loan_interest_percentage: 3,
        loan_months: 0,
      });

      // Load cart items from initial quotation
      if (data.formItems && data.formItems.length > 0) {
        const cartItems: CartItem[] = data.formItems.map((item) => ({
          id: item.product?.id || "",
          sku: item.product?.sku || "",
          name: item.product?.name || "",
          description: item.product?.description || "",
          brand: item.product?.brand || "",
          category: item.product?.category || "",
          subCategory: item.product?.subCategory || "",
          adCategory: item.product?.adCategory || "",
          uom: item.product?.uom || "",
          isActive: item.product?.isActive || true,
          quantity: parseInt(item.quantity || "1"),
          internalPrice: parseInt(item.supplierPrice || "0") / 100,
          supplier: item.supplierName || "OFPS",
          abcPrice: 0, // Reset ABC price for new version
          proposalPrice: parseInt(item.clientPrice || "0") / 100,
        }));
        setCart(cartItems);
      }

      // Switch to form tab
      setActiveTab("form");
      toast.success("Quotation data loaded. Update and save as new version.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  return (
    <div className="flex flex-col justify-start items-center gap-1 h-full w-full border rounded-lg">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col justify-start items-center gap-1 h-full w-full mt-2">

        {/* Tabs List */}
        <TabsList className="">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="form">Form</TabsTrigger>
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
        <TabsContent value="form" className="w-full">
          <div className="bg-sidebar border border-blue-900/10 w-full p-6">
            <h2 className="text-xl font-semibold mb-6">New Quotation</h2>
            <div className="flex justify-between items-center gap-6 py-2 border-b border-zinc-200 pb-6">
              {/* Left */}
              <div className="flex flex-col justify-between divide-y divide-zinc-200 w-1/2 min-h-32">
                <div className="flex justify-between items-start w-full">
                  <h1 className="text-sm font-medium text-muted-foreground">Client:</h1>
                  <h1 className="text-md font-medium text-right">{clientDetails[0].companyName}</h1>
                </div>
                <div className="flex justify-between items-start w-full">
                  <h1 className="text-sm font-medium text-muted-foreground">Contact Person:</h1>
                  <h1 className="text-md font-medium text-right">{clientDetails[0].contactPerson}</h1>
                </div>
                <div className="flex justify-between items-start w-full">
                  <h1 className="text-sm font-medium text-muted-foreground">Contact Number:</h1>
                  <h1 className="text-md font-medium text-right">{clientDetails[0].contactNumber}</h1>
                </div>
              </div>

              <div className="flex flex-col justify-between divide-y divide-zinc-200 w-1/2 min-h-32">
                <div className="flex justify-between items-start w-full">
                  <h1 className="text-sm font-medium text-muted-foreground">Address:</h1>
                  <h1 className="text-md font-medium text-right">{clientDetails[0].address}</h1>
                </div>
                <div className="flex justify-between items-start w-full">
                  <h1 className="text-sm font-medium text-muted-foreground">TIN:</h1>
                  <h1 className="text-md font-medium text-right">{clientDetails[0].tinNumber}</h1>
                </div>
                <div className="flex justify-between items-start w-full">
                  <h1 className="text-sm font-medium text-muted-foreground">Email:</h1>
                  <h1 className="text-md font-medium text-right">{clientDetails[0].email ?? "Unavailable"}</h1>
                </div>

              </div>
            </div>
            {/* Basic Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 mt-2">
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
                label={<>Payment Term</>}
                placeholder="Enter payment Term"
                value={formData.payment_method}
                onChange={(value) => updateFormData("payment_method", value)}
                className="h-10"
              />

              <Field
                type="text"
                label={<>Delivery Term <span className="text-red-500">*</span></>}
                placeholder="Enter delivery term"
                value={formData.delivery_date}
                onChange={(value) => updateFormData("delivery_date", value)}
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
              <Button variant="outline" onClick={handleExportPDF} disabled={cart.length === 0}>
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
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

      </Tabs>
    </div>
  );
}

export default QuotationCard;