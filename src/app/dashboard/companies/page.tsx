"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Plus, Loader2, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api";

interface CompanyAddress {
  id: number;
  companyId: number;
  houseNo?: string | null;
  street?: string | null;
  subdivision?: string | null;
  region: string;
  province?: string | null;
  cityMunicipality: string;
  barangay: string;
}

interface CompanyProponent {
  id: number;
  companyId: number;
  contactPerson: string;
  contactNumber?: string | null;
  email?: string | null;
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
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isProponentModalOpen, setIsProponentModalOpen] = useState(false);

  const [newCompany, setNewCompany] = useState({
    companyName: "",
    tinNumber: "",
    isClient: true,
    isSupplier: false,
    isVendor: false,
    isInternal: false,
  });

  const [newAddress, setNewAddress] = useState({
    houseNo: "",
    street: "",
    subdivision: "",
    region: "",
    province: "",
    cityMunicipality: "",
    barangay: "",
  });

  const [newProponent, setNewProponent] = useState({
    contactPerson: "",
    contactNumber: "",
    email: "",
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

  const handleSubmitAddress = async () => {
    if (!selectedCompany) return;

    if (!newAddress.region || !newAddress.cityMunicipality || !newAddress.barangay) {
      toast.error("Please fill in required fields: Region, City/Municipality, and Barangay");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiFetch<CompanyAddress>("/api/addresses", {
        method: "POST",
        body: JSON.stringify({
          ...newAddress,
          companyId: selectedCompany.id,
        }),
      });

      // Update the selected company
      const updatedCompany = {
        ...selectedCompany,
        companyAddresses: [...selectedCompany.companyAddresses, created],
        _count: {
          ...selectedCompany._count,
          companyAddresses: selectedCompany._count.companyAddresses + 1,
        },
      };
      setSelectedCompany(updatedCompany);

      // Update the companies list
      await mutate("/api/companies");

      setIsAddressModalOpen(false);
      setNewAddress({ houseNo: "", street: "", subdivision: "", region: "", province: "", cityMunicipality: "", barangay: "" });
      toast.success("Address added successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add address");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitProponent = async () => {
    if (!selectedCompany) return;

    if (!newProponent.contactPerson) {
      toast.error("Please fill in contact person name");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiFetch<CompanyProponent>("/api/proponents", {
        method: "POST",
        body: JSON.stringify({
          ...newProponent,
          companyId: selectedCompany.id,
        }),
      });

      // Update the selected company
      const updatedCompany = {
        ...selectedCompany,
        companyProponents: [...selectedCompany.companyProponents, created],
        _count: {
          ...selectedCompany._count,
          companyProponents: selectedCompany._count.companyProponents + 1,
        },
      };
      setSelectedCompany(updatedCompany);

      // Update the companies list
      await mutate("/api/companies");

      setIsProponentModalOpen(false);
      setNewProponent({ contactPerson: "", contactNumber: "", email: "" });
      toast.success("Proponent added successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add proponent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!selectedCompany) return;

    try {
      await apiFetch(`/api/addresses?id=${addressId}`, { method: "DELETE" });

      const updatedCompany = {
        ...selectedCompany,
        companyAddresses: selectedCompany.companyAddresses.filter(a => a.id !== addressId),
        _count: {
          ...selectedCompany._count,
          companyAddresses: selectedCompany._count.companyAddresses - 1,
        },
      };
      setSelectedCompany(updatedCompany);
      await mutate("/api/companies");
      toast.success("Address deleted successfully");
    } catch (error) {
      toast.error("Failed to delete address");
    }
  };

  const handleDeleteProponent = async (proponentId: number) => {
    if (!selectedCompany) return;

    try {
      await apiFetch(`/api/proponents?id=${proponentId}`, { method: "DELETE" });

      const updatedCompany = {
        ...selectedCompany,
        companyProponents: selectedCompany.companyProponents.filter(p => p.id !== proponentId),
        _count: {
          ...selectedCompany._count,
          companyProponents: selectedCompany._count.companyProponents - 1,
        },
      };
      setSelectedCompany(updatedCompany);
      await mutate("/api/companies");
      toast.success("Proponent deleted successfully");
    } catch (error) {
      toast.error("Failed to delete proponent");
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
                    placeholder="Company Name"
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newCompany.tinNumber}
                    onChange={(e) => setNewCompany({ ...newCompany, tinNumber: e.target.value })}
                    placeholder="TIN"
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={newCompany.isClient}
                        onChange={(e) => setNewCompany({ ...newCompany, isClient: e.target.checked })}
                        disabled={isSubmitting}
                      />
                      Client
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={newCompany.isSupplier}
                        onChange={(e) => setNewCompany({ ...newCompany, isSupplier: e.target.checked })}
                        disabled={isSubmitting}
                      />
                      Supplier
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={newCompany.isVendor}
                        onChange={(e) => setNewCompany({ ...newCompany, isVendor: e.target.checked })}
                        disabled={isSubmitting}
                      />
                      Vendor
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={newCompany.isInternal}
                        onChange={(e) => setNewCompany({ ...newCompany, isInternal: e.target.checked })}
                        disabled={isSubmitting}
                      />
                      Internal
                    </label>
                  </div>
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={handleSubmitCompany} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setIsAddingCompany(false)} disabled={isSubmitting}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Data Rows */}
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : companies && companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No companies found
                </TableCell>
              </TableRow>
            ) : (
              companies?.map((company) => (
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
                <div>
                  <h3 className="font-semibold text-sm mb-2">Company Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">TIN:</span>
                      <div>{selectedCompany.tinNumber || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Roles:</span>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {selectedCompany.isClient && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Client</span>}
                        {selectedCompany.isSupplier && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Supplier</span>}
                        {selectedCompany.isVendor && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Vendor</span>}
                        {selectedCompany.isInternal && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">Internal</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Addresses */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">Addresses</h3>
                    <Button size="sm" variant="outline" onClick={() => setIsAddressModalOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {selectedCompany.companyAddresses.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No addresses added</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCompany.companyAddresses.map((address) => (
                        <div key={address.id} className="p-3 border rounded-lg text-sm flex justify-between items-start">
                          <div>
                            <div>
                              {address.houseNo && `${address.houseNo} `}
                              {address.street && `${address.street}`}
                              {address.subdivision && `, ${address.subdivision}`}
                            </div>
                            <div className="text-muted-foreground">
                              {address.barangay}, {address.cityMunicipality}
                              {address.province && `, ${address.province}`}, {address.region}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(address.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Proponents */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">Proponents</h3>
                    <Button size="sm" variant="outline" onClick={() => setIsProponentModalOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {selectedCompany.companyProponents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No proponents added</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCompany.companyProponents.map((proponent) => (
                        <div key={proponent.id} className="p-3 border rounded-lg flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium">{proponent.contactPerson}</div>
                            {proponent.email && <div className="text-sm text-muted-foreground">{proponent.email}</div>}
                            {proponent.contactNumber && <div className="text-sm text-muted-foreground">{proponent.contactNumber}</div>}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProponent(proponent.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
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

      {/* Add Address Modal */}
      <Sheet open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-[540px]">
          <SheetHeader>
            <SheetTitle>Add Address</SheetTitle>
            <SheetDescription>Add a new address for {selectedCompany?.companyName}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="House No."
                type="text"
                value={newAddress.houseNo}
                onChange={(value) => setNewAddress({ ...newAddress, houseNo: value })}
                disabled={isSubmitting}
                placeholder="House number (optional)"
              />
              <Field
                label="Street"
                type="text"
                value={newAddress.street}
                onChange={(value) => setNewAddress({ ...newAddress, street: value })}
                disabled={isSubmitting}
                placeholder="Street (optional)"
              />
            </div>

            <Field
              label="Subdivision"
              type="text"
              value={newAddress.subdivision}
              onChange={(value) => setNewAddress({ ...newAddress, subdivision: value })}
              disabled={isSubmitting}
              placeholder="Subdivision (optional)"
            />

            <Field
              label="Barangay"
              type="text"
              value={newAddress.barangay}
              onChange={(value) => setNewAddress({ ...newAddress, barangay: value })}
              disabled={isSubmitting}
              placeholder="Barangay"
            />

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="City/Municipality"
                type="text"
                value={newAddress.cityMunicipality}
                onChange={(value) => setNewAddress({ ...newAddress, cityMunicipality: value })}
                disabled={isSubmitting}
                placeholder="City/Municipality"
              />
              <Field
                label="Province"
                type="text"
                value={newAddress.province}
                onChange={(value) => setNewAddress({ ...newAddress, province: value })}
                disabled={isSubmitting}
                placeholder="Province (optional)"
              />
            </div>

            <Field
              label="Region"
              type="text"
              value={newAddress.region}
              onChange={(value) => setNewAddress({ ...newAddress, region: value })}
              disabled={isSubmitting}
              placeholder="Region"
            />

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmitAddress}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Address'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddressModalOpen(false);
                  setNewAddress({ houseNo: "", street: "", subdivision: "", region: "", province: "", cityMunicipality: "", barangay: "" });
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Proponent Modal */}
      <Sheet open={isProponentModalOpen} onOpenChange={setIsProponentModalOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-[540px]">
          <SheetHeader>
            <SheetTitle>Add Proponent</SheetTitle>
            <SheetDescription>Add a new proponent for {selectedCompany?.companyName}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <Field
              label="Contact Person"
              type="text"
              value={newProponent.contactPerson}
              onChange={(value) => setNewProponent({ ...newProponent, contactPerson: value })}
              disabled={isSubmitting}
              placeholder="Contact person name"
            />

            <Field
              label="Email"
              type="text"
              value={newProponent.email}
              onChange={(value) => setNewProponent({ ...newProponent, email: value })}
              disabled={isSubmitting}
              placeholder="Email address (optional)"
            />

            <Field
              label="Contact Number"
              type="text"
              value={newProponent.contactNumber}
              onChange={(value) => setNewProponent({ ...newProponent, contactNumber: value })}
              disabled={isSubmitting}
              placeholder="Contact number (optional)"
            />

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmitProponent}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Proponent'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsProponentModalOpen(false);
                  setNewProponent({ contactPerson: "", contactNumber: "", email: "" });
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
