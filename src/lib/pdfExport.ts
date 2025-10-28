import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CartItem {
  sku: string;
  name: string;
  description?: string;
  brand: string;
  uom: string;
  quantity: number;
  proposalPrice: number;
}

interface ClientDetails {
  companyName: string;
  tinNumber: string;
  address: string;
  contactPerson: string;
  contactNumber: string;
}

interface ExportPDFParams {
  quoteNo: string;
  clientDetails: ClientDetails;
  deliveryAddress: string;
  paymentTerm: string;
  deliveryTerm: string;
  cartItems: CartItem[];
  totalBidPrice: number;
  remarks?: string;
}

export async function exportQuotationPDF({
  quoteNo,
  clientDetails,
  deliveryAddress,
  paymentTerm,
  deliveryTerm,
  cartItems,
  totalBidPrice,
  remarks,
}: ExportPDFParams) {
  // Use Legal size (8.5" × 14")
  const doc = new jsPDF('portrait', 'mm', 'legal');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Helper function to format currency without ± symbol
  const formatPeso = (amount: number | string | undefined) => {
    const num = Number(amount) || 0;
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
  };

  try {
    const headerImage = await loadImage("/pdfAsset/PDFHeader.png");
    const headerHeight = 21;
    doc.addImage(headerImage, "PNG", 0, 0, pageWidth, headerHeight);
  } catch (err) {
    console.error("Header image failed to load:", err);
  }
  

  // Quotation Number
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(quoteNo, pageWidth - 10, 12, { align: "right" });

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
  const clientName = doc.splitTextToSize(clientDetails.companyName, 65);
  doc.text(clientName, 28, yPos + 5);

  doc.setFont("helvetica", "normal");
  doc.text("Address:", 8, yPos + 9);
  const addressLines = doc.splitTextToSize(clientDetails.address, 65);
  doc.text(addressLines, 28, yPos + 9);
  const addressHeight = addressLines.length * 3.5;

  doc.text("Tin:", 8, yPos + 11 + addressHeight);
  doc.text(clientDetails.tinNumber || "N/A", 28, yPos + 11 + addressHeight);

  doc.text("Attn:", 8, yPos + 15 + addressHeight);
  doc.setFont("helvetica", "bold");
  doc.text(clientDetails.contactPerson, 28, yPos + 15 + addressHeight);

  doc.setFont("helvetica", "normal");
  doc.text("Contact No.", 8, yPos + 19 + addressHeight);
  doc.text(clientDetails.contactNumber, 28, yPos + 19 + addressHeight);

  // RIGHT COLUMN - Quotation by:
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Quotation by:", 118, yPos);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Company Name:", 118, yPos + 5);
  doc.setFont("helvetica", "bold");
  const kmciName = doc.splitTextToSize("Kingland Marketing Company Inc.", 50);
  doc.text(kmciName, 153, yPos + 5);

  doc.setFont("helvetica", "normal");
  doc.text("Address:", 118, yPos + 11);
  const kmciAddress = doc.splitTextToSize("Phase 4B Blk 7 Lot 28 Golden City, Dila, City of Santa Rosa, Laguna, Philippines 4026", 50);
  doc.text(kmciAddress, 153, yPos + 11);

  doc.text("Tin:", 118, yPos + 23);
  doc.text("645-630-230-000", 153, yPos + 23);

  // Shipped / Delivered to section (as a table)
  yPos = yPos + 26 + addressHeight;

  const shippedTableData = [
    [
      `Name:\n${clientDetails.companyName}\n\nAddress:\n${deliveryAddress || clientDetails.address}`,
      `${clientDetails.contactPerson}\n${clientDetails.contactNumber}`,
      paymentTerm || "7 CD",
      deliveryTerm || "3-5CD upon receipt of PO"
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
      2: { cellWidth: 34, valign: 'top' },
      3: { cellWidth: 49, valign: 'top' }
    },
    margin: { left: 8, right: 8 }
  });

  // Items Table
  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

  const tableData = cartItems.map((item) => {
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
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: 8, right: 8 }
  });

  // Financial Summary on the right
  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // Remarks box (left side)
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.rect(8, tableEndY, 100, 30);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Remarks / Instructions:", 10, tableEndY + 4);

  // Add remarks content if available
  if (remarks) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const remarksLines = doc.splitTextToSize(remarks, 95);
    doc.text(remarksLines, 10, tableEndY + 8);
  }

  // Financial summary (right side)
  const summaryX = 124;
  let summaryY = tableEndY + 2;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");

  // Calculate values - bid price is VAT inclusive
  const VAT_RATE = 0.12;
  const subtotal = totalBidPrice / (1 + VAT_RATE);
  const vatAmount = totalBidPrice - subtotal;

  const valueBoxWidth = 40;
  const valueBoxX = 208 - valueBoxWidth;

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


  // Approval Section
  summaryY += 14;

  if (summaryY + 64 > pageHeight) {
    summaryY = pageHeight - 44;
  }

  try {
    const footerImage = await loadImage("/pdfAsset/PDFFooter.png");
    const footerHeight = 44;
    doc.addImage(footerImage, "PNG", 0, summaryY, pageWidth, footerHeight);
  } catch (err) {
    console.error("Footer image failed to load:", err);
  }


  // // Approved by (left)
  // doc.setFillColor(59, 130, 246);
  // doc.rect(0, summaryY, pageWidth/2, 5, 'F');
  // doc.setTextColor(255, 255, 255);
  // doc.setFontSize(8);
  // doc.setFont("helvetica", "bold");
  // doc.text("Approved by:", pageWidth/8, summaryY + 3.5);
  // doc.setTextColor(0, 0, 0);

  // doc.setFontSize(9);
  // doc.setFont("helvetica", "bold");
  // doc.text("Richard A. Abanilla", pageWidth/8 + 20, summaryY + 18);
  // doc.setFont("helvetica", "normal");
  // doc.setFontSize(7);
  //   doc.text("President", pageWidth/8 + 28, summaryY + 22);

  // // Checked by (right)
  // doc.setFillColor(59, 130, 246);
  // doc.rect(pageWidth/2, summaryY, pageWidth/2, 5, 'F');
  // doc.setTextColor(255, 255, 255);
  // doc.setFontSize(8);
  // doc.setFont("helvetica", "bold");
  // doc.text("Checked by:", pageWidth/2 + 10, summaryY + 3.5);
  // doc.setTextColor(0, 0, 0);

  // doc.setFontSize(9);
  // doc.setFont("helvetica", "bold");
  // doc.text("Katrina M. Abanilla", pageWidth/2 + 30, summaryY + 18);
  // doc.setFont("helvetica", "normal");
  // doc.setFontSize(7);
  // doc.text("Vice President", pageWidth/2 + 35, summaryY + 22);

  // Save PDF
  const fileName = `Quotation_${quoteNo}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);

  return fileName;
}
