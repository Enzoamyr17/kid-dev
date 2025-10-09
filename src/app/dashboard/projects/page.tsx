"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/ui/field";

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
  approvedBudgetCost?: string | null;
  company: Company;
}

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ projectId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newProject, setNewProject] = useState({
    code: "",
    companyId: "",
    description: "",
    approvedBudgetCost: "",
  });

  useEffect(() => {
    fetchProjects();
    fetchCompanies();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to fetch projects");
      setProjects(data);
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

  // Handle cell click to start editing
  const handleCellClick = (projectId: string, field: string, currentValue: string) => {
    setEditingCell({ projectId, field });
    setEditValue(currentValue);
  };

  // Save edit with optimistic update
  const saveEdit = async (projectId: string, field: string, oldValue: string) => {
    if (editValue === oldValue) {
      setEditingCell(null);
      return;
    }

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, [field]: editValue } : p))
    );
    setEditingCell(null);

    try {
      // Map camelCase field names to snake_case for API
      const fieldMap: Record<string, string> = {
        approvedBudgetCost: 'approved_budget_cost',
        companyId: 'company_id',
      };
      const apiField = fieldMap[field] || field;

      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, [apiField]: editValue }),
      });
      if (!response.ok) throw new Error("Failed to update");
      toast.success("Updated successfully");
    } catch {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, [field]: oldValue } : p))
      );
      toast.error("Failed to update");
    }
  };

  // Handle key press
  const handleKeyPress = (
    e: React.KeyboardEvent,
    projectId: string,
    field: string,
    oldValue: string
  ) => {
    if (e.key === "Enter") saveEdit(projectId, field, oldValue);
    else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleSubmit = async () => {
    if (!newProject.code || !newProject.companyId || !newProject.description) {
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
          company_id: newProject.companyId,
          description: newProject.description,
          approved_budget_cost: newProject.approvedBudgetCost,
        }),
      });

      if (!response.ok) throw new Error("Failed to create project");

      const createdProject = await response.json();
      setProjects([createdProject, ...projects]);
      setIsAddingRow(false);
      setNewProject({ code: "", companyId: "", description: "", approvedBudgetCost: "" });
      toast.success("Project created successfully");
    } catch (error) {
      toast.error("Failed to create project");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsAddingRow(false);
    setNewProject({ code: "", companyId: "", description: "", approvedBudgetCost: "" });
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
              setNewProject({ code: generateNextCode(), companyId: "", description: "", approvedBudgetCost: "" });
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
              <TableHead>Approved Budget Cost</TableHead>
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
                    value={newProject.approvedBudgetCost}
                    onChange={(e) => setNewProject({ ...newProject, approvedBudgetCost: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                    placeholder="Enter budget cost"
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
                </TableRow>
              ))
            ) : projects.length === 0 && !isAddingRow ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No projects found. Click &quot;Add Project&quot; to create one.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium font-mono">{project.code}</TableCell>
                  <TableCell>{project.company.companyName}</TableCell>
                  <TableCell
                    onClick={() =>
                      handleCellClick(project.id, "description", project.description)
                    }
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {editingCell?.projectId === project.id &&
                    editingCell?.field === "description" ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(project.id, "description", project.description)}
                        onKeyDown={(e) =>
                          handleKeyPress(e, project.id, "description", project.description)
                        }
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      project.description
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() =>
                      handleCellClick(project.id, "approvedBudgetCost", project.approvedBudgetCost || "")
                    }
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {editingCell?.projectId === project.id &&
                    editingCell?.field === "approvedBudgetCost" ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(project.id, "approvedBudgetCost", project.approvedBudgetCost || "")}
                        onKeyDown={(e) =>
                          handleKeyPress(e, project.id, "approvedBudgetCost", project.approvedBudgetCost || "")
                        }
                        className="h-8"
                        type="number"
                        autoFocus
                      />
                    ) : (
                      project.approvedBudgetCost ? `₱${parseInt(project.approvedBudgetCost).toLocaleString()}` : "-"
                    )}
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
