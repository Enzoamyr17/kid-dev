"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, Search, Edit, Trash2, MapPin, Users, Phone } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  companyName: string;
  tinNumber?: string;
  type: 'client' | 'supplier' | 'internal' | 'vendor';
  companyAddresses?: CompanyAddress[];
  companyProponents?: CompanyProponent[];
  _count?: {
    projects: number;
    companyAddresses: number;
    companyProponents: number;
  };
}

interface CompanyAddress {
  id: string;
  companyId: string;
  street1: string;
  street2: string;
  subd: string;
  city: string;
  province: string;
  zipcode: number;
}

interface CompanyProponent {
  id: string;
  companyId: string;
  contactPerson: string;
  contactNumber: string;
}

const CompanyForm = ({ company, onSave, onCancel }: {
  company?: Company;
  onSave: (data: { companyName: string; tinNumber?: string; type: 'client' | 'supplier' | 'internal' | 'vendor' }) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    companyName: company?.companyName || '',
    tinNumber: company?.tinNumber || '',
    type: company?.type || 'client' as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.type) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Company Name *</label>
        <Input
          value={formData.companyName}
          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          placeholder="Enter company name"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">TIN Number</label>
        <Input
          value={formData.tinNumber}
          onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
          placeholder="Enter TIN number"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Company Type *</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'client' | 'supplier' | 'internal' | 'vendor' })}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        >
          <option value="client">Client</option>
          <option value="supplier">Supplier</option>
          <option value="internal">Internal</option>
          <option value="vendor">Vendor</option>
        </select>
      </div>
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          {company ? 'Update' : 'Create'} Company
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

