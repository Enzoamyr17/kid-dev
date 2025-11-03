"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/ui/field";
import { CompanySearchInput, Company } from "@/components/ui/company-search-input";

interface EncodedProject {
  id: string;
  code: string;
  companyId: string;
  description: string;
  receivable?: number | null;
  createdAt: string;
  company: Company;
  budget?: Array<{
    id: number;
    name: string;
    budget: number;
  }>;
  transaction?: Array<{
    id: number;
    amount: number;
  }>;
}

interface NewEncodedProject {
  companyId: string;
  companyName: string;
  description: string;
  projectDate: Date | undefined;
  receivable: string;
  expense: string;
}

export default function ProjectEncodingPage() {
  const [projects, setProjects] = useState<EncodedProject[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProject, setNewProject] = useState<NewEncodedProject>({
    companyId: "",
    companyName: "",
    description: "",
    projectDate: undefined,
    receivable: "",
    expense: "",
  });

  useEffect(() => {
    fetchProjects();
    fetchCompanies();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects/encode");
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch projects");
      setProjects(data);
    } catch (error) {
      toast.error("Failed to fetch encoded projects");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/companies?type=client");
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch companies");
      setCompanies(data);
    } catch (error) {
      toast.error("Failed to fetch companies");
      console.error(error);
    }
  };

  // Generate project code preview based on selected date
  const generateCodePreview = () => {
    if (!newProject.projectDate) return "PPROJYY-#####";
    const year = newProject.projectDate.getFullYear().toString().slice(-2);
    return `PPROJ${year}-#####`;
  };

  const handleSubmit = async () => {
    console.log('[Project Encoding] Starting submission with data:', newProject);

    if (
      !newProject.companyName.trim() ||
      !newProject.description ||
      !newProject.projectDate
    ) {
      console.log('[Project Encoding] Validation failed:', {
        companyName: newProject.companyName,
        description: newProject.description,
        projectDate: newProject.projectDate,
      });
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare payload - send companyId if selected, otherwise companyName
      const payload: {
        companyId?: number;
        companyName?: string;
        description: string;
        projectDate: string;
        receivable: number;
        expense: number;
      } = {
        description: newProject.description,
        projectDate: newProject.projectDate.toISOString(),
        receivable: newProject.receivable ? Number(newProject.receivable) : 0,
        expense: newProject.expense ? Number(newProject.expense) : 0,
      };

      if (newProject.companyId) {
        payload.companyId = Number(newProject.companyId);
      } else {
        payload.companyName = newProject.companyName.trim();
      }

      console.log('[Project Encoding] Sending payload to API:', payload);

      const response = await fetch("/api/projects/encode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log('[Project Encoding] API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Project Encoding] API error response:', errorData);
        throw new Error(errorData.error || "Failed to create encoded project");
      }

      console.log('[Project Encoding] Project created successfully');

      // Fetch the full project data with relations
      const fullProjectResponse = await fetch("/api/projects/encode");
      const fullProjects = await fullProjectResponse.json();
      console.log('[Project Encoding] Fetched updated projects list:', fullProjects.length, 'projects');
      setProjects(fullProjects);

      // Refresh companies list in case a new one was created
      await fetchCompanies();

      setIsAddingRow(false);
      setNewProject({
        companyId: "",
        companyName: "",
        description: "",
        projectDate: undefined,
        receivable: "",
        expense: "",
      });
      toast.success("Encoded project created successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create encoded project";
      console.error('[Project Encoding] Error during submission:', error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsAddingRow(false);
    setNewProject({
      companyId: "",
      companyName: "",
      description: "",
      projectDate: undefined,
      receivable: "",
      expense: "",
    });
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this encoded project?"))
      return;

    try {
      const response = await fetch(`/api/projects/encode?id=${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete project");

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      toast.success("Encoded project deleted successfully");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  // Calculate total expense from transactions
  const getTotalExpense = (project: EncodedProject) => {
    if (!project.transaction || project.transaction.length === 0) return 0;
    return project.transaction.reduce((sum, t) => sum + Number(t.amount), 0);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Encoding</h1>
          <p className="text-muted-foreground">
            Encode previous projects with simplified data entry
          </p>
        </div>
        {!isAddingRow && (
          <Button
            onClick={() => {
              setIsAddingRow(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Encode Project
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Code</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Project Date</TableHead>
              <TableHead className="text-right">Income (Receivable)</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Add Row */}
            {isAddingRow && (
              <TableRow className="bg-muted/50">
                <TableCell>
                  <Input
                    value={generateCodePreview()}
                    disabled
                    className="h-8 bg-muted/30 font-mono text-xs"
                  />
                </TableCell>
                <TableCell className="relative">
                  <CompanySearchInput
                    value={newProject.companyName}
                    selectedCompanyId={newProject.companyId}
                    onChange={(companyName, companyId) =>
                      setNewProject({
                        ...newProject,
                        companyName,
                        companyId: companyId || "",
                      })
                    }
                    companies={companies}
                    disabled={isSubmitting}
                    placeholder="Search or enter company name..."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({ ...newProject, description: e.target.value })
                    }
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="Project name"
                  />
                </TableCell>
                <TableCell>
                  <Field
                    type="date"
                    value={newProject.projectDate}
                    onChange={(date) =>
                      setNewProject({ ...newProject, projectDate: date })
                    }
                    disabled={isSubmitting}
                    className="h-8"
                    captionLayout="dropdown"
                    fromYear={2000}
                    toYear={new Date().getFullYear()}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newProject.receivable}
                    onChange={(e) =>
                      setNewProject({ ...newProject, receivable: e.target.value })
                    }
                    disabled={isSubmitting}
                    className="h-8 text-right"
                    placeholder="0.00"
                    type="number"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newProject.expense}
                    onChange={(e) =>
                      setNewProject({ ...newProject, expense: e.target.value })
                    }
                    disabled={isSubmitting}
                    className="h-8 text-right"
                    placeholder="0.00"
                    type="number"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSubmit}
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
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Loading State */}
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : projects.length === 0 && !isAddingRow ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  No encoded projects found. Click &quot;Encode Project&quot; to
                  create one.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium font-mono text-xs">
                    {project.code}
                  </TableCell>
                  <TableCell>{project.company.companyName}</TableCell>
                  <TableCell>{project.description}</TableCell>
                  <TableCell>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {project.receivable
                      ? `₱${Number(project.receivable).toLocaleString()}`
                      : "₱0"}
                  </TableCell>
                  <TableCell className="text-right">
                    ₱{getTotalExpense(project).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(project.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
