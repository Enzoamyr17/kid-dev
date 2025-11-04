"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Eye, RefreshCw, Download } from "lucide-react";

interface AuditLog {
  id: number;
  tableName: string;
  recordId: string;
  action: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  changedBy: number | null;
  changedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface AuditResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({
    tableName: "",
    action: "",
    changedBy: "",
    startDate: "",
    endDate: "",
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch users for filter
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) throw new Error("Failed to fetch users");
        const data: User[] = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
      }
    };

    fetchUsers();
  }, []);

  // Fetch audit logs
  const fetchLogs = async (resetOffset = false, customOffset?: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.tableName) params.append("tableName", filters.tableName);
      if (filters.action) params.append("action", filters.action);
      if (filters.changedBy) params.append("changedBy", filters.changedBy);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      params.append("limit", pagination.limit.toString());
      const offset = resetOffset ? 0 : (customOffset !== undefined ? customOffset : pagination.offset);
      params.append("offset", offset.toString());

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch audit logs");

      const data: AuditResponse = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get action badge color
  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT":
        return "bg-green-100 text-green-800 border-green-200";
      case "UPDATE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "DELETE":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // View detail
  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  // Next page
  const handleNextPage = () => {
    if (pagination.hasMore) {
      const newOffset = pagination.offset + pagination.limit;
      setPagination((prev) => ({ ...prev, offset: newOffset }));
      fetchLogs(false, newOffset);
    }
  };

  // Previous page
  const handlePreviousPage = () => {
    if (pagination.offset > 0) {
      const newOffset = Math.max(0, pagination.offset - pagination.limit);
      setPagination((prev) => ({ ...prev, offset: newOffset }));
      fetchLogs(false, newOffset);
    }
  };

  // Export logs
  const handleExport = async () => {
    try {
      toast.info("Exporting audit logs...");
      const params = new URLSearchParams();

      if (filters.tableName) params.append("tableName", filters.tableName);
      if (filters.action) params.append("action", filters.action);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      params.append("limit", "10000"); // Export up to 10k records

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch audit logs");

      const data: AuditResponse = await response.json();

      // Convert to CSV
      const headers = ["ID", "Table", "Record ID", "Action", "Changed By", "Changed At"];
      const csvContent = [
        headers.join(","),
        ...data.logs.map((log) =>
          [
            log.id,
            log.tableName,
            log.recordId,
            log.action,
            log.user ? `${log.user.firstName} ${log.user.lastName}` : "System",
            formatDate(log.changedAt),
          ].join(",")
        ),
      ].join("\n");

      // Download
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Audit logs exported successfully");
    } catch (error) {
      console.error("Error exporting logs:", error);
      toast.error("Failed to export logs");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            View all database changes and track who changed what
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchLogs(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Field
            label="Table Name"
            type="text"
            value={filters.tableName}
            onChange={(value) => setFilters({ ...filters, tableName: value })}
            placeholder="e.g., Product"
          />
          <Field
            label="Action"
            type="select"
            value={filters.action}
            onChange={(value) => setFilters({ ...filters, action: value })}
            options={[
              { value: "", label: "All Actions" },
              { value: "INSERT", label: "Insert" },
              { value: "UPDATE", label: "Update" },
              { value: "DELETE", label: "Delete" },
            ]}
          />
          <Field
            label="Changed By"
            type="select"
            value={filters.changedBy}
            onChange={(value) => setFilters({ ...filters, changedBy: value })}
            options={[
              { value: "", label: "All Users" },
              ...users.map((user) => ({
                value: user.id.toString(),
                label: `${user.firstName} ${user.lastName}`,
              })),
            ]}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Record ID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Changed By</TableHead>
              <TableHead>Changed At</TableHead>
              <TableHead className="w-[100px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.id}</TableCell>
                  <TableCell className="font-mono text-sm">{log.tableName}</TableCell>
                  <TableCell className="font-mono text-sm">{log.recordId}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.user ? (
                      <div>
                        <div className="font-medium">
                          {log.user.firstName} {log.user.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{log.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(log.changedAt)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewDetail(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {pagination.offset + 1} to{" "}
          {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
          {pagination.total} results
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePreviousPage}
            disabled={pagination.offset === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={!pagination.hasMore}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Audit Log Details</SheetTitle>
            <SheetDescription>
              Detailed view of database change
            </SheetDescription>
          </SheetHeader>

          {selectedLog && (
            <div className="mt-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Log ID:</span>
                    <p className="font-medium">{selectedLog.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Table:</span>
                    <p className="font-medium font-mono">{selectedLog.tableName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Record ID:</span>
                    <p className="font-medium font-mono">{selectedLog.recordId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Action:</span>
                    <p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(
                          selectedLog.action
                        )}`}
                      >
                        {selectedLog.action}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Changed By:</span>
                    <p className="font-medium">
                      {selectedLog.user
                        ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}`
                        : "System"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Changed At:</span>
                    <p className="font-medium">{formatDate(selectedLog.changedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Old Data */}
              {selectedLog.oldData && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Old Values</h3>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.oldData, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Data */}
              {selectedLog.newData && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">New Values</h3>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.newData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Changes Comparison */}
              {selectedLog.oldData && selectedLog.newData && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Changes</h3>
                  <div className="space-y-2">
                    {Object.keys(selectedLog.newData).map((key) => {
                      const oldValue = selectedLog.oldData?.[key];
                      const newValue = selectedLog.newData?.[key];

                      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                        return (
                          <div key={key} className="border-l-2 border-blue-500 pl-3 py-1">
                            <div className="text-xs font-medium">{key}</div>
                            <div className="text-xs text-red-600">
                              - {JSON.stringify(oldValue)}
                            </div>
                            <div className="text-xs text-green-600">
                              + {JSON.stringify(newValue)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