const AddressForm = ({ address, companyId, onSave, onCancel }: {
  address?: CompanyAddress;
  companyId: string;
  onSave: (data: { street1: string; street2?: string; subd?: string; city: string; province: string; zipcode?: number; company_id: string }) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    street1: address?.street1 || '',
    street2: address?.street2 || '',
    subd: address?.subd || '',
    city: address?.city || '',
    province: address?.province || '',
    zipcode: address?.zipcode || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.street1 || !formData.city || !formData.province) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave({ ...formData, company_id: companyId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Street 1 *</label>
        <Input
          value={formData.street1}
          onChange={(e) => setFormData({ ...formData, street1: e.target.value })}
          placeholder="Enter street address"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Street 2</label>
        <Input
          value={formData.street2}
          onChange={(e) => setFormData({ ...formData, street2: e.target.value })}
          placeholder="Enter additional address info"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Subdivision</label>
        <Input
          value={formData.subd}
          onChange={(e) => setFormData({ ...formData, subd: e.target.value })}
          placeholder="Enter subdivision"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">City *</label>
          <Input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Enter city"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Province *</label>
          <Input
            value={formData.province}
            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
            placeholder="Enter province"
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Zip Code</label>
        <Input
          type="number"
          value={formData.zipcode}
          onChange={(e) => setFormData({ ...formData, zipcode: parseInt(e.target.value) || 0 })}
          placeholder="Enter zip code"
        />
      </div>
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          {address ? 'Update' : 'Add'} Address
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

const ProponentForm = ({ proponent, companyId, onSave, onCancel }: {
  proponent?: CompanyProponent;
  companyId: string;
  onSave: (data: { company_id: string; contact_person: string; contact_number: string }) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    contactPerson: proponent?.contactPerson || '',
    contactNumber: proponent?.contactNumber || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactPerson || !formData.contactNumber) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave({ company_id: companyId, contact_person: formData.contactPerson, contact_number: formData.contactNumber });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Contact Person *</label>
        <Input
          value={formData.contactPerson}
          onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
          placeholder="Enter contact person name"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Contact Number *</label>
        <Input
          value={formData.contactNumber}
          onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
          placeholder="Enter contact number"
          required
        />
      </div>
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          {proponent ? 'Update' : 'Add'} Proponent
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isProponentFormOpen, setIsProponentFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();
  const [editingAddress, setEditingAddress] = useState<CompanyAddress | undefined>();
  const [editingProponent, setEditingProponent] = useState<CompanyProponent | undefined>();

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/companies');
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateCompany = async (data: { companyName: string; tinNumber?: string; type: string }) => {
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: data.companyName,
          tin_number: data.tinNumber,
          type: data.type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create company');
      }

      toast.success('Company created successfully');
      setIsCompanyFormOpen(false);
      setEditingCompany(undefined);
      fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create company');
    }
  };

  const handleUpdateCompany = async (data: { companyName: string; tinNumber?: string; type: string }) => {
    if (!editingCompany) return;

    try {
      const response = await fetch('/api/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCompany.id,
          company_name: data.companyName,
          tin_number: data.tinNumber,
          type: data.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update company');
      }

      toast.success('Company updated successfully');
      setIsCompanyFormOpen(false);
      setEditingCompany(undefined);
      fetchCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company');
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company? This will also delete all associated addresses and proponents.')) return;

    try {
      const response = await fetch(`/api/companies?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete company');
      }

      toast.success('Company deleted successfully');
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete company');
    }
  };

  const handleCreateAddress = async (data: Partial<CompanyAddress>) => {
    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create address');
      }

      toast.success('Address created successfully');
      setIsAddressFormOpen(false);
      setEditingAddress(undefined);
      fetchCompanies();
    } catch (error) {
      console.error('Error creating address:', error);
      toast.error('Failed to create address');
    }
  };

  const handleUpdateAddress = async (data: Partial<CompanyAddress>) => {
    if (!editingAddress) return;

    try {
      const response = await fetch('/api/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingAddress.id, ...data }),
      });

      if (!response.ok) {
        throw new Error('Failed to update address');
      }

      toast.success('Address updated successfully');
      setIsAddressFormOpen(false);
      setEditingAddress(undefined);
      fetchCompanies();
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Failed to update address');
    }
  };

  const handleCreateProponent = async (data: Partial<CompanyProponent>) => {
    try {
      const response = await fetch('/api/proponents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create proponent');
      }

      toast.success('Proponent created successfully');
      setIsProponentFormOpen(false);
      setEditingProponent(undefined);
      fetchCompanies();
    } catch (error) {
      console.error('Error creating proponent:', error);
      toast.error('Failed to create proponent');
    }
  };

  const handleUpdateProponent = async (data: Partial<CompanyProponent>) => {
    if (!editingProponent) return;

    try {
      const response = await fetch('/api/proponents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingProponent.id, ...data }),
      });

      if (!response.ok) {
        throw new Error('Failed to update proponent');
      }

      toast.success('Proponent updated successfully');
      setIsProponentFormOpen(false);
      setEditingProponent(undefined);
      fetchCompanies();
    } catch (error) {
      console.error('Error updating proponent:', error);
      toast.error('Failed to update proponent');
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.tinNumber && company.tinNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-blue-100 text-blue-800';
      case 'supplier': return 'bg-green-100 text-green-800';
      case 'internal': return 'bg-purple-100 text-purple-800';
      case 'vendor': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Company Management</h1>
        </div>
        <Sheet open={isCompanyFormOpen} onOpenChange={setIsCompanyFormOpen}>
          <SheetTrigger asChild>
            <Button onClick={() => setEditingCompany(undefined)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editingCompany ? 'Edit Company' : 'Add New Company'}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <CompanyForm
                company={editingCompany}
                onSave={editingCompany ? handleUpdateCompany : handleCreateCompany}
                onCancel={() => {
                  setIsCompanyFormOpen(false);
                  setEditingCompany(undefined);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredCompanies.map((company) => (
            <div key={company.id} className="border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold">{company.companyName}</h3>
                    <Badge className={getTypeColor(company.type)}>
                      {company.type}
                    </Badge>
                  </div>
                  {company.tinNumber && (
                    <p className="text-sm text-gray-600">TIN: {company.tinNumber}</p>
                  )}
                  {company._count && (
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {company._count.projects} projects
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {company._count.companyAddresses} addresses
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {company._count.companyProponents} proponents
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCompany(company);
                      setIsCompanyFormOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCompany(company.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="addresses" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="addresses">Addresses</TabsTrigger>
                  <TabsTrigger value="proponents">Proponents</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="addresses" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Addresses ({company.companyAddresses?.length || 0})</h4>
                    <Sheet open={isAddressFormOpen} onOpenChange={setIsAddressFormOpen}>
                      <SheetTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingAddress(undefined);
                          }}
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
                            companyId={company.id}
                            onSave={editingAddress ? handleUpdateAddress : handleCreateAddress}
                            onCancel={() => {
                              setIsAddressFormOpen(false);
                              setEditingAddress(undefined);
                            }}
                          />
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                  <div className="space-y-2">
                    {company.companyAddresses?.map((address) => (
                      <div key={address.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{address.street1}</p>
                            {address.street2 && <p className="text-sm text-gray-600">{address.street2}</p>}
                            {address.subd && <p className="text-sm text-gray-600">{address.subd}</p>}
                            <p className="text-sm text-gray-600">{address.city}, {address.province}</p>
                            {address.zipcode && <p className="text-sm text-gray-600">{address.zipcode}</p>}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAddress(address);
                              setIsAddressFormOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="proponents" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Proponents ({company.companyProponents?.length || 0})</h4>
                    <Sheet open={isProponentFormOpen} onOpenChange={setIsProponentFormOpen}>
                      <SheetTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingProponent(undefined);
                          }}
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
                            companyId={company.id}
                            onSave={(data) => {
                              if (editingProponent) {
                                handleUpdateProponent(data as Partial<CompanyProponent>);
                              } else {
                                handleCreateProponent(data as Partial<CompanyProponent>);
                              }
                            }}
                            onCancel={() => {
                              setIsProponentFormOpen(false);
                              setEditingProponent(undefined);
                            }}
                          />
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                  <div className="space-y-2">
                    {company.companyProponents?.map((proponent) => (
                      <div key={proponent.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{proponent.contactPerson}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {proponent.contactNumber}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingProponent(proponent);
                              setIsProponentFormOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Company ID</label>
                      <p className="text-sm">{company.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Type</label>
                      <p className="text-sm capitalize">{company.type}</p>
                    </div>
                    {company.tinNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">TIN Number</label>
                        <p className="text-sm">{company.tinNumber}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredCompanies.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first company'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsCompanyFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
