"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { X } from "lucide-react";

interface Product {
  sku: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  additionalCategory: string;
  uom: string;
  basePrice: number;
}

interface CartItem extends Product {
  quantity: number;
  internalPrice: number;
  supplier: string;
  abcPrice: number;
  proposalPrice: number;
}

const products: Product[] = [
  {
    sku: "PAP-000001",
    name: "Hard Copy Paper (Substance 20) - A4",
    brand: "Advance",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy20",
    basePrice: 185.50,
  },
  {
    sku: "PAP-000002",
    name: "Hard Copy Paper (Substance 20) - Legal (8.5x13)",
    brand: "Advance",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy20",
    basePrice: 195.75,
  },
  {
    sku: "PAP-000003",
    name: "Hard Copy Paper (Substance 20) - Letter",
    brand: "Advance",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy20",
    basePrice: 188.25,
  },
  {
    sku: "PAP-000004",
    name: "Hard Copy Paper (Substance 24) - A4",
    brand: "Advance",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy24",
    basePrice: 215.00,
  },
  {
    sku: "PAP-000005",
    name: "Hard Copy Paper (Substance 24) - Legal (8.5x13)",
    brand: "Advance",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy24",
    basePrice: 228.50,
  },
  {
    sku: "PAP-000006",
    name: "Hard Copy Paper (Substance 24) - Letter",
    brand: "Advance",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy24",
    basePrice: 220.00,
  },
  {
    sku: "STG-000001",
    name: "ADVANCE BALIKBAYAN BOX (20X20X20 IN) - BROWN",
    brand: "Advance",
    category: "School and Office Supplies",
    subcategory: "Storage Solutions",
    additionalCategory: "Balikbayan Boxes",
    uom: "Box - Balikbayan",
    basePrice: 450.00,
  },
  {
    sku: "STG-000002",
    name: "ADVANCE BALIKBAYAN BOX (20X20X20 IN) - WHITE",
    brand: "Advance",
    category: "School and Office Supplies",
    subcategory: "Storage Solutions",
    additionalCategory: "Balikbayan Boxes",
    uom: "Box - Balikbayan",
    basePrice: 475.00,
  },
  {
    sku: "STG-000003",
    name: "ADVANCE STORE-ALL (10.25X12.5X15.75)",
    brand: "Advance",
    category: "School and Office Supplies",
    subcategory: "Storage Solutions",
    additionalCategory: "Storage Boxes",
    uom: "Box - Storage",
    basePrice: 325.00,
  },
  {
    sku: "PAP-000007",
    name: "A-Plus Copy Paper (Substance 20) - A4",
    brand: "A-Plus",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy20",
    basePrice: 165.00,
  },
  {
    sku: "PAP-000008",
    name: "A-Plus Copy Paper (Substance 20) - Legal",
    brand: "A-Plus",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy20",
    basePrice: 175.50,
  },
  {
    sku: "PAP-000009",
    name: "A-Plus Copy Paper (Substance 20) - Letter",
    brand: "A-Plus",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy20",
    basePrice: 168.75,
  },
  {
    sku: "PAP-000010",
    name: "A-Plus Copy Paper (Substance 24) - A4",
    brand: "A-Plus",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy24",
    basePrice: 198.00,
  },
  {
    sku: "PAP-000011",
    name: "A-Plus Copy Paper (Substance 24) - Legal",
    brand: "A-Plus",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy24",
    basePrice: 210.25,
  },
  {
    sku: "PAP-000012",
    name: "A-Plus Copy Paper (Substance 24) - Letter",
    brand: "A-Plus",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy24",
    basePrice: 203.50,
  },
  {
    sku: "PAP-000013",
    name: "A-Plus Copy Paper (Substance 24) - Legal",
    brand: "A-Plus",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy24",
    basePrice: 212.00,
  },
  {
    sku: "PAP-000014",
    name: "A-Plus Copy Paper (Substance 24) - Letter",
    brand: "A-Plus",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy24",
    basePrice: 205.00,
  },
  {
    sku: "PAP-000015",
    name: "A-Plus Copy Paper (Substance 24) - Legal",
    brand: "A-Plus",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy24",
    basePrice: 213.75,
  },
  {
    sku: "PAP-000016",
    name: "A-Plus Copy Paper (Substance 24) - Letter",
    brand: "A-Plus",
    category: "School and Office Supplies",
    subcategory: "Paper Products",
    additionalCategory: "Copy Paper",
    uom: "Paper - Copy24",
    basePrice: 207.50,
  },
];

