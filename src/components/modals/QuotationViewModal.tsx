"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, Copy } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface QuotationData {
  details?: {
    quoteNo?: string;
    company?: { companyName?: string };
    paymentMethod?: string;
    deliveryDate?: string;
    approvedBudget?: number;
    bidPercentage?: number;
    bidPrice?: number;
    totalCost?: number;
  };
  formItems?: Array<{
    product?: { sku?: string; name?: string; brand?: string };
    quantity?: string;
    supplierPrice?: number;
    supplierName?: string;
    clientPrice?: number;
    total?: number;
  }>;
  createdAt?: string;
}

interface QuotationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: unknown;
  onCreateNewVersion: (quotation: unknown) => void;
}

export default function QuotationViewModal({ isOpen, onClose, quotation, onCreateNewVersion }: QuotationViewModalProps) {
  if (!quotation) return null;

  const data = quotation as QuotationData;

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(numAmount / 100);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("QUOTATION", pageWidth / 2, 20, { align: "center" });

    // Quotation Number
    doc.setFontSize(12);
    doc.text(`Quote No: ${data.details?.quoteNo || 'N/A'}`, pageWidth / 2, 30, { align: "center" });

    // Client Details
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Client Information:", 14, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`Company: ${data.details?.company?.companyName || 'N/A'}`, 14, 52);

    // Quotation Details
    doc.setFont("helvetica", "bold");
    doc.text("Quotation Details:", 120, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`Payment Term: ${data.details?.paymentMethod || "N/A"}`, 120, 52);
    doc.text(`Delivery Term: ${data.details?.deliveryDate || "N/A"}`, 120, 57);
    doc.text(`ABC: ${formatCurrency(data.details?.approvedBudget || 0)}`, 120, 62);
    doc.text(`Bid Percentage: ${data.details?.bidPercentage || 0}%`, 120, 67);

    // Items Table
    const tableData = (data.formItems || []).map((item) => [
      item.product?.sku || 'N/A',
      item.product?.name || 'N/A',
      item.product?.brand || 'N/A',
      item.quantity?.toString() || '0',
      formatCurrency(item.supplierPrice || 0),
      item.supplierName || 'N/A',
      formatCurrency(item.clientPrice || 0),
      formatCurrency(item.total || 0),
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['SKU', 'Name', 'Brand', 'Qty', 'Internal Price', 'Supplier', 'Proposal Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
    });

    // Financial Summary
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Financial Summary:", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    let currentY = finalY + 7;
    doc.text(`Total Bid Price: ${formatCurrency(data.details?.bidPrice || 0)}`, 14, currentY);
    currentY += 5;
    doc.text(`Total Cost: ${formatCurrency(data.details?.totalCost || 0)}`, 14, currentY);

    // Save PDF
    const fileName = `Quotation_${data.details?.quoteNo || 'Draft'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF exported successfully");
  };

  const handleCreateNewVersion = () => {
    onCreateNewVersion(quotation);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-6xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Quotation Details - {data.details?.quoteNo}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Quotation Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Quote No:</span>
                <span className="text-sm font-medium">{data.details?.quoteNo || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Company:</span>
                <span className="text-sm font-medium">{data.details?.company?.companyName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Payment Term:</span>
                <span className="text-sm font-medium">{data.details?.paymentMethod || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date:</span>
                <span className="text-sm font-medium">
                  {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Delivery Term:</span>
                <span className="text-sm font-medium">{data.details?.deliveryDate || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bid Percentage:</span>
                <span className="text-sm font-medium">{data.details?.bidPercentage || 0}%</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Internal Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Proposal Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.formItems && data.formItems.length > 0 ? (
                  data.formItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-xs">{item.product?.sku || 'N/A'}</TableCell>
                      <TableCell>{item.product?.name || 'N/A'}</TableCell>
                      <TableCell>{item.product?.brand || 'N/A'}</TableCell>
                      <TableCell>{item.quantity || 0}</TableCell>
                      <TableCell>{formatCurrency(item.supplierPrice || 0)}</TableCell>
                      <TableCell>{item.supplierName || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(item.clientPrice || 0)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.total || 0)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No items found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Cost:</span>
                <span className="text-sm font-medium">{formatCurrency(data.details?.totalCost || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Approved Budget:</span>
                <span className="text-sm font-medium">{formatCurrency(data.details?.approvedBudget || 0)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold">Total Bid Price:</span>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(data.details?.bidPrice || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Items Count:</span>
                <span className="text-sm font-medium">{data.formItems?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={handleCreateNewVersion}>
              <Copy className="h-4 w-4 mr-2" />
              Create New Version
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
