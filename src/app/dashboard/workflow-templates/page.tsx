"use client";

import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, X, Trash2, Edit2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface WorkflowStage {
  id: number;
  templateId: number;
  name: string;
  code: string;
  order: number;
  requiresApproval: boolean;
}

interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  workflowStages: WorkflowStage[];
  _count: { projects: number };
}

export default function WorkflowTemplatesPage() {
  const { data: templates, error, isLoading } = useSWR<WorkflowTemplate[]>("/api/workflow-templates");
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<number>>(new Set());
  const [editingStage, setEditingStage] = useState<number | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    stages: [{ name: "", code: "", requiresApproval: false }],
  });

  const toggleExpanded = (id: number) => {
    const newSet = new Set(expandedTemplates);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedTemplates(newSet);
  };

  const handleAddStage = () => {
    setNewTemplate({
      ...newTemplate,
      stages: [...newTemplate.stages, { name: "", code: "", requiresApproval: false }],
    });
  };

  const handleRemoveStage = (index: number) => {
    setNewTemplate({
      ...newTemplate,
      stages: newTemplate.stages.filter((_, i) => i !== index),
    });
  };

  const handleSubmitTemplate = async () => {
    if (!newTemplate.name || newTemplate.stages.some(s => !s.name || !s.code)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiFetch<WorkflowTemplate>("/api/workflow-templates", {
        method: "POST",
        body: JSON.stringify(newTemplate),
      });

      await mutate("/api/workflow-templates", [...(templates || []), created], false);
      setIsAddingTemplate(false);
      setNewTemplate({ name: "", description: "", stages: [{ name: "", code: "", requiresApproval: false }] });
      toast.success("Workflow template created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await apiFetch(`/api/workflow-templates?id=${id}`, { method: "DELETE" });
      await mutate("/api/workflow-templates", templates?.filter(t => t.id !== id), false);
      toast.success("Template deleted successfully");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleDeleteStage = async (templateId: number, stageId: number) => {
    if (!confirm("Are you sure you want to delete this stage?")) return;

    try {
      await apiFetch(`/api/workflow-templates/stages?id=${stageId}`, { method: "DELETE" });
      await mutate("/api/workflow-templates");
      toast.success("Stage deleted successfully");
    } catch {
      toast.error("Failed to delete stage");
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Failed to load workflow templates</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Templates</h1>
          <p className="text-muted-foreground">Manage workflow templates and stages</p>
        </div>
        {!isAddingTemplate && (
          <Button onClick={() => setIsAddingTemplate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Template Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Stages</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Add Template Row */}
            {isAddingTemplate && (
              <>
                <TableRow className="bg-muted/50">
                  <TableCell></TableCell>
                  <TableCell>
                    <Input
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      disabled={isSubmitting}
                      className="h-8"
                      placeholder="Template name"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      disabled={isSubmitting}
                      className="h-8"
                      placeholder="Description"
                    />
                  </TableCell>
                  <TableCell>{newTemplate.stages.length}</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSubmitTemplate}
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
                        onClick={() => {
                          setIsAddingTemplate(false);
                          setNewTemplate({ name: "", description: "", stages: [{ name: "", code: "", requiresApproval: false }] });
                        }}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {/* Stages for new template */}
                <TableRow className="bg-blue-50/30">
                  <TableCell colSpan={6} className="py-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm">Stages</span>
                        <Button size="sm" variant="outline" onClick={handleAddStage} disabled={isSubmitting}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Stage
                        </Button>
                      </div>
                      {newTemplate.stages.map((stage, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <span className="text-sm w-8">{index + 1}.</span>
                          <Input
                            value={stage.name}
                            onChange={(e) => {
                              const updated = [...newTemplate.stages];
                              updated[index].name = e.target.value;
                              setNewTemplate({ ...newTemplate, stages: updated });
                            }}
                            disabled={isSubmitting}
                            className="h-8"
                            placeholder="Stage name"
                          />
                          <Input
                            value={stage.code}
                            onChange={(e) => {
                              const updated = [...newTemplate.stages];
                              updated[index].code = e.target.value.toUpperCase();
                              setNewTemplate({ ...newTemplate, stages: updated });
                            }}
                            disabled={isSubmitting}
                            className="h-8 w-32"
                            placeholder="CODE"
                          />
                          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={stage.requiresApproval}
                              onChange={(e) => {
                                const updated = [...newTemplate.stages];
                                updated[index].requiresApproval = e.target.checked;
                                setNewTemplate({ ...newTemplate, stages: updated });
                              }}
                              disabled={isSubmitting}
                              className="h-4 w-4"
                            />
                            Requires Approval
                          </label>
                          {newTemplate.stages.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveStage(index)}
                              disabled={isSubmitting}
                              className="h-8 w-8"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              </>
            )}

            {/* Loading State */}
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))
            ) : !templates || templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No workflow templates found. Click &quot;Add Template&quot; to create one.
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <React.Fragment key={template.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => toggleExpanded(template.id)}>
                      {expandedTemplates.has(template.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell onClick={() => toggleExpanded(template.id)} className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell onClick={() => toggleExpanded(template.id)}>
                      {template.description}
                    </TableCell>
                    <TableCell onClick={() => toggleExpanded(template.id)}>
                      {template.workflowStages.length} stages
                    </TableCell>
                    <TableCell onClick={() => toggleExpanded(template.id)}>
                      {template._count?.projects ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="h-8 w-8 p-0"
                        disabled={(template._count?.projects ?? 0) > 0}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedTemplates.has(template.id) && (
                    <TableRow className="bg-blue-50/30">
                      <TableCell colSpan={6} className="py-4">
                        <div className="space-y-2">
                          <span className="font-semibold text-sm">Stages</span>
                          {template.workflowStages.map((stage, index) => (
                            <div key={stage.id} className="flex gap-2 items-center">
                              <span className="text-sm w-8">{index + 1}.</span>
                              <Input
                                value={stage.name}
                                disabled
                                className="h-8 bg-white"
                              />
                              <Input
                                value={stage.code}
                                disabled
                                className="h-8 w-32 bg-white"
                              />
                              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={stage.requiresApproval}
                                  disabled
                                  className="h-4 w-4"
                                />
                                Requires Approval
                              </label>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteStage(template.id, stage.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ))}
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
    </div>
  );
}

