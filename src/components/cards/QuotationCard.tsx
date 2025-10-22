"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { X, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ProductSearch } from "@/components/ui/product-search";

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
  companyAddresses: Array<{
    id: number;
    companyId: number;
    houseNo: string;
    street: string;
    subdivision?: string;
    region: string;
    province: string;
    cityMunicipality: string;
    barangay: string;
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
  deliveryAddress: string;
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

  // Additional
  remarks: string;
}



function QuotationCard({ projectId, bidPercentage, clientDetails, companyAddresses, approvedBudget, initialData, onSaveSuccess }: QuotationCardProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState("products");
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Helper function to construct full address from components
  const constructAddress = (address: typeof companyAddresses[0]) => {
    const parts = [
      address.houseNo,
      address.street,
      address.subdivision,
      address.barangay,
      address.cityMunicipality,
      address.province,
      address.region
    ].filter(Boolean);
    return parts.join(', ');
  };

  const [formData, setFormData] = useState<QuotationFormData>({
    code: "",
    forCompanyId: clientDetails[0]?.id || "",
    projectId: projectId,
    requestorId: "",
    deliveryTerm: "",
    deliveryAddress: companyAddresses[0] ? constructAddress(companyAddresses[0]) : "",
    approvedBudget: approvedBudget,
    bidPercentage: bidPercentage,
    supplierPriceVatInclusive: "yes",
    paymentTerm: "",
    ewtPercentage: 1,
    contingencyPercentage: 5,
    loanInterestPercentage: 3,
    loanMonths: 0,
    remarks: "",
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [productPrices, setProductPrices] = useState<
    Record<number, Array<{ companyId: number; companyName: string; price: number }>>
  >({});
  const [suppliers, setSuppliers] = useState<Array<{ id: number; name: string }>>([]);

  // State for save price confirmation modal
  const [showSavePriceModal, setShowSavePriceModal] = useState(false);
  const [pendingPriceSave, setPendingPriceSave] = useState<{
    productId: number;
    productName: string;
    supplierId: number;
    supplierName: string;
    price: number;
  } | null>(null);
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  const fetchProducts = async () => {
    const response = await fetch("/api/products?active=true");
    const data = await response.json();
    if (!response.ok) throw new Error("Failed to fetch products");
    setProducts(data);
  };

  const fetchProductPrices = async () => {
    try {
      const response = await fetch("/api/product-prices");
      if (!response.ok) throw new Error("Failed to fetch product prices");
      const data = await response.json();

      // Create a map of productId -> array of { companyId, companyName, price }
      const priceMap: Record<number, Array<{ companyId: number; companyName: string; price: number }>> = {};
      data.forEach((priceEntry: { productId: number; companyId: number; price: number; company: { companyName: string } }) => {
        const productId = priceEntry.productId;
        const price = Number(priceEntry.price);

        if (!priceMap[productId]) {
          priceMap[productId] = [];
        }

        priceMap[productId].push({
          companyId: priceEntry.companyId,
          companyName: priceEntry.company.companyName,
          price: price,
        });
      });

      setProductPrices(priceMap);

      // Extract unique suppliers
      const uniqueSuppliers = new Map<number, string>();
      data.forEach((priceEntry: { companyId: number; company: { companyName: string } }) => {
        uniqueSuppliers.set(priceEntry.companyId, priceEntry.company.companyName);
      });

      setSuppliers(
        Array.from(uniqueSuppliers.entries()).map(([id, name]) => ({ id, name }))
      );
    } catch (error) {
      console.error("Error fetching product prices:", error);
    }
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
    fetchProductPrices();
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
      // Get the lowest price for this product from productPrices
      const productId = Number(product.id);
      const pricesForProduct = productPrices[productId] || [];

      let basePrice = 0;
      let supplierName = "-";

      if (pricesForProduct.length > 0) {
        // Find the lowest priced supplier
        const lowestPriceEntry = pricesForProduct.reduce((lowest, current) =>
          current.price < lowest.price ? current : lowest
        );
        basePrice = lowestPriceEntry.price;
        supplierName = lowestPriceEntry.companyName;
      }

      const calculatedPrice = basePrice * (1 + formData.bidPercentage / 100);
      const proposalPrice = calculatedPrice; // ABC is 0 by default, so no cap initially

      const newItem: CartItem = {
        ...product,
        quantity: 1,
        internalPrice: basePrice,
        supplier: supplierName,
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
    // First, update the cart
    setCart(cart.map(item => {
      if (item.sku === sku) {
        const calculatedPrice = price * (1 + formData.bidPercentage / 100);
        let newProposalPrice = item.abcPrice > 0 ? Math.min(calculatedPrice, item.abcPrice) : calculatedPrice;
        newProposalPrice = Math.ceil(newProposalPrice * 100) / 100;

        // Check if we should prompt to save this price
        // Only prompt if: supplier is set (not "-"), price is > 0, and it's different from existing price
        if (item.supplier && item.supplier !== "-" && price > 0) {
          const product = products.find(p => p.sku === sku);
          const supplier = suppliers.find(s => s.name === item.supplier);

          if (product && supplier) {
            const productId = Number(product.id);
            const existingPrices = productPrices[productId] || [];
            const existingPrice = existingPrices.find(p => p.companyId === supplier.id);

            // Only show modal if price is different from existing or doesn't exist
            if (!existingPrice || existingPrice.price !== price) {
              setPendingPriceSave({
                productId: productId,
                productName: product.name,
                supplierId: supplier.id,
                supplierName: supplier.name,
                price: price,
              });
              setShowSavePriceModal(true);
            }
          }
        }

        return { ...item, internalPrice: price, proposalPrice: newProposalPrice };
      }
      return item;
    }));
  };

  const handleSavePriceToDatabase = async () => {
    if (!pendingPriceSave) return;

    setIsSavingPrice(true);
    try {
      const response = await fetch("/api/product-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: pendingPriceSave.productId,
          companyId: pendingPriceSave.supplierId,
          price: pendingPriceSave.price,
        }),
      });

      if (response.ok) {
        const newPrice = await response.json();

        // Update the productPrices state with the new price
        setProductPrices(prev => {
          const updated = { ...prev };
          if (!updated[pendingPriceSave.productId]) {
            updated[pendingPriceSave.productId] = [];
          }

          // Remove old price if exists and add new one
          updated[pendingPriceSave.productId] = updated[pendingPriceSave.productId].filter(
            p => p.companyId !== pendingPriceSave.supplierId
          );
          updated[pendingPriceSave.productId].push({
            companyId: pendingPriceSave.supplierId,
            companyName: pendingPriceSave.supplierName,
            price: pendingPriceSave.price,
          });

          return updated;
        });

        toast.success("Supplier price saved to database");
      } else {
        const error = await response.json();
        // If it already exists, try PATCH instead
        if (error.error?.includes("already exists")) {
          const patchResponse = await fetch("/api/product-prices", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: pendingPriceSave.productId,
              companyId: pendingPriceSave.supplierId,
              price: pendingPriceSave.price,
            }),
          });

          if (patchResponse.ok) {
            // Update the productPrices state
            setProductPrices(prev => {
              const updated = { ...prev };
              const priceIndex = updated[pendingPriceSave.productId]?.findIndex(
                p => p.companyId === pendingPriceSave.supplierId
              );
              if (priceIndex !== -1) {
                updated[pendingPriceSave.productId][priceIndex].price = pendingPriceSave.price;
              }
              return updated;
            });
            toast.success("Supplier price updated in database");
          } else {
            throw new Error("Failed to update price");
          }
        } else {
          throw new Error(error.error || "Failed to save price");
        }
      }
    } catch (error) {
      console.error("Error saving price:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save price to database");
    } finally {
      setIsSavingPrice(false);
      setShowSavePriceModal(false);
      setPendingPriceSave(null);
    }
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

  const handleUpdateSupplier = (sku: string, supplierName: string) => {
    setCart(cart.map(item => {
      if (item.sku === sku) {
        // If "No Supplier" or "-" is selected, reset to 0 price
        if (supplierName === "No Supplier" || supplierName === "-") {
          return {
            ...item,
            supplier: "-",
            internalPrice: 0,
            proposalPrice: 0,
          };
        }

        // Find the product and get prices for it
        const product = products.find(p => p.sku === sku);
        if (!product) return { ...item, supplier: supplierName };

        const productId = Number(product.id);
        const pricesForProduct = productPrices[productId] || [];

        // Find the price for the selected supplier
        const supplierPrice = pricesForProduct.find(p => p.companyName === supplierName);
        const newInternalPrice = supplierPrice ? supplierPrice.price : 0;

        // Recalculate proposal price with new internal price
        const calculatedPrice = newInternalPrice * (1 + formData.bidPercentage / 100);
        const newProposalPrice = item.abcPrice > 0
          ? Math.min(calculatedPrice, item.abcPrice)
          : calculatedPrice;

        return {
          ...item,
          supplier: supplierName,
          internalPrice: newInternalPrice,
          proposalPrice: newProposalPrice,
        };
      }
      return item;
    }));
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
        deliveryAddress: formData.deliveryAddress || null,
        paymentTerm: formData.paymentTerm || null,
        approvedBudget: formData.approvedBudget,
        bidPercentage: formData.bidPercentage,
        remarks: formData.remarks || null,
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

      // The API returns the form directly with code
      const quotationCode = result.code;

      toast.success(`Quotation saved successfully! Code: ${quotationCode}`);

      // Call onSaveSuccess to refresh the forms list
      if (onSaveSuccess) {
        onSaveSuccess();
      }

      // Clear form after successful save (unless skipClearForm is true for PDF export)
      if (!skipClearForm) {
        handleClearForm();
        setActiveTab("products");
      }

      // Return the quotation code for PDF export
      return quotationCode;
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
      code: formData.code,
      forCompanyId: formData.forCompanyId,
      projectId: formData.projectId,
      requestorId: formData.requestorId,
      deliveryTerm: "",
      deliveryAddress: companyAddresses[0] ? constructAddress(companyAddresses[0]) : "",
      approvedBudget: formData.approvedBudget,
      bidPercentage: formData.bidPercentage,
      supplierPriceVatInclusive: "yes",
      paymentTerm: "",
      ewtPercentage: 1,
      contingencyPercentage: 5,
      loanInterestPercentage: 3,
      loanMonths: 0,
      remarks: "",
    });
    setCart([]);
  };

  const handleExportPDF = async () => {
    // Validate client details
    if (!clientDetails || clientDetails.length === 0) {
      toast.error("Client details are missing. Cannot export PDF.");
      return;
    }

    // Prompt for remarks if not filled
    const remarksValue = formData.remarks?.trim() || "";
    console.log("Remarks check:", { remarks: formData.remarks, trimmed: remarksValue, isEmpty: remarksValue === "" });
    if (remarksValue === "") {
      const shouldContinue = window.confirm("You haven't added any remarks. Do you want to continue without remarks?");
      if (!shouldContinue) {
        toast.info("PDF export cancelled.");
        return;
      }
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

    // Helper function to format currency without ± symbol
    const formatPeso = (amount: number | string | undefined) => {
      const num = Number(amount) || 0; // fallback to 0 if invalid
      return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // Blue Header Background
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 25, 'F');

    // Add logo with white background in upper left corner
    try {
      // White background for logo (maintaining aspect ratio ~4.5:1)
      const logoWidth = 80;
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, logoWidth + 4, 25, 'F');

      // Add logo image
      const logoImg = new Image();
      logoImg.src = '/wide_logo.png';
      doc.addImage(logoImg, 'PNG', 2, 2, logoWidth, 21);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }

    // Quotation Number
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(quoteNo, pageWidth - 8, 14, { align: "right" });

    // Reset text color to black
    doc.setTextColor(0, 0, 0);

    // Two-column layout for Quotation to/by
    let yPos = 30;
    
    // LEFT COLUMN - Quotation to:
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Quotation to:", 8, yPos);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Name:", 8, yPos + 5);
    doc.setFont("helvetica", "bold");
    const clientName = doc.splitTextToSize(currentClientDetails.companyName, 65);
    doc.text(clientName, 28, yPos + 5);

    doc.setFont("helvetica", "normal");
    doc.text("Address:", 8, yPos + 9);
    const addressLines = doc.splitTextToSize(currentClientDetails.address, 65);
    doc.text(addressLines, 28, yPos + 9);
    const addressHeight = addressLines.length * 3.5;

    doc.text("Tin:", 8, yPos + 11 + addressHeight);
    doc.text(currentClientDetails.tinNumber || "N/A", 28, yPos + 11 + addressHeight);

    doc.text("Attn:", 8, yPos + 15 + addressHeight);
    doc.setFont("helvetica", "bold");
    doc.text(currentClientDetails.contactPerson, 28, yPos + 15 + addressHeight);

    doc.setFont("helvetica", "normal");
    doc.text("Contact No.", 8, yPos + 19 + addressHeight);
    doc.text(currentClientDetails.contactNumber, 28, yPos + 19 + addressHeight);

    // RIGHT COLUMN - Quotation by:
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Quotation by:", 110, yPos);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Company Name:", 110, yPos + 5);
    doc.setFont("helvetica", "bold");
    const kmciName = doc.splitTextToSize("Kingland Marketing Company Inc.", 50);
    doc.text(kmciName, 145, yPos + 5);

    doc.setFont("helvetica", "normal");
    doc.text("Address:", 110, yPos + 11);
    const kmciAddress = doc.splitTextToSize("Phase 4B Blk 7 Lot 28 Golden City, Dila, City of Santa Rosa, Laguna, Philippines 4026", 50);
    doc.text(kmciAddress, 145, yPos + 11);

    doc.text("Tin:", 110, yPos + 23);
    doc.text("645-630-230-000", 145, yPos + 23);

    // Shipped / Delivered to section (as a table)
    yPos = yPos + 26 + addressHeight;
    
    // Create table for Shipped/Delivered section
    const shippedTableData = [
      [
        `Name:\n${currentClientDetails.companyName}\n\nAddress:\n${currentFormData.deliveryAddress || currentClientDetails.address}`,
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
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 2
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2,
        minCellHeight: 16
      },
      columnStyles: {
        0: { cellWidth: 82, valign: 'top' },
        1: { cellWidth: 35, valign: 'top' },
        2: { cellWidth: 30, valign: 'top' },
        3: { cellWidth: 45, valign: 'top' }
      },
      margin: { left: 8, right: 8 }
    });
    
    // Items Table
    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

    const tableData = currentCart.map((item) => {
      const productName = item.name || 'N/A';
      const productDescription = item.description || '';
      const fullDescription = productDescription
        ? `${productName} - ${productDescription}`
        : productName;

      return [
        item.sku,
        fullDescription,
        item.brand,
        item.quantity.toString(),
        item.uom,
        `P${formatPeso(item.proposalPrice)}`,
        `P${formatPeso(item.proposalPrice * item.quantity)}`,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['ITEM NO.', 'DESCRIPTION', 'Brand', 'QTY', 'Unit', 'UNIT PRICE', 'TOTAL']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2,
        minCellHeight: 6,
        overflow: 'hidden'
      },
      columnStyles: {
        0: { cellWidth: 26, halign: 'left', overflow: 'hidden' },
        1: { cellWidth: 87, halign: 'left', overflow: 'hidden' },
        2: { cellWidth: 20, halign: 'left', overflow: 'hidden' },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 13, halign: 'center' },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
      },
      margin: { left: 8, right: 8 }
    });
    
    // Financial Summary on the right
    const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

    // Remarks box (left side) - width should align with tables (total 192 units)
    // Remarks takes ~100 units, summary takes ~92 units = 192 total
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.rect(8, tableEndY, 100, 30);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Remarks / Instructions:", 10, tableEndY + 4);

    // Add remarks content if available
    if (currentFormData.remarks) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const remarksLines = doc.splitTextToSize(currentFormData.remarks, 95);
      doc.text(remarksLines, 10, tableEndY + 8);
    }

    // Financial summary (right side) - starts after remarks box
    const summaryX = 116;
    let summaryY = tableEndY + 2;
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    // Calculate values - bid price is VAT inclusive
    const totalBidPrice = currentFinancials.totalBidPrice;
    const VAT_RATE = 0.12;
    const subtotal = totalBidPrice / (1 + VAT_RATE);
    const vatAmount = totalBidPrice - subtotal;

    // Labels on left, values on right - align to table edge (x=200)
    const valueBoxWidth = 33;
    const valueBoxX = 200 - valueBoxWidth; // 167

    doc.text("SUBTOTAL", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(valueBoxX, summaryY - 3, valueBoxWidth, 4.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`P${formatPeso(subtotal)}`, 198, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 4.5;

    doc.text("TAX RATE", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(valueBoxX, summaryY - 3, valueBoxWidth, 4.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("12%", 198, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 4.5;

    doc.text("VAT INPUT TAX", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(valueBoxX, summaryY - 3, valueBoxWidth, 4.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`P${formatPeso(vatAmount)}`, 198, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 4.5;

    doc.text("AMOUNT (NET OF VAT)", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(valueBoxX, summaryY - 3, valueBoxWidth, 4.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`P${formatPeso(subtotal)}`, 198, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 4.5;

    doc.text("SHIPPING/HANDLING", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(valueBoxX, summaryY - 3, valueBoxWidth, 4.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("P0.00", 198, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 4.5;

    doc.text("OTHER", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(valueBoxX, summaryY - 3, valueBoxWidth, 4.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("P0.00", 198, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryY += 7;

    // THANK YOU text
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text("THANK YOU", 8, summaryY + 4);
    doc.setTextColor(0, 0, 0);

    // TOTAL AMOUNT (prominent)
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL AMOUNT", summaryX, summaryY);
    doc.setFillColor(59, 130, 246);
    doc.rect(valueBoxX, summaryY - 3.5, valueBoxWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`P${formatPeso(totalBidPrice)}`, 198, summaryY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    // Approval Section - align to table width (192 total, split in half = 96 each)
    summaryY += 14;

    // Approved by (left) - starts at x=8, width=96
    doc.setFillColor(59, 130, 246);
    doc.rect(8, summaryY, 96, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Approved by:", 10, summaryY + 3.5);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Richard A. Abanilla", 38, summaryY + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("President", 46, summaryY + 22);

    // Checked by (right) - starts at x=104 (8+96), width=96
    doc.setFillColor(59, 130, 246);
    doc.rect(104, summaryY, 96, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Checked by:", 106, summaryY + 3.5);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Katrina M. Abanilla", 133, summaryY + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Vice President", 140, summaryY + 22);
    
    // Save PDF
    const fileName = `Quotation_${quoteNo}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF exported successfully");

    // Clear form after successful PDF export
    handleClearForm();
    setActiveTab("products");
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
          {/* Search Bar */}
          <div className="mb-4 px-2">
            <ProductSearch value={searchQuery} onChange={setSearchQuery} />
          </div>

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
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      {searchQuery ? "No products match your search." : "No products available."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
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
                  ))
                )}
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
                    <h1 className="text-sm font-medium text-muted-foreground">TIN:</h1>
                    <h1 className="text-md font-medium text-right">{clientDetails[0].tinNumber}</h1>
                  </div>
                  <div className="flex justify-between items-start w-full">
                    <h1 className="text-sm font-medium text-muted-foreground">Email:</h1>
                    <a href={`mailto:${clientDetails[0].email}`} target="_blank" rel="noopener noreferrer" className="text-md font-medium text-blue-500 text-right underline">{clientDetails[0].email ?? "Unavailable"}</a>
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

            {/* Delivery Address Input with Dropdown */}
            <div className="mb-6">
              <div className="relative">
                <Field
                  type="text"
                  label={<>Delivery Address <span className="text-red-500">*</span></>}
                  placeholder="Enter delivery address"
                  value={formData.deliveryAddress}
                  onChange={(value) => {
                    updateFormData("deliveryAddress", value);
                    setShowAddressDropdown(false);
                  }}
                  className="h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                  className="absolute right-2 top-[34px] text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {showAddressDropdown ? 'Hide' : 'Show'} saved addresses
                </button>

                {showAddressDropdown && companyAddresses.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {companyAddresses.map((address) => (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => {
                          updateFormData("deliveryAddress", constructAddress(address));
                          setShowAddressDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors border-b last:border-b-0"
                      >
                        {constructAddress(address)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                                { value: "-", label: "-" },
                                ...suppliers.map(supplier => ({
                                  value: supplier.name,
                                  label: supplier.name
                                }))
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

            {/* Remarks / Instructions */}
            <div className="mb-6">
              <Field
                type="textarea"
                label="Remarks / Instructions"
                placeholder="Enter any special instructions or remarks for this quotation..."
                value={formData.remarks}
                onChange={(value) => updateFormData("remarks", value)}
                rows={3}
              />
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

      {/* Save Price Confirmation Modal */}
      <Sheet open={showSavePriceModal} onOpenChange={setShowSavePriceModal}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Save Supplier Price</SheetTitle>
            <SheetDescription>
              Would you like to save this price to the database for future use?
            </SheetDescription>
          </SheetHeader>

          {pendingPriceSave && (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Product</div>
                <div className="text-base font-semibold">{pendingPriceSave.productName}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Supplier</div>
                <div className="text-base font-semibold">{pendingPriceSave.supplierName}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Price</div>
                <div className="text-2xl font-bold text-primary">
                  ₱{pendingPriceSave.price.toFixed(2)}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                This will save the price relationship to the database and make it available for future quotations.
              </div>
            </div>
          )}

          <SheetFooter className="mt-6">
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSavePriceModal(false);
                  setPendingPriceSave(null);
                }}
                disabled={isSavingPrice}
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                onClick={handleSavePriceToDatabase}
                disabled={isSavingPrice}
                className="flex-1"
              >
                {isSavingPrice ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save to Database"
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default QuotationCard;