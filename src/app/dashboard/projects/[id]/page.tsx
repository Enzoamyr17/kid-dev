"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Field } from "@/components/ui/field";
import { ChevronDownIcon } from "lucide-react";
import BudgetAllocationCard from "@/components/cards/BudgetAllocationCard";
import QuotationCard from "@/components/cards/QuotationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuotationViewModal from "@/components/modals/QuotationViewModal";

interface Project {
    id: number;
    code: string;
    companyId: number;
    description: string;
    approvedBudget: number | null;
    workflowId: number;
    workflowStageId: number;
    company: {
        id: number;
        companyName: string;
        tinNumber?: string;
        isClient: boolean;
        isSupplier: boolean;
        isVendor: boolean;
        isInternal: boolean;
        companyProponents: Array<{
            id: number;
            companyId: number;
            contactPerson: string;
            contactNumber: string;
            email: string | null;
        }>;
        companyAddresses: Array<{
            id: number;
            companyId: number;
            houseNo: string;
            street: string;
            subdivision?: string;
            region: string;
            province: string;
            cityMunicipality: string;
            barangay: string;
        }>;
    };
    workflow: {
        id: number;
        name: string;
        description: string;
    };
    workflowstage: {
        id: number;
        name: string;
        code: string;
        order: number;
        requiresApproval: boolean;
    };
  }

