"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { exportQuotationPDF } from "@/lib/pdfExport";

interface QuotationData {
  id?: number;
  code?: string;
  projectId?: number;
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
  isComplete?: boolean;
  remarks?: string;
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

  console.log(data);


  const handleExportPDF = () => {
    
    // Construct client address from company relation
    const clientAddress = data.forCompany?.companyAddresses?.[0];
    const fullAddress = clientAddress
      ? `${clientAddress.houseNo || ''} ${clientAddress.street || ''}, ${clientAddress.subdivision || ''}, ${clientAddress.cityMunicipality || ''}, ${clientAddress.province || ''}, ${clientAddress.region || ''}`
      : 'N/A';

    const clientName = data.forCompany?.companyName || 'N/A';
    const clientTIN = data.forCompany?.tinNumber || '';
    const contactPerson = data.forCompany?.companyProponents?.[0]?.contactPerson || 'N/A';
    const contactNumber = data.forCompany?.companyProponents?.[0]?.contactNumber || 'N/A';
    
    exportQuotationPDF({
      quoteNo: data.code || 'Draft',
      clientDetails: {
        companyName: clientName,
        tinNumber: clientTIN,
        address: fullAddress,
        contactPerson: contactPerson,
        contactNumber: contactNumber,
      },
      deliveryAddress: fullAddress,
      paymentTerm: data.paymentTerm || '7 CD',
      deliveryTerm: data.deliveryTerm || '3-5CD upon receipt of PO',
      cartItems: data.quotationItems?.map(item => ({
        sku: item.product?.sku || 'N/A',
        name: item.product?.name || 'N/A',
        brand: item.product?.brand || 'N/A',
        uom: item.product?.uom || 'N/A',
        proposalPrice: item.clientPrice || 0,
        quantity: item.quantity || 0,
      })) || [],
      totalBidPrice: data.bidPrice || 0,
      remarks: data.remarks || 'N/A',
    });
    
    
  };

  const handleCreateNewVersion = () => {
    onCreateNewVersion(quotation);
    onClose();
  };

  const handleApproveQuotation = async (quotationId: number) => {
    if (!quotationId) return Promise.resolve(null); 
    console.log('Approve Quotation...', quotationId); 
    try { 
      const response = await apiFetch<QuotationData>(`/api/quotations/mark-as-approved`, { 
        method: "PATCH", 
        body: JSON.stringify({ 
          id: quotationId, 
          projectId: data.projectId || 0,
          isComplete: true, 
        }) 
      }); 

      toast.success("Quotation approved successfully");
      onClose()
    } catch (error) { 
      toast.error(error instanceof Error ? error.message : "Failed to approve quotation"); 
    } 
  }

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
            <Button variant="outline" onClick={handleCreateNewVersion}>
              <Copy className="h-4 w-4 mr-2" />
              Create New Version
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleApproveQuotation(data.id || 0)} 
              disabled={data.isComplete}
              className={data.isComplete ? "bg-green-500 text-white" : "bg-gray-500 text-white"}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {data.isComplete ? "Approved" : "Mark as Approved"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
