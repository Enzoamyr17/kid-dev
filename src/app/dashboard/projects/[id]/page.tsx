"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Field } from "@/components/ui/field";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import BudgetAllocationCard from "@/components/cards/BudgetAllocationCard";
import QuotationCard from "@/components/cards/QuotationCard";

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

    useEffect(() => {
        fetchProject();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    //Accepts string because the API returns a string
    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(parseInt(amount));
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
                        
                    </div>
                </div>
            </div>

            {project.lifecycles[0].lifecycleStage.code === "PR" && (
                <BudgetAllocationCard />
            )}

            <QuotationCard />
        </div>
    );
}