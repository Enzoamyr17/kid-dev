"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/ui/field";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  companyName: string;
  type: string;
}

interface Project {
  id: string;
  code: string;
  companyId: string;
  description: string;
  approvedBudget?: number | null;
  receivable?: number | null;
  workflowstage?: { id: number; name: string; code: string } | null;
  company: Company;
  transactions?: Array<{
    id: number;
    cost: number;
    type: string;
  }>;
}

export default function ProjectManagementPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProject, setNewProject] = useState({
    code: "",
    companyId: "",
    description: "",
    approvedBudget: "",
    workflowTemplateId: "",
  });

  useEffect(() => {
    fetchProjects();
    fetchCompanies();
    fetchWorkflows();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch projects");
      // Filter out PPROJ (encoded) projects, only show PROJ projects
      const regularProjects = data.filter((p: Project) => p.code.startsWith('PROJ'));
      setProjects(regularProjects);
    } catch (error) {
      toast.error("Failed to fetch projects");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/companies");
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch companies");
      setCompanies(data);
    } catch (error) {
      toast.error("Failed to fetch companies");
      console.error(error);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/lifecycle-templates");
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to fetch workflows");
      setWorkflows(data.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
    } catch (e) {
      toast.error("Failed to fetch workflows");
      console.error(e);
    }
  };

  // Auto-generate project code
  const generateNextCode = () => {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const prefix = `PROJ${currentYear}-`;
    const currentYearProjects = projects.filter((p) => p.code.startsWith(prefix));
    const maxNumber =
      currentYearProjects.length > 0
        ? Math.max(...currentYearProjects.map((p) => parseInt(p.code.split("-")[1] || "0", 10)))
        : 0;
    return `${prefix}${(maxNumber + 1).toString().padStart(5, "0")}`;
  };

  // Calculate total expenses for a project
  const getTotalExpenses = (project: Project) => {
    if (!project.transactions || project.transactions.length === 0) return 0;
    return project.transactions
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + Number(t.cost), 0);
  };

  // Calculate win/loss (receivable - expenses)
  const getWinLoss = (project: Project) => {
    const receivable = Number(project.receivable || 0);
    const expenses = getTotalExpenses(project);
    return receivable - expenses;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);
    const formatted = `₱${absoluteAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return isNegative ? `-${formatted}` : formatted;
  };


  const handleSubmit = async () => {
    if (!newProject.code || !newProject.companyId || !newProject.description || !newProject.workflowTemplateId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newProject.code,
          companyId: Number(newProject.companyId),
          description: newProject.description,
          approvedBudget: newProject.approvedBudget ? Number(newProject.approvedBudget) : undefined,
          workflowTemplateId: Number(newProject.workflowTemplateId),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      const createdProject = await response.json();
      setProjects([createdProject, ...projects]);
      setIsAddingRow(false);
      setNewProject({ code: "", companyId: "", description: "", approvedBudget: "", workflowTemplateId: "" });
      toast.success("Project created successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create project";
      toast.error(message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsAddingRow(false);
    setNewProject({ code: "", companyId: "", description: "", approvedBudget: "", workflowTemplateId: "" });
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/api/projects?id=${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete project');

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      toast.success('Project deleted successfully');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
          <p className="text-muted-foreground">Manage your projects</p>
        </div>
        {!isAddingRow && (
          <Button
            onClick={() => {
              setNewProject({ code: generateNextCode(), companyId: "", description: "", approvedBudget: "", workflowTemplateId: "" });
              setIsAddingRow(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Project
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
              <TableHead className="text-right">Approved Budget</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Win/Loss</TableHead>
              {isAddingRow && <TableHead>Workflow Stage</TableHead>}
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Add Row */}
            {isAddingRow && (
              <TableRow className="bg-muted/50">
                <TableCell>
                  <Input value={newProject.code} disabled className="h-8 bg-muted/30" />
                </TableCell>
                <TableCell>
                  <Field
                    type="select"
                    value={newProject.companyId}
                    onChange={(value) => setNewProject({ ...newProject, companyId: value })}
                    options={companies.map((c) => ({ value: c.id, label: c.companyName }))}
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="Enter project description"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newProject.approvedBudget}
                    onChange={(e) => setNewProject({ ...newProject, approvedBudget: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8 text-right"
                    placeholder="0.00"
                    type="number"
                  />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">-</TableCell>
                <TableCell className="text-right text-muted-foreground">-</TableCell>
                {isAddingRow && (
                  <TableCell>
                    <Field
                      type="select"
                      value={newProject.workflowTemplateId}
                      onChange={(value) => setNewProject({ ...newProject, workflowTemplateId: value })}
                      options={workflows.map((w) => ({ value: w.id, label: w.name }))}
                      disabled={isSubmitting}
                      className="h-8 min-w-56"
                    />
                  </TableCell>
                )}  
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
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No projects found. Click &quot;Add Project&quot; to create one.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => {
                const expenses = getTotalExpenses(project);
                const winLoss = getWinLoss(project);

                return (
                  <TableRow key={project.id} onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
                    <TableCell className="font-medium font-mono">{project.code}</TableCell>
                    <TableCell>{project.company.companyName}</TableCell>
                    <TableCell>
                      {project.description}
                    </TableCell>
                    <TableCell className="text-right">
                      {project.approvedBudget ? `₱${Number(project.approvedBudget).toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expenses)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${winLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(winLoss)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