export default function ProjectPage() {
    const { id } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [bidPercentage] = useState<number>(15);
    const [isProjectDetailsOpen, setIsProjectDetailsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState("details");
    const [forms, setForms] = useState<{
        quotations: unknown[];
        purchaseRequests: unknown[];
        purchaseOrders: unknown[];
    } | null>(null);
    const [formsLoading, setFormsLoading] = useState(false);
    const [selectedQuotation, setSelectedQuotation] = useState<unknown>(null);
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [quotationInitialData, setQuotationInitialData] = useState<unknown>(null);


    useEffect(() => {
        fetchProject();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(Number(amount));
    };

    const fetchProject = async () => {
        setLoading(true);

        try {
            const response = await fetch(`/api/projects/${id}`);

            if (!response.ok) {
                toast.error("Failed to load project");
                return;
            }

            const data = await response.json();
            setProject(data);
        } catch (error) {
            console.error("Error fetching project:", error);
            toast.error("Failed to load project");
        } finally {
            setLoading(false);
        }
    }

    const fetchForms = async () => {
        setFormsLoading(true);

        try {
            const response = await fetch(`/api/projects/${id}/forms`);

            if (!response.ok) {
                toast.error("Failed to load forms");
                return;
            }

            const data = await response.json();
            setForms(data);
            console.log(data);
        } catch (error) {
            console.error("Error fetching forms:", error);
            toast.error("Failed to load forms");
        } finally {
            setFormsLoading(false);
        }
    }

    const handleSaveSuccess = () => {
        fetchForms();
    };

    useEffect(() => {
        if (activeTab === "directory" && !forms) {
            fetchForms();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const handleQuotationClick = (quotation: unknown) => {
        setSelectedQuotation(quotation);
        setIsQuotationModalOpen(true);
    };

    const handleCreateNewVersion = (quotation: unknown) => {
        // Pass the quotation data to QuotationCard
        setQuotationInitialData(quotation);
        // Switch to dashboard tab to show QuotationCard
        setActiveTab("dashboard");
        toast.success("Loading quotation data for new version...");
    };

    // Show skeleton UI while loading
    // This gives better UX than a blank screen or spinner
    if (loading) {
        return (
            <div className="p-6">
                <Skeleton className="h-8 w-64 mb-4" />
                <Skeleton className="h-4 w-96 mb-2" />
                <Skeleton className="h-4 w-80" />
            </div>
        );
    }

    // If not loading but project is still null, something went wrong
    // This happens when the API returns an error
    if (!project) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold">Project not found</h1>
                <p className="text-muted-foreground">The project you&apos;re looking for doesn&apos;t exist.</p>
            </div>
        );
    }

    const constructAddress = (address: { houseNo: string; street: string; subdivision?: string; cityMunicipality: string; province: string; region: string; barangay: string }) => {
        return `${address.houseNo} ${address.street} ${address.subdivision} ${address.cityMunicipality} ${address.province} ${address.region} ${address.barangay}`;
    }


    // Render the actual project data
    return (
        <div className="flex flex-col justify-start items-center gap-2 w-full overflow-x-hidden px-1">

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col justify-start items-center gap-1 h-full w-full">
                <TabsList>
                    <TabsTrigger value="details">Project Details</TabsTrigger>
                    <TabsTrigger value="budgetAllocation">Budget Allocation</TabsTrigger>
                    <TabsTrigger value="currentAction">{project.workflowstage.code === "QUOTE" ? "Create Quotation" : project.workflowstage.code === "PR" ? "Create Purchase Request" : "Create Purchase Order"}</TabsTrigger>
                    <TabsTrigger value="directory">Project Directory</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="w-full space-y-2">
                    {/* Project Details */}
                    <div className="rounded-lg border w-full">
                        <div onClick={() => setIsProjectDetailsOpen(!isProjectDetailsOpen)} className={`flex justify-between items-center border-b p-4 ${isProjectDetailsOpen ? "border-zinc-200" : "border-transparent"}`}>
                            <h2 className="text-xl font-semibold">Project Details</h2>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isProjectDetailsOpen ? "rotate-180" : ""}`} />
                        </div>
                        <div className={`grid grid-cols-2 gap-4 overflow-y-hidden p-6 ${isProjectDetailsOpen ? "max-h-[300px] py-6" : "max-h-0 py-0"} transition-all duration-300`}>
                            <div className="space-y-2 divide-y divide-gray-200">
                                <div className="flex justify-between items-start gap-2">
                                    <h1 className="text-sm text-muted-foreground">Client:</h1>
                                    <h1 className="text-md font-medium">{project.company.companyName}</h1>
                                </div>
                                <div className="flex justify-between items-start gap-2">
                                    <h1 className="text-sm text-muted-foreground">Address:</h1>
                                    <h1 className="text-md font-medium text-right max-w-sm leading-tight">{constructAddress(project.company.companyAddresses[0])}</h1>
                                </div>
                                <div className="flex justify-between items-start gap-2">
                                    <h1 className="text-sm text-muted-foreground">TIN:</h1>
                                    <h1 className="text-md font-medium">{project.company.tinNumber ? `${project.company.tinNumber}` : "Unavailable"}</h1>
                                </div>
                                <div className="flex justify-between items-start gap-2">
                                    <h1 className="text-sm text-muted-foreground">Contact Person:</h1>
                                    <div>
                                        <h1 className="text-md font-medium">{project.company.companyProponents[0].contactPerson}</h1>
                                        <p className="text-sm text-muted-foreground text-right">{project.company.companyProponents[0].contactNumber}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2 divide-y divide-gray-200">
                                <div className="flex justify-between items-start gap-2">
                                    <h1 className="text-sm font-medium text-muted-foreground"></h1>
                                    <h1 className="text-md font-medium">{project.description || "No description available."}</h1>
                                </div>
                                <div className="flex justify-between items-start gap-2">
                                    <h1 className="text-sm font-medium text-muted-foreground">Approved Budget</h1>
                                    <h1 className="text-md font-medium">{formatCurrency(project.approvedBudget || 0)}</h1>
                                </div>
                                <div className="flex justify-between items-center gap-2 py-2">
                                    <h1 className="text-sm font-medium text-muted-foreground">Status:</h1>
                                    <h1>{project.workflowstage.name}</h1>
                                </div>
                                <div className="flex justify-between items-center gap-2 py-2">
                                    <h1 className="text-sm font-medium text-muted-foreground">Workflow:</h1>
                                    <h1>{project.workflow.name}</h1>
                                </div>
                                
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="currentAction" className="w-full space-y-4">
                    {project.workflowstage.code === "QUOTE" && (
                        <QuotationCard
                            projectId={String(project.id)}
                            bidPercentage={bidPercentage}
                            clientDetails={project.company.companyProponents.map(proponent => ({
                                id: String(project.company.id),
                                companyName: project.company.companyName,
                                tinNumber: project.company.tinNumber || "",
                                address: constructAddress(project.company.companyAddresses[0]),
                                contactPerson: proponent.contactPerson,
                                contactNumber: proponent.contactNumber,
                                email: proponent.email,
                            }))}
                            approvedBudget={Number(project.approvedBudget) || 0}
                            initialData={quotationInitialData}
                            onSaveSuccess={handleSaveSuccess}
                        />
                    )}
                </TabsContent>

                <TabsContent value="budgetAllocation" className="w-full space-y-4">
                    <BudgetAllocationCard
                        projectBudget={Number(project.approvedBudget) || 0}
                        projectId={project.id}
                    />
                </TabsContent>
                
                <TabsContent value="directory" className="w-full space-y-4">
                    {formsLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    ) : !forms ? (
                        <div className="p-6 text-center text-muted-foreground">
                            <p>Loading forms...</p>
                        </div>
                    ) : (
                        <>
                            {/* Quotations Section */}
                            <div className="rounded-lg border w-full">
                                <div className="border-b p-4 bg-blue-50/30">
                                    <h2 className="text-lg font-semibold">Quotations</h2>
                                </div>
                                <div className="p-4">
                                    {forms.quotations.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No quotations found</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {forms.quotations.map((form: unknown) => {
                                                const formData = form as { id: number; code?: string; totalCost?: string; bidPrice?: string; deliveryDate?: string ; createdAt: string; quotationItems?: QuotationItem[] };
                                                interface QuotationItem {
                                                    id: number;
                                                    name: string;
                                                    quantity: number;
                                                    price: number;
                                                    total: number;
                                                }
                                                return (
                                                <div
                                                    key={formData.id}
                                                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                                                    onClick={() => handleQuotationClick(form)}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-semibold text-sm">{formData.code || 'N/A'}</h3>
                                                    </div>
                                                    <div className="space-y-1 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Total Cost:</span>
                                                            <span className="font-medium">{formatCurrency(formData.totalCost || "0")}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Bid Price:</span>
                                                            <span className="font-medium">{formatCurrency(formData.bidPrice || "0")}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Items:</span>
                                                            <span className="font-medium">{formData.quotationItems?.length || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Purchase Requests Section */}
                            <div className="rounded-lg border w-full">
                                <div className="border-b p-4 bg-amber-50/30">
                                    <h2 className="text-lg font-semibold">Purchase Requests</h2>
                                </div>
                                <div className="p-4">
                                    {forms.purchaseRequests.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No purchase requests found</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {forms.purchaseRequests.map((form: unknown) => {
                                                const formData = form as { id: string; details?: { prNo?: string; totalCost?: string; bidPrice?: string; dateRequired?: string }; createdAt: string; formItems?: unknown[] };
                                                return (
                                                <div key={formData.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-semibold text-sm">{formData.details?.prNo || 'N/A'}</h3>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(formData.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Total Cost:</span>
                                                            <span className="font-medium">{formatCurrency(formData.details?.totalCost || "0")}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Bid Price:</span>
                                                            <span className="font-medium">{formatCurrency(formData.details?.bidPrice || "0")}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Items:</span>
                                                            <span className="font-medium">{formData.formItems?.length || 0}</span>
                                                        </div>
                                                        {formData.details?.dateRequired && (
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Required:</span>
                                                                <span className="font-medium">
                                                                    {new Date(formData.details.dateRequired).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Purchase Orders Section */}
                            <div className="rounded-lg border w-full">
                                <div className="border-b p-4 bg-green-50/30">
                                    <h2 className="text-lg font-semibold">Purchase Orders</h2>
                                </div>
                                <div className="p-4">
                                    {forms.purchaseOrders.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">No purchase orders found</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {forms.purchaseOrders.map((form: unknown) => {
                                                const formData = form as { id: string; details?: { poNo?: number; totalCost?: string; bidPrice?: string; deliveryDate?: number }; createdAt: string; formItems?: unknown[] };
                                                return (
                                                <div key={formData.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-semibold text-sm">PO #{formData.details?.poNo || 'N/A'}</h3>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(formData.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Total Cost:</span>
                                                            <span className="font-medium">{formatCurrency(formData.details?.totalCost || "0")}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Bid Price:</span>
                                                            <span className="font-medium">{formatCurrency(formData.details?.bidPrice || "0")}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Items:</span>
                                                            <span className="font-medium">{formData.formItems?.length || 0}</span>
                                                        </div>
                                                        {formData.details?.deliveryDate && (
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Delivery:</span>
                                                                <span className="font-medium">{formData.details.deliveryDate}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>

            {/* Quotation View Modal */}
            <QuotationViewModal
                isOpen={isQuotationModalOpen}
                onClose={() => setIsQuotationModalOpen(false)}
                quotation={selectedQuotation}
                onCreateNewVersion={handleCreateNewVersion}
            />

        </div>
    );
}