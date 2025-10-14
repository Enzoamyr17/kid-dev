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
    id: string;
    code: string;
    companyId: string;
    description: string;
    approvedBudgetCost?: string | null;
    bidPercentage: string;
    company: {
        id: string;
        companyName: string;
        tinNumber?: string;
        type: string;
        companyProponents: Array<{
            id: string;
            companyId: string;
            contactPerson: string;
            contactNumber: string;
        }>;
        companyAddresses: Array<{
            id: string;
            companyId: string;
            houseNo: string;
            street: string;
            subdivision?: string;
            region: string;
            province: string;
            cityMunicipality: string;
            barangay: string;
        }>;
    };
    lifecycles: Array<{
        id: string;
        templateId: string;
        projectId: string;
        stageId: string;
        status: string;
        createdAt: string;
        updatedAt: string;
        lifecycleStage: {
            id: string;
            templateId: string;
            name: string;
            code: string;
            order: number;
            requiresApproval: boolean;
            approvalType: string | null;
            stageOwner: unknown;
        };
        lifecycleTemplate: {
            id: string;
            name: string;
            description: string;
        };
    }>;
  }

export default function ProjectPage() {
    const { id } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [bidPercentage, setBidPercentage] = useState<string>("15");
    const [isProjectDetailsOpen, setIsProjectDetailsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState("dashboard");
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

    //Accepts string because the API returns a string in cents (e.g., 50000 = ₱500.00)
    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(parseInt(amount) / 100);
    }

    const fetchProject = async () => {
        setLoading(true);

        try {
            const response = await fetch(`/api/projects/${id}`);

            if (!response.ok) {
                toast.error("Failed to load project");
                return;
            }

            const data = await response.json();
            console.log(data as Project);
            setProject(data);
            setBidPercentage(data.bidPercentage);
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
        } catch (error) {
            console.error("Error fetching forms:", error);
            toast.error("Failed to load forms");
        } finally {
            setFormsLoading(false);
        }
    }

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

    const handleBidPercentageChange = async (value: string) => {
        const oldValue = bidPercentage;

        // Optimistic update
        setBidPercentage(value);
        setProject(prev => prev ? { ...prev, bidPercentage: value } : null);

        try {
            const response = await fetch(`/api/projects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bidPercentage: value }),
            });

            if (!response.ok) throw new Error("Failed to update");
            toast.success("Bid percentage updated");
        } catch {
            // Revert on error
            setBidPercentage(oldValue);
            setProject(prev => prev ? { ...prev, bidPercentage: oldValue } : null);
            toast.error("Failed to update bid percentage");
        }
    };

    // Render the actual project data
    return (
        <div className="flex flex-col justify-start items-center gap-2 w-full overflow-x-hidden p-2">

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col justify-start items-center gap-1 h-full w-full mt-1">
                <TabsList>
                    <TabsTrigger value="dashboard">Project Dashboard</TabsTrigger>
                    <TabsTrigger value="directory">Project Directory</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="w-full space-y-2">
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
                                    <h1 className="text-md font-medium">{formatCurrency(project.approvedBudgetCost || "0")}</h1>
                                </div>
                                <div className="flex justify-between items-center gap-2 py-2">
                                    <h1 className="text-sm font-medium text-muted-foreground">Status:</h1>
                                    <h1>{project.lifecycles[0].lifecycleStage.name}</h1>
                                </div>
                                {project.lifecycles[0].lifecycleStage.code != "QUOTE" && (
                                <div className="flex justify-between items-center gap-2 py-2">
                                    <h1 className="text-sm font-medium text-muted-foreground">Bid Percentage</h1>
                                    <Field
                                        type="number"
                                        value={bidPercentage}
                                        onChange={(value) => handleBidPercentageChange(value.toString())}
                                        className="text-md font-medium text-center w-20"
                                        min={0}
                                        max={100}
                                        />
                                    </div>
                                )}
                                
                            </div>
                        </div>
                    </div>

                    {project.lifecycles[0].lifecycleStage.code === "PR" && (
                        <BudgetAllocationCard />
                    )}

                    <QuotationCard
                        projectId={project.id}
                        bidPercentage={parseInt(bidPercentage)}
                        clientDetails={project.company.companyProponents.map(proponent => ({
                            id: project.company.id,
                            companyName: project.company.companyName,
                            tinNumber: project.company.tinNumber || "",
                            address: constructAddress(project.company.companyAddresses[0]),
                            contactPerson: proponent.contactPerson,
                            contactNumber: proponent.contactNumber,
                            email: null,
                        }))}
                        approvedBudget={parseInt(project.approvedBudgetCost || "0")}
                        initialData={quotationInitialData}
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
                                                const formData = form as { id: string; details?: { quoteNo?: string; totalCost?: string; bidPrice?: string; deliveryDate?: string }; createdAt: string; formItems?: unknown[] };
                                                return (
                                                <div
                                                    key={formData.id}
                                                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                                                    onClick={() => handleQuotationClick(form)}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-semibold text-sm">{formData.details?.quoteNo || 'N/A'}</h3>
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