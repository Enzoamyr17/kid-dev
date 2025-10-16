"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/ui/field";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api";

interface CompanyAddress {
  id: number;
  companyId: number;
  houseNo: string;
  street: string;
  subdivision?: string;
  region: string;
  province: string;
  cityMunicipality: string;
  barangay: string;
}

interface CompanyProponent {
  id: number;
  companyId: number;
  contactPerson: string;
  contactNumber: string;
}

interface Company {
  id: number;
  companyName: string;
  tinNumber: string;
  isClient: boolean;
  isSupplier: boolean;
  isVendor: boolean;
  isInternal: boolean;
  companyAddresses: CompanyAddress[];
  companyProponents: CompanyProponent[];
  _count: {
    projects: number;
    companyAddresses: number;
    companyProponents: number;
  };
}

export default function CompaniesPage() {
  const { data: companies, error, isLoading } = useSWR<Company[]>("/api/companies");
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompany, setNewCompany] = useState({
    companyName: "",
    tinNumber: "",
    isClient: true,
    isSupplier: false,
    isVendor: false,
    isInternal: false,
  });

  const handleSubmitCompany = async () => {
    if (!newCompany.companyName) {
      toast.error("Please fill in company name");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiFetch<Company>("/api/companies", {
        method: "POST",
        body: JSON.stringify(newCompany),
      });

      await mutate("/api/companies", [...(companies || []), created], false);
      setIsAddingCompany(false);
      setNewCompany({ companyName: "", tinNumber: "", isClient: true, isSupplier: false, isVendor: false, isInternal: false });
      toast.success("Company created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Failed to load companies</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Management</h1>
          <p className="text-muted-foreground">Manage companies, addresses, and proponents</p>
        </div>
        {!isAddingCompany && (
          <Button onClick={() => setIsAddingCompany(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>TIN</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Addresses</TableHead>
              <TableHead>Proponents</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Add Company Row */}
            {isAddingCompany && (
              <TableRow className="bg-muted/50">
                <TableCell>
                  <Input
                    value={newCompany.companyName}
                    onChange={(e) => setNewCompany({ ...newCompany, companyName: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="Company name"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newCompany.tinNumber}
                    onChange={(e) => setNewCompany({ ...newCompany, tinNumber: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="TIN"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap text-xs">
                    <label className="flex items-center gap-1 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={newCompany.isClient}
                        onChange={(e) => setNewCompany({ ...newCompany, isClient: e.target.checked })}
                        disabled={isSubmitting}
                        className="h-3 w-3"
                      />
                      Client
                    </label>
                    <label className="flex items-center gap-1 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={newCompany.isSupplier}
                        onChange={(e) => setNewCompany({ ...newCompany, isSupplier: e.target.checked })}
                        disabled={isSubmitting}
                        className="h-3 w-3"
                      />
                      Supplier
                    </label>
                    <label className="flex items-center gap-1 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={newCompany.isVendor}
                        onChange={(e) => setNewCompany({ ...newCompany, isVendor: e.target.checked })}
                        disabled={isSubmitting}
                        className="h-3 w-3"
                      />
                      Vendor
                    </label>
                    <label className="flex items-center gap-1 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={newCompany.isInternal}
                        onChange={(e) => setNewCompany({ ...newCompany, isInternal: e.target.checked })}
                        disabled={isSubmitting}
                        className="h-3 w-3"
                      />
                      Internal
                    </label>
                  </div>
                </TableCell>
                <TableCell>0</TableCell>
                <TableCell>0</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSubmitCompany}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingCompany(false);
                        setNewCompany({ companyName: "", tinNumber: "", isClient: true, isSupplier: false, isVendor: false, isInternal: false });
                      }}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Loading State */}
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))
            ) : !companies || companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No companies found. Click &quot;Add Company&quot; to create one.
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow
                  key={company.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedCompany(company)}
                >
                  <TableCell className="font-medium">{company.companyName}</TableCell>
                  <TableCell>{company.tinNumber}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {company.isClient && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Client</span>}
                      {company.isSupplier && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Supplier</span>}
                      {company.isVendor && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Vendor</span>}
                      {company.isInternal && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">Internal</span>}
                    </div>
                  </TableCell>
                  <TableCell>{company._count.projects}</TableCell>
                  <TableCell>{company._count.companyAddresses}</TableCell>
                  <TableCell>{company._count.companyProponents}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Company Detail Sheet */}
      <Sheet open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          {selectedCompany && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCompany.companyName}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Company Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Company Details</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Company Name</label>
                      <div className="text-sm font-medium">{selectedCompany.companyName}</div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">TIN</label>
                      <div className="text-sm font-medium">{selectedCompany.tinNumber || "N/A"}</div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Roles</label>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {selectedCompany.isClient && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Client</span>}
                        {selectedCompany.isSupplier && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Supplier</span>}
                        {selectedCompany.isVendor && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Vendor</span>}
                        {selectedCompany.isInternal && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">Internal</span>}
                        {!selectedCompany.isClient && !selectedCompany.isSupplier && !selectedCompany.isVendor && !selectedCompany.isInternal && (
                          <span className="text-xs text-muted-foreground">No roles assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Addresses */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">Addresses</h3>
                    <Button size="sm" variant="outline">
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {selectedCompany.companyAddresses.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No addresses added</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCompany.companyAddresses.map((address) => (
                        <div key={address.id} className="p-3 border rounded-lg text-sm">
                          <div>
                            {address.houseNo} {address.street} {address.subdivision && `, ${address.subdivision}`}
                          </div>
                          <div className="text-muted-foreground">
                            {address.barangay}, {address.cityMunicipality}, {address.province}, {address.region}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Proponents */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">Proponents</h3>
                    <Button size="sm" variant="outline">
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {selectedCompany.companyProponents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No proponents added</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCompany.companyProponents.map((proponent) => (
                        <div key={proponent.id} className="p-3 border rounded-lg">
                          <div className="text-sm font-medium">{proponent.contactPerson}</div>
                          <div className="text-sm text-muted-foreground">{proponent.contactNumber}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
