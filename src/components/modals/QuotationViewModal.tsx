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
      description?: string;
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
    const formatPeso = (amount: number | string | undefined) => {
      const num = Number(amount) || 0; // fallback to 0 if invalid
      return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
    doc.text(data.code || "N/A", pageWidth - 8, 14, { align: "right" });
    
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
    const clientNameLines = doc.splitTextToSize(clientName, 65);
    doc.text(clientNameLines, 28, yPos + 5);

    doc.setFont("helvetica", "normal");
    doc.text("Address:", 8, yPos + 9);
    const addressLines = doc.splitTextToSize(fullAddress, 65);
    doc.text(addressLines, 28, yPos + 9);
    const addressHeight = addressLines.length * 3.5;

    doc.text("Tin:", 8, yPos + 11 + addressHeight);
    doc.text(clientTIN || "N/A", 28, yPos + 11 + addressHeight);

    doc.text("Attn:", 8, yPos + 15 + addressHeight);
    doc.setFont("helvetica", "bold");
    doc.text(contactPerson, 28, yPos + 15 + addressHeight);

    doc.setFont("helvetica", "normal");
    doc.text("Contact No.", 8, yPos + 19 + addressHeight);
    doc.text(contactNumber, 28, yPos + 19 + addressHeight);

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

    const tableData = (data.quotationItems || []).map((item) => {
      const productName = item.product?.name || 'N/A';
      const productDescription = item.product?.description || '';
      const fullDescription = productDescription
        ? `${productName} - ${productDescription}`
        : productName;

      return [
        item.product?.sku || 'N/A',
        fullDescription,
        item.product?.brand || 'N/A',
        item.quantity?.toString() || '0',
        item.product?.uom || 'PCS',
        `P${formatPeso(item.clientPrice || 0)}`,
        `P${formatPeso(item.total || 0)}`,
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

    // Financial summary (right side) - starts after remarks box
    const summaryX = 116;
    let summaryY = tableEndY + 2;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    // Calculate values - bid price is VAT inclusive
    const totalBidPrice = data.bidPrice || 0;
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
