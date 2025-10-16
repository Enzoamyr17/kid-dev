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
  onSaveSuccess?: () => void;
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
  firstName: string;
  lastName: string;
  email: string;
}

interface QuotationFormData {
  // Basic Info
  code: string;
  forCompanyId: string;
  projectId: string;
  requestorId: string;
  deliveryTerm: string;
  approvedBudget: number;

  // Pricing & Settings
  bidPercentage: number;
  supplierPriceVatInclusive: "yes" | "no";
  paymentTerm: string;

  // Tax & Financial
  ewtPercentage: number;
  contingencyPercentage: number;
  loanInterestPercentage: number;
  loanMonths: number;
}



function QuotationCard({ projectId, bidPercentage, clientDetails, approvedBudget, initialData, onSaveSuccess }: QuotationCardProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState("products");
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const [formData, setFormData] = useState<QuotationFormData>({
    code: "",
    forCompanyId: clientDetails[0]?.id || "",
    projectId: projectId,
    requestorId: "",
    deliveryTerm: "",
    approvedBudget: approvedBudget,
    bidPercentage: bidPercentage,
    supplierPriceVatInclusive: "yes",
    paymentTerm: "",
    ewtPercentage: 1,
    contingencyPercentage: 5,
    loanInterestPercentage: 3,
    loanMonths: 0,
  });

  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = async () => {
    const response = await fetch("/api/products?active=true");
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

  const [currentUserName, setCurrentUserName] = useState<string>("");

  const fetchCurrentUserId = async () => {
    try {
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const data = await response.json();
        if (data.user && data.user.id) {
          setCurrentUserId(data.user.id);
          formData.requestorId = data.user.id;
          setCurrentUserName(data.user.name);
        }
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error);
    }
  };
  

  useEffect(() => {
    fetchProducts();
    fetchUsers();
    fetchCurrentUserId();
  }, []);

  // Auto-populate requestor_id when currentUserId is set
  useEffect(() => {
    if (currentUserId) {
      setFormData(prev => ({ ...prev, requestorId: currentUserId }));
    }
  }, [currentUserId]);

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
      const calculatedPrice = basePrice * (1 + formData.bidPercentage / 100);
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
        const calculatedPrice = price * (1 + formData.bidPercentage / 100);
        let newProposalPrice = item.abcPrice > 0 ? Math.min(calculatedPrice, item.abcPrice) : calculatedPrice;
        newProposalPrice = Math.ceil(newProposalPrice * 100) / 100;
        return { ...item, internalPrice: price, proposalPrice: newProposalPrice };
      }
      return item;
    }));
  };

  const handleUpdateProposalPrice = (sku: string, price: number) => {
    setCart(cart.map(item => {
      if (item.sku === sku) {
        let cappedPrice = item.abcPrice > 0 ? Math.min(price, item.abcPrice) : price;
        cappedPrice = Math.ceil(cappedPrice * 100) / 100;
        return { ...item, proposalPrice: cappedPrice };
      }
      return item;
    }));
  };

  const handleUpdateABCPrice = (sku: string, price: number) => {

    setCart(cart.map(item => {
      if (item.sku === sku) {
        // Cap proposal price if it exceeds new ABC price
        let cappedProposalPrice = price > 0 ? Math.min(item.proposalPrice, price) : item.proposalPrice;
        cappedProposalPrice = Math.ceil(cappedProposalPrice * 100) / 100;
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
    updateFormData("bidPercentage", percentage);
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
      setFormData(prev => ({ ...prev, bidPercentage: percentage }));

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
          setFormData(prev => ({ ...prev, bidPercentage: oldValue }));
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

    if (formData.supplierPriceVatInclusive === "yes") {
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
    const ewtAmount = vatExcludedSales * (formData.ewtPercentage / 100);
    const incomeTax25 = grossProfit * INCOME_TAX_RATE;
    const finalIncomeTax = Math.max(0, incomeTax25 - ewtAmount);

    const netProfit = grossProfit - finalIncomeTax;
    const contingencyAmount = totalCost * (formData.contingencyPercentage / 100);
    const finalNetProfit = netProfit - contingencyAmount;
    const netProfitMargin = totalInternal > 0 ? (netProfit / totalInternal) * 100 : 0;

    // Loan calculations (based on Total Cost)
    const calculatedLoanAmount = formData.loanMonths > 0 ? totalCost : 0;
    const loanInterest = calculatedLoanAmount * (formData.loanInterestPercentage / 100) * formData.loanMonths;
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

  const handleSaveQuotation = async (skipClearForm = false) => {
    // Validate required fields
    if (!formData.forCompanyId) {
      toast.error("Please select a client");
      return null;
    }
    if (!formData.projectId) {
      toast.error("Please select a project");
      return null;
    }
    if (cart.length === 0) {
      toast.error("Please add at least one product");
      return null;
    }

    setIsSaving(true);

    try {
      const payload = {
        forCompanyId: formData.forCompanyId,
        projectId: formData.projectId,
        requestorId: formData.requestorId || null,
        deliveryTerm: formData.deliveryTerm || null,
        paymentTerm: formData.paymentTerm || null,
        approvedBudget: formData.approvedBudget,
        bidPercentage: formData.bidPercentage,
        totals: {
          totalCost: financials.totalCost,
          bidPrice: financials.totalBidPrice,
        },
        items: cart.map(item => ({
          productId: item.id,
          supplierId: 1, // TODO: Add supplier selection
          quantity: item.quantity,
          internalPrice: item.internalPrice,
          clientPrice: item.proposalPrice,
          total: item.quantity * item.proposalPrice,
          remarks: null,
        })),
      };

      console.log(payload);

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

      // The API returns the form directly with an id
      const quotationId = result.id;

      toast.success(`Quotation saved successfully! ID: ${quotationId}`);

      // Clear form after successful save (unless skipClearForm is true for PDF export)
      if (!skipClearForm) {
        handleClearForm();
        setActiveTab("products");
      }

      // Return the quotation id for PDF export
      return quotationId;
    } catch (error) {
      console.error("Error saving quotation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save quotation");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearForm = () => {
    setFormData({
      code: "",
      forCompanyId: "",
      projectId: "",
      requestorId: "",
      deliveryTerm: "",
      approvedBudget: 0,
      bidPercentage: 15,
      supplierPriceVatInclusive: "yes",
      paymentTerm: "",
      ewtPercentage: 1,
      contingencyPercentage: 5,
      loanInterestPercentage: 3,
      loanMonths: 0,
    });
    setCart([]);
  };

  const handleExportPDF = async () => {
    // Validate client details
    if (!clientDetails || clientDetails.length === 0) {
      toast.error("Client details are missing. Cannot export PDF.");
      return;
    }

    // Save quotation first and wait for the quote number (skip clearing form for PDF export)
    const quoteNo = await handleSaveQuotation(true);

    if (!quoteNo) {
      toast.error("Failed to save quotation. PDF export cancelled.");
      return;
    }

    // Capture current cart and formData before they might be cleared
    const currentCart = [...cart];
    const currentFormData = { ...formData };
    const currentFinancials = { ...financials };
    const currentClientDetails = clientDetails[0];

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper function to format currency without ± symbol
    const formatPeso = (amount: any) => {
      const num = Number(amount) || 0; // fallback to 0 if invalid
      return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // Blue Header Background
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 25, 'F');

    // Header Text - Price Quotation #
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Price Quotation  #", pageWidth / 2 - 30, 15);

    // Quotation Number - use the saved quote number
    doc.setFontSize(22);
    doc.text(quoteNo, pageWidth - 15, 15, { align: "right" });
    
    // Reset text color to black
    doc.setTextColor(0, 0, 0);
    
    // Two-column layout for Quotation to/by
    let yPos = 32;
    
    // LEFT COLUMN - Quotation to:
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Quotation to:", 14, yPos);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Name:", 14, yPos + 7);
    doc.setFont("helvetica", "bold");
    const clientName = doc.splitTextToSize(currentClientDetails.companyName, 65);
    doc.text(clientName, 35, yPos + 7);

    doc.setFont("helvetica", "normal");
    doc.text("Address:", 14, yPos + 12);
    const addressLines = doc.splitTextToSize(currentClientDetails.address, 65);
    doc.text(addressLines, 35, yPos + 12);
    const addressHeight = addressLines.length * 4;

    doc.text("Tin:", 14, yPos + 14 + addressHeight);
    doc.text(currentClientDetails.tinNumber || "N/A", 35, yPos + 14 + addressHeight);

    doc.text("Attn:", 14, yPos + 19 + addressHeight);
    doc.setFont("helvetica", "bold");
    doc.text(currentClientDetails.contactPerson, 35, yPos + 19 + addressHeight);

    doc.setFont("helvetica", "normal");
    doc.text("Contact No.", 14, yPos + 24 + addressHeight);
    doc.text(currentClientDetails.contactNumber, 35, yPos + 24 + addressHeight);
    
    // RIGHT COLUMN - Quotation by:
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Quotation by:", 110, yPos);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Company Name:", 110, yPos + 7);
    doc.setFont("helvetica", "bold");
    const kmciName = doc.splitTextToSize("Kingland Marketing Company Inc.", 50);
    doc.text(kmciName, 145, yPos + 7);
    
    doc.setFont("helvetica", "normal");
    doc.text("Address:", 110, yPos + 15);
    const kmciAddress = doc.splitTextToSize("Phase 4B Blk 7 Lot 28 Golden City, Dila, City of Santa Rosa, Laguna, Philippines 4026", 50);
    doc.text(kmciAddress, 145, yPos + 15);
    
    doc.text("Tin:", 110, yPos + 29);
    doc.text("645-630-230-000", 145, yPos + 29);
    
    // Shipped / Delivered to section (as a table)
    yPos = yPos + 38 + addressHeight;
    
    // Create table for Shipped/Delivered section
    const shippedTableData = [
      [
        `Name:\n${currentClientDetails.companyName}\n\nAddress:\n${currentClientDetails.address}`,
        `${currentClientDetails.contactPerson}\n${currentClientDetails.contactNumber}`,
        currentFormData.paymentTerm || "7 CD",
        currentFormData.deliveryTerm || "3-5CD upon receipt of PO"
      ]
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Shipped / Delivered to', 'Contact', 'PAYMENT', 'DELIVERY DATE']],
      body: shippedTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 4,
        minCellHeight: 20
      },
      columnStyles: {
        0: { cellWidth: 80, valign: 'top' },
        1: { cellWidth: 35, valign: 'top' },
        2: { cellWidth: 30, valign: 'top' },
        3: { cellWidth: 45, valign: 'top' }
      },
      margin: { left: 14, right: 14 }
    });
    
    // Items Table
    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

    const tableData = currentCart.map((item) => [
      item.sku,
      item.name,
      item.brand,
      item.quantity.toString(),
      item.uom,
      `P${formatPeso(item.proposalPrice)}`,
      `P${formatPeso(item.proposalPrice * item.quantity)}`,
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['ITEM NO.', 'DESCRIPTION', 'Brand', 'QTY', 'Unit', 'UNIT PRICE', 'TOTAL']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: { 
        fontSize: 8,
        cellPadding: 3,
        minCellHeight: 8
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'left' },
        1: { cellWidth: 60, halign: 'left' },
        2: { cellWidth: 25, halign: 'left' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' },
      },
      margin: { left: 14, right: 14 }
    });
    
    // Financial Summary on the right
    const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    
    // Remarks box (left side)
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.rect(14, tableEndY, 95, 40);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Remarks / Instructions:", 16, tableEndY + 5);
    
    // Financial summary (right side)
    const summaryX = 117;
    let summaryY = tableEndY + 2;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    // Calculate subtotal (VAT-excluded)
    const subtotal = currentFinancials.vatExcludedSales;
    const vatAmount = currentFinancials.outputVat;
    const netOfVat = currentFinancials.vatExcludedSales;
    
    // Labels on left, values on right
    doc.text("SUBTOTAL", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(167, summaryY - 3.5, 30, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`P${formatPeso(subtotal)}`, 195, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 5.5;
    
    doc.text("TAX RATE", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(167, summaryY - 3.5, 30, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("12%", 195, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 5.5;
    
    doc.text("VAT INPUT TAX", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(167, summaryY - 3.5, 30, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`P${formatPeso(vatAmount)}`, 195, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 5.5;
    
    doc.text("AMOUNT (NET OF VAT)", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(167, summaryY - 3.5, 30, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`P${formatPeso(netOfVat)}`, 195, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 5.5;
    
    doc.text("SHIPPING/HANDLING", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(167, summaryY - 3.5, 30, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("P0.00", 195, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 5.5;
    
    doc.text("OTHER", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(167, summaryY - 3.5, 30, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("P0.00", 195, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 10;
    
    // THANK YOU text
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text("THANK YOU", 14, summaryY + 6);
    doc.setTextColor(0, 0, 0);
    
    // TOTAL AMOUNT (prominent)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL AMOUNT", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(167, summaryY - 4.5, 30, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`P${formatPeso(currentFinancials.totalBidPrice)}`, 195, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    // Approval Section
    summaryY += 18;
    
    // Approved by (left)
    doc.setFillColor(59, 130, 246);
    doc.rect(14, summaryY, 90, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Approved by:", 16, summaryY + 4);
    doc.setTextColor(0, 0, 0);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Richard A. Abanilla", 40, summaryY + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("President", 48, summaryY + 27);
    
    // Checked by (right)
    doc.setFillColor(59, 130, 246);
    doc.rect(107, summaryY, 90, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Checked by:", 109, summaryY + 4);
    doc.setTextColor(0, 0, 0);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Katrina M. Abanilla", 133, summaryY + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Vice President", 140, summaryY + 27);
    
    // Footer - Blue background with proper margin
    doc.setFillColor(59, 130, 246);
    doc.rect(0, pageHeight - 22, pageWidth, 22, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Phase 4B Block 7 Lot 28 Golden City, Dila", 14, pageHeight - 14);
    doc.text("City of Santa Rosa, Laguna", 14, pageHeight - 10);
    doc.text("Philippines 4026", 14, pageHeight - 6);
    
    doc.text("For questions concerning this Price Quotation, please contact", 110, pageHeight - 14);
    doc.text("Richard A. Abanilla, 0917-135-8805, raabanilla@kingland.ph", 110, pageHeight - 10);
    doc.setTextColor(200, 220, 255);
    doc.text("https://www.kingland.ph", 110, pageHeight - 6);
    doc.text("https://shop.kingland.ph", 155, pageHeight - 6);
    
    // Save PDF
    const fileName = `Quotation_${quoteNo}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF exported successfully");

    // Clear form after successful PDF export
    handleClearForm();
    setActiveTab("products");
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
      setFormData(data as QuotationFormData);

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
            {clientDetails && clientDetails.length > 0 ? (
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
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">Client details are missing. Please check the project configuration.</p>
              </div>
            )}
            {/* Basic Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 mt-2">
              <Field
                type="text"
                label={<>Requested By <span className="text-red-500">*</span></>}
                placeholder="Select requestor"
                value={currentUserName}
                onChange={(value) => updateFormData("requestorId", value)}
                className="h-10"
                disabled={true}
              />

              <Field
                type="number"
                label="Approved Budget Cost (ABC)"
                placeholder="0.00"
                value={formData.approvedBudget}
                onChange={(value) => updateFormData("approvedBudget", value)}
                decimals={2}
                className="h-10"
              />

              <Field
                type="text"
                label={<>Payment Term</>}
                placeholder="Enter payment Term"
                value={formData.paymentTerm}
                onChange={(value) => updateFormData("paymentTerm", value)}
                className="h-10"
              />

              <Field
                type="text"
                label={<>Delivery Term <span className="text-red-500">*</span></>}
                placeholder="Enter delivery term"
                value={formData.deliveryTerm}
                onChange={(value) => updateFormData("deliveryTerm", value)}
                className="h-10"
              />

              <Field
                type="number"
                label="Bid Percentage (Markup %)"
                placeholder="40"
                value={formData.bidPercentage}
                onChange={handleBidPercentageChange}
                decimals={2}
                className="h-10"
              />

              <Field
                type="select"
                label="Supplier Price VAT Inclusive?"
                value={formData.supplierPriceVatInclusive}
                onChange={(value) => updateFormData("supplierPriceVatInclusive", value as 'yes' | 'no')}
                options={[
                  { value: 'no', label: 'No' },
                  { value: 'yes', label: 'Yes' }
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
                  <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">Cost {formData.supplierPriceVatInclusive === 'yes' ? '(VAT-inclusive)' : '(VAT-exclusive)'}</h4>
                  
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
                        value={formData.ewtPercentage}
                        onChange={(value) => updateFormData("ewtPercentage", value)}
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
                    <span>EWT ({formData.ewtPercentage}%):</span>
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
                        value={formData.contingencyPercentage}
                        onChange={(value) => updateFormData("contingencyPercentage", value)}
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
                        value={formData.loanInterestPercentage}
                        onChange={(value) => updateFormData("loanInterestPercentage", value)}
                        className="h-7 w-16 text-xs text-right"
                      />
                      <span className="text-xs">%</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Number of Months:</span>
                    <Field
                      type="number"
                      value={formData.loanMonths}
                      onChange={(value) => updateFormData("loanMonths", value)}
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
                Save and Export PDF
              </Button>
              <Button onClick={() => handleSaveQuotation(false)} disabled={isSaving}>
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