export default function QuotationPage(){
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState("products");
  const [bidPercentage, setBidPercentage] = useState(15);
  const [supplierPriceVatInclusive, setSupplierPriceVatInclusive] = useState("no");
  const [ewtPercentage, setEwtPercentage] = useState(1);
  const [contingencyPercentage, setContingencyPercentage] = useState(5);
  const [loanInterestPercentage, setLoanInterestPercentage] = useState(3);
  const [loanMonths, setLoanMonths] = useState(0);

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
      // Add new item with product's base price
      const calculatedPrice = product.basePrice * (1 + bidPercentage / 100);
      const proposalPrice = calculatedPrice; // ABC is 0 by default, so no cap initially

      const newItem: CartItem = {
        ...product,
        quantity: 1,
        internalPrice: product.basePrice,
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
        const calculatedPrice = price * (1 + bidPercentage / 100);
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

  const handleUpdateSupplierPriceVatInclusive = (value: string) => {
    setSupplierPriceVatInclusive(value);
  };

  const handleBidPercentageChange = (percentage: number) => {
    setBidPercentage(percentage);
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

    if (supplierPriceVatInclusive === "yes") {
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
    const ewtAmount = vatExcludedSales * (ewtPercentage / 100);
    const incomeTax25 = grossProfit * INCOME_TAX_RATE;
    const finalIncomeTax = Math.max(0, incomeTax25 - ewtAmount);

    const netProfit = grossProfit - finalIncomeTax;
    const contingencyAmount = totalCost * (contingencyPercentage / 100);
    const finalNetProfit = netProfit - contingencyAmount;
    const netProfitMargin = totalInternal > 0 ? (netProfit / totalInternal) * 100 : 0;

    // Loan calculations (based on Total Cost)
    const calculatedLoanAmount = loanMonths > 0 ? totalCost : 0;
    const loanInterest = calculatedLoanAmount * (loanInterestPercentage / 100) * loanMonths;
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
          <div className="bg-sidebar border border-blue-900/10 rounded-lg w-full h-full">
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
                    <TableCell>{product.subcategory}</TableCell>
                    <TableCell>{product.additionalCategory}</TableCell>
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
                placeholder="RFQ25-0001"
                className="h-10"
              />

              <Field
                type="text"
                label={<>Client <span className="text-red-500">*</span></>}
                placeholder="Enter client name"
                className="h-10"
              />

              <Field
                type="text"
                label={<>Requested By <span className="text-red-500">*</span></>}
                placeholder="Enter requester name"
                className="h-10"
              />

              <Field
                type="text"
                label={<>Department <span className="text-red-500">*</span></>}
                placeholder="Enter department"
                className="h-10"
              />

              <Field
                type="date"
                label={<>Date Required <span className="text-red-500">*</span></>}
                placeholder="Select date"
                className="h-10"
              />

              <Field
                type="number"
                label="Approved Budget Cost (ABC)"
                placeholder="0.00"
                decimals={2}
                className="h-10"
              />

              <Field
                type="number"
                label="Bid Percentage (Markup %)"
                placeholder="40"
                value={bidPercentage}
                onChange={handleBidPercentageChange}
                decimals={2}
                className="h-10"
              />

              <Field
                type="select"
                label="Supplier Price VAT Inclusive?"
                value={supplierPriceVatInclusive}
                onChange={(value) => handleUpdateSupplierPriceVatInclusive(value)}
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
                            <span className="text-xs text-muted-foreground">{item.subcategory}</span>
                          </TableCell>
                          <TableCell className="border-r-2 border-border">
                            <span className="text-xs">{item.brand}</span>
                          </TableCell>

                          {/* Internal Pricing */}
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
                  <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">Cost {supplierPriceVatInclusive === "yes" ? "(VAT-inclusive)" : "(VAT-exclusive)"}</h4>
                  
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
                        value={ewtPercentage}
                        onChange={setEwtPercentage}
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
                    <span>EWT ({ewtPercentage}%):</span>
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
                        value={contingencyPercentage}
                        onChange={setContingencyPercentage}
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
                        value={loanInterestPercentage}
                        onChange={setLoanInterestPercentage}
                        className="h-7 w-16 text-xs text-right"
                      />
                      <span className="text-xs">%</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Number of Months:</span>
                    <Field
                      type="number"
                      value={loanMonths}
                      onChange={setLoanMonths}
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
              <Button variant="outline">Clear Form</Button>
              <Button>Save Quotation</Button>
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