"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Edit, Phone, Trash2 } from "lucide-react";

interface CompanyProponent {
  id: string;
  companyId: string;
  contactPerson: string;
  contactNumber: string;
}

interface ProponentSheetProps {
  companyId: string;
  proponents: CompanyProponent[];
  onProponentCreated: () => void;
  onProponentUpdated: () => void;
  ProponentForm: React.ComponentType<{
    proponent?: CompanyProponent;
    companyId: string;
    onSave: (data: any) => void;
    onCancel: () => void;
  }>;
  handleCreateProponent: (data: any) => Promise<void>;
  handleUpdateProponent: (data: any) => Promise<void>;
  handleDeleteProponent: (id: string) => Promise<void>;
}

export function ProponentSheet({
  companyId,
  proponents,
  onProponentCreated,
  onProponentUpdated,
  ProponentForm,
  handleCreateProponent,
  handleUpdateProponent,
  handleDeleteProponent,
}: ProponentSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingProponent, setEditingProponent] = useState<CompanyProponent | undefined>();

  const handleSaveProponent = async (data: any) => {
    if (editingProponent) {
      await handleUpdateProponent({ ...data, id: editingProponent.id });
      onProponentUpdated();
    } else {
      await handleCreateProponent(data);
      onProponentCreated();
    }
    setIsOpen(false);
    setEditingProponent(undefined);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setEditingProponent(undefined);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Proponents ({proponents.length})</h4>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="sm"
              onClick={() => setEditingProponent(undefined)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Proponent
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                {editingProponent ? 'Edit Proponent' : 'Add New Proponent'}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <ProponentForm
                proponent={editingProponent}
                companyId={companyId}
                onSave={handleSaveProponent}
                onCancel={handleCancel}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="space-y-2">
        {proponents.map((proponent) => (
          <div key={proponent.id} className="p-3 border rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{proponent.contactPerson}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {proponent.contactNumber}
                </p>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingProponent(proponent);
                    setIsOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleDeleteProponent(proponent.id);
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

