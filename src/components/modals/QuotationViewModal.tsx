"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, Copy } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface QuotationData {
  id?: number;
  code?: string;
  approvedBudget?: number;
  bidPercentage?: number;
  paymentTerm?: string;
  deliveryTerm?: string;
  totalCost?: number;
  bidPrice?: number;
  forCompany?: {
    id?: number;
    companyName?: string;
    tinNumber?: string;
    companyAddresses?: Array<{
      id?: number;
      companyId?: number;
      houseNo?: string;
      street?: string;
      barangay?: string;
      cityMunicipality?: string;
      province?: string;
      region?: string;
      subdivision?: string;
    }>;
    companyProponents?: Array<{
      id?: number;
      companyId?: number;
      contactPerson?: string;
      contactNumber?: string;
      email?: string;
    }>;
  }
  quotationItems?: Array<{
    id?: number;
    formId?: number;
    productId?: number;
    quantity?: number;
    internalPrice?: number;
    clientPrice?: number;
    total?: number;
    product?: {
      id?: number;
      sku?: string;
      name?: string;
      brand?: string;
      uom?: string;
    };
    remarks?: string;
  }>;
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


  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Helper function to format currency without ± symbol
    const formatPeso = (amount: any) => {
      const num = Number(amount) || 0; // fallback to 0 if invalid
      return parseFloat(num.toFixed(2));
    };
    
    
    // Construct client address from company relation
    const clientAddress = data.forCompany?.companyAddresses?.[0];
    const fullAddress = clientAddress
      ? `${clientAddress.houseNo || ''} ${clientAddress.street || ''}, ${clientAddress.subdivision || ''}, ${clientAddress.cityMunicipality || ''}, ${clientAddress.province || ''}, ${clientAddress.region || ''}`
      : 'N/A';

    const clientName = data.forCompany?.companyName || 'N/A';
    const clientTIN = data.forCompany?.tinNumber || '';
    const contactPerson = data.forCompany?.companyProponents?.[0]?.contactPerson || 'N/A';
    const contactNumber = data.forCompany?.companyProponents?.[0]?.contactNumber || 'N/A';
    
    // Blue Header Background
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Header Text - Price Quotation #
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Price Quotation  #", pageWidth / 2 - 30, 15);
    
    // Quotation Number
    doc.setFontSize(22);
    doc.text(data.code || "N/A", pageWidth - 15, 15, { align: "right" });
    
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
    const clientNameLines = doc.splitTextToSize(clientName, 65);
    doc.text(clientNameLines, 35, yPos + 7);
    
    doc.setFont("helvetica", "normal");
    doc.text("Address:", 14, yPos + 12);
    const addressLines = doc.splitTextToSize(fullAddress, 65);
    doc.text(addressLines, 35, yPos + 12);
    const addressHeight = addressLines.length * 4;
    
    doc.text("Tin:", 14, yPos + 14 + addressHeight);
    doc.text(clientTIN || "N/A", 35, yPos + 14 + addressHeight);
    
    doc.text("Attn:", 14, yPos + 19 + addressHeight);
    doc.setFont("helvetica", "bold");
    doc.text(contactPerson, 35, yPos + 19 + addressHeight);
    
    doc.setFont("helvetica", "normal");
    doc.text("Contact No.", 14, yPos + 24 + addressHeight);
    doc.text(contactNumber, 35, yPos + 24 + addressHeight);
    
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
        `Name:\n${clientName}\n\nAddress:\n${fullAddress}`,
        `${contactPerson}\n${contactNumber}`,
        data.paymentTerm || "N/A",
        data.deliveryTerm || "N/A"
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
    
    const tableData = (data.quotationItems || []).map((item) => [
      item.product?.sku || 'N/A',
      item.product?.name || 'N/A',
      item.product?.brand || 'N/A',
      item.quantity?.toString() || '0',
      item.product?.uom || 'PCS',
      `P${formatPeso(item.internalPrice || 0)}`,
      `P${formatPeso(item.total || 0)}`,
      `P${formatPeso(item.clientPrice || 0)}`,
      `P${formatPeso(item.total || 0)}`,
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
    
    // Calculate values - bid price is VAT inclusive
    const totalBidPrice = data.bidPrice || 0;
    const VAT_RATE = 0.12;
    const subtotal = totalBidPrice / (1 + VAT_RATE);
    const vatAmount = totalBidPrice - subtotal;
    
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
    doc.text(`P${formatPeso(subtotal)}`, 195, summaryY, { align: 'right' });
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
    doc.text(`P${formatPeso(totalBidPrice)}`, 195, summaryY, { align: 'right' });
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
    const fileName = `Quotation_${data.code || 'Draft'}_${new Date().toISOString().split('T')[0]}.pdf`;
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
          <SheetTitle>Quotation Details - {data.code}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Quotation Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Quote No:</span>
                <span className="text-sm font-medium">{data.code || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Company:</span>
                <span className="text-sm font-medium">{data.forCompany?.companyName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Payment Term:</span>
                <span className="text-sm font-medium">{data.paymentTerm || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Delivery Term:</span>
                <span className="text-sm font-medium">{data.deliveryTerm || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bid Percentage:</span>
                <span className="text-sm font-medium">{data.bidPercentage || 0}%</span>
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
                  <TableHead>Client Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.quotationItems && data.quotationItems.length > 0 ? (
                  data.quotationItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-xs">{item.product?.sku || 'N/A'}</TableCell>
                      <TableCell>{item.product?.name || 'N/A'}</TableCell>
                      <TableCell>{item.product?.brand || 'N/A'}</TableCell>
                      <TableCell>{item.quantity || 0}</TableCell>
                      <TableCell>₱{item.internalPrice || 0}</TableCell>
                      <TableCell>₱{item.clientPrice || 0}</TableCell>
                      <TableCell className="font-medium">₱{item.total || 0}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                <span className="text-sm font-medium">₱{data.totalCost || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Approved Budget:</span>
                <span className="text-sm font-medium">₱{data.approvedBudget || 0}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold">Total Bid Price:</span>
                <span className="text-sm font-bold text-blue-600">₱{data.bidPrice || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Items Count:</span>
                <span className="text-sm font-medium">{data.quotationItems?.length || 0}</span>
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
