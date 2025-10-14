"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Edit, Trash2 } from "lucide-react";

interface CompanyAddress {
  id: string;
  companyId: string;
  houseNo: string;
  street: string;
  subdivision?: string;
  region: string;
  province: string;
  cityMunicipality: string;
  barangay: string;
}

// Type for address data from forms - uses Record to allow both camelCase and snake_case
type AddressFormData = Record<string, string | undefined> & { id?: string };

interface AddressSheetProps {
  companyId: string;
  addresses: CompanyAddress[];
  onAddressCreated: () => void;
  onAddressUpdated: () => void;
  AddressForm: React.ComponentType<{
    address?: CompanyAddress;
    companyId: string;
    onSave: (data: AddressFormData) => void;
    onCancel: () => void;
  }>;
  handleCreateAddress: (data: AddressFormData) => Promise<void>;
  handleUpdateAddress: (data: AddressFormData) => Promise<void>;
  handleDeleteAddress: (id: string) => Promise<void>;
}

export function AddressSheet({
  companyId,
  addresses,
  onAddressCreated,
  onAddressUpdated,
  AddressForm,
  handleCreateAddress,
  handleUpdateAddress,
  handleDeleteAddress,
}: AddressSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CompanyAddress | undefined>();

  const handleSaveAddress = async (data: AddressFormData) => {
    if (editingAddress) {
      await handleUpdateAddress({ ...data, id: editingAddress.id });
      onAddressUpdated();
    } else {
      await handleCreateAddress(data);
      onAddressCreated();
    }
    setIsOpen(false);
    setEditingAddress(undefined);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setEditingAddress(undefined);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Addresses ({addresses.length})</h4>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="sm"
              onClick={() => setEditingAddress(undefined)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <AddressForm
                address={editingAddress}
                companyId={companyId}
                onSave={handleSaveAddress}
                onCancel={handleCancel}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="space-y-2">
        {addresses.map((address) => (
          <div key={address.id} className="p-3 border rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{address.houseNo} {address.street}</p>
                {address.subdivision && <p className="text-sm text-gray-600">{address.subdivision}</p>}
                <p className="text-sm text-gray-600">{address.barangay}, {address.cityMunicipality}</p>
                <p className="text-sm text-gray-600">{address.province}, {address.region}</p>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingAddress(address);
                    setIsOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleDeleteAddress(address.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

