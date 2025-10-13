"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, X, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Field } from "@/components/ui/field";

interface LifecycleStage {
  id?: string;
  name: string;
  code: string;
  order: number;
  requiresApproval: boolean;
  stageOwner: string[] | null;
  approvalType: "ANY" | "ALL" | null;
}

interface LifecycleTemplate {
  id: string;
  name: string;
  description: string;
  stages: LifecycleStage[];
  _count?: {
    lifecycles: number;
  };
}

export default function LifecycleTemplatesPage() {
  const [templates, setTemplates] = useState<LifecycleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stages: [] as LifecycleStage[]
  });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/lifecycle-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load lifecycle templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const toggleRow = (templateId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }
    setExpandedRows(newExpanded);
  };

  const handleAddStage = () => {
    setFormData({
      ...formData,
      stages: [
        ...formData.stages,
        {
          name: "",
          code: "",
          order: formData.stages.length,
          requiresApproval: false,
          stageOwner: null,
          approvalType: null
        }
      ]
    });
  };

  const handleRemoveStage = (index: number) => {
    setFormData({
      ...formData,
      stages: formData.stages.filter((_, i) => i !== index)
    });
  };

  const handleStageChange = (index: number, field: keyof LifecycleStage, value: string | boolean | string[] | null) => {
    const newStages = [...formData.stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setFormData({ ...formData, stages: newStages });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) {
      toast.error("Please fill in all template fields");
      return;
    }

    if (formData.stages.length === 0) {
      toast.error("Please add at least one stage");
      return;
    }

    for (const stage of formData.stages) {
      if (!stage.name || !stage.code) {
        toast.error("Please fill in all stage fields");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/lifecycle-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error("Failed to create template");

      toast.success("Template created successfully");
      setIsSheetOpen(false);
      setFormData({ name: "", description: "", stages: [] });
      fetchTemplates();
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/lifecycle-templates?id=${id}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Failed to delete template");

      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleEmailsChange = (index: number, value: string) => {
    const emails = value.split(',').map(e => e.trim()).filter(e => e);
    handleStageChange(index, 'stageOwner', emails.length > 0 ? emails : null);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lifecycle Templates</h1>
          <p className="text-muted-foreground">Manage workflow templates for projects</p>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Template Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24 text-center">Stages</TableHead>
              <TableHead className="w-24 text-center">In Use</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No templates found. Create your first lifecycle template.
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <React.Fragment key={template.id}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRow(template.id)}
                      >
                        {expandedRows.has(template.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.description}</TableCell>
                    <TableCell className="text-center">{template.stages.length}</TableCell>
                    <TableCell className="text-center">
                      {template._count?.lifecycles || 0}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                        disabled={template._count && template._count.lifecycles > 0}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(template.id) && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="p-4">
                          <h4 className="font-semibold mb-3">Stages:</h4>
                          <div className="space-y-2">
                            {template.stages.map((stage, index) => (
                              <div key={stage.id} className="flex items-center gap-4 p-3 bg-background rounded-md border">
                                <span className="font-medium text-muted-foreground">{index + 1}.</span>
                                <div className="flex-1">
                                  <div className="font-medium">{stage.name}</div>
                                  <div className="text-sm text-muted-foreground">Code: {stage.code}</div>
                                </div>
                                <div className="flex gap-2">
                                  {stage.requiresApproval && (
                                    <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                      Approval Required ({stage.approvalType})
                                    </span>
                                  )}
                                  {stage.stageOwner && stage.stageOwner.length > 0 && (
                                    <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                                      {stage.stageOwner.length} Owner(s)
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Template Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="overflow-y-auto w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Create Lifecycle Template</SheetTitle>
            <SheetDescription>
              Define a new workflow template with stages
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            <Field
              type="text"
              label="Template Name"
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder="e.g., Standard Project Workflow"
            />

            <Field
              type="text"
              label="Description"
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              placeholder="Brief description of this workflow"
            />

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium">Stages</label>
                <Button size="sm" variant="outline" onClick={handleAddStage}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Stage
                </Button>
              </div>

              <div className="space-y-4">
                {formData.stages.map((stage, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Stage {index + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveStage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <Field
                      type="text"
                      label="Stage Name"
                      value={stage.name}
                      onChange={(value) => handleStageChange(index, 'name', value)}
                      placeholder="e.g., Planning"
                    />

                    <Field
                      type="text"
                      label="Stage Code"
                      value={stage.code}
                      onChange={(value) => handleStageChange(index, 'code', value)}
                      placeholder="e.g., PLAN"
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`approval-${index}`}
                        checked={stage.requiresApproval}
                        onChange={(e) => handleStageChange(index, 'requiresApproval', e.target.checked)}
                        className="h-4 w-4"
                      />
                      <label htmlFor={`approval-${index}`} className="text-sm">
                        Requires Approval
                      </label>
                    </div>

                    {stage.requiresApproval && (
                      <>
                        <Field
                          label="Approval Type"
                          type="select"
                          value={stage.approvalType || ""}
                          onChange={(value) => handleStageChange(index, 'approvalType', value)}
                          options={[
                            { value: "", label: "Select approval type" },
                            { value: "ANY", label: "Any - One approval needed" },
                            { value: "ALL", label: "All - All approvals needed" }
                          ]}
                        />

                        <Field
                          type="text"
                          label="Stage Owners (comma-separated emails)"
                          value={stage.stageOwner?.join(', ') || ''}
                          onChange={(value) => handleEmailsChange(index, value)}
                          placeholder="user1@example.com, user2@example.com"
                        />
                      </>
                    )}
                  </div>
                ))}

                {formData.stages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-4 border-2 border-dashed rounded-lg">
                    No stages added yet. Click &quot;Add Stage&quot; to begin.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Template"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSheetOpen(false);
                  setFormData({ name: "", description: "", stages: [] });
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
