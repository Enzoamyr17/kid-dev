"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Plus, Loader2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface User {
  id: number;
  firstName: string;
  secondName: string | null;
  middleName: string | null;
  lastName: string;
  email: string;
  birthdate: string | null;
  contact: string | null;
  department: string | null;
  position: string | null;
  isActive: boolean;
}

interface UserFormData {
  firstName: string;
  secondName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  birthdate: string;
  contact: string;
  department: string;
  position: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: "",
    secondName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    birthdate: "",
    contact: "",
    department: "",
    position: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      secondName: "",
      middleName: "",
      lastName: "",
      email: "",
      password: "",
      birthdate: "",
      contact: "",
      department: "",
      position: "",
    });
    setEditingUser(null);
  };

  const handleAddClick = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      secondName: user.secondName || "",
      middleName: user.middleName || "",
      lastName: user.lastName,
      email: user.email,
      password: "",
      birthdate: user.birthdate ? new Date(user.birthdate).toISOString().split('T')[0] : "",
      contact: user.contact || "",
      department: user.department || "",
      position: user.position || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error("First name, last name, and email are required");
      return;
    }

    // Validate password for new users
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      toast.error("Password must be at least 6 characters for new users");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingUser) {
        // Update existing user
        const response = await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: formData.firstName,
            secondName: formData.secondName || null,
            middleName: formData.middleName || null,
            lastName: formData.lastName,
            department: formData.department || null,
            position: formData.position || null,
            contact: formData.contact || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update user");
        }

        toast.success("User updated successfully");
      } else {
        // Create new user
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create user");
        }

        toast.success("User created successfully");
      }

      setIsModalOpen(false);
      resetForm();
      fetchUsers(); // Refresh the list
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (userId: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: newStatus } : u));

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (!response.ok) throw new Error("Failed");
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: currentStatus } : u));
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage system users and their permissions</p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No users found. Click &quot;Add User&quot; to create one.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {`${user.firstName}${user.secondName ? ' ' + user.secondName : ''}${user.middleName ? ' ' + user.middleName : ''} ${user.lastName}`}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell>{user.position || '-'}</TableCell>
                  <TableCell>{user.contact || '-'}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleStatus(user.id, user.isActive)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        user.isActive
                          ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                          : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditClick(user)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* User Form Modal */}
      <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-[540px]">
          <SheetHeader>
            <SheetTitle>{editingUser ? 'Edit User' : 'Add New User'}</SheetTitle>
            <SheetDescription>
              {editingUser ? 'Update user information' : 'Create a new user account'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="First Name"
                type="text"
                value={formData.firstName}
                onChange={(value) => setFormData({ ...formData, firstName: value })}
                disabled={isSubmitting}
                placeholder="First name"
              />

              <Field
                label="Last Name"
                type="text"
                value={formData.lastName}
                onChange={(value) => setFormData({ ...formData, lastName: value })}
                disabled={isSubmitting}
                placeholder="Last name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Second Name"
                type="text"
                value={formData.secondName}
                onChange={(value) => setFormData({ ...formData, secondName: value })}
                disabled={isSubmitting}
                placeholder="Second name (optional)"
              />

              <Field
                label="Middle Name"
                type="text"
                value={formData.middleName}
                onChange={(value) => setFormData({ ...formData, middleName: value })}
                disabled={isSubmitting}
                placeholder="Middle name (optional)"
              />
            </div>

            <Field
              label="Email"
              type="text"
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
              disabled={isSubmitting || !!editingUser}
              placeholder="Email address"
            />

            {!editingUser && (
              <Field
                label="Password"
                type="password"
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
                disabled={isSubmitting}
                placeholder="At least 6 characters"
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Department"
                type="text"
                value={formData.department}
                onChange={(value) => setFormData({ ...formData, department: value })}
                disabled={isSubmitting}
                placeholder="Department"
              />

              <Field
                label="Position"
                type="text"
                value={formData.position}
                onChange={(value) => setFormData({ ...formData, position: value })}
                disabled={isSubmitting}
                placeholder="Position"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Birthdate"
                type="date"
                value={formData.birthdate ? new Date(formData.birthdate) : undefined}
                onChange={(date) => setFormData({ ...formData, birthdate: date ? date.toISOString().split('T')[0] : '' })}
                disabled={isSubmitting}
                captionLayout="dropdown"
                fromYear={1940}
                toYear={new Date().getFullYear()}
              />

              <Field
                label="Contact Number"
                type="text"
                value={formData.contact}
                onChange={(value) => setFormData({ ...formData, contact: value })}
                disabled={isSubmitting}
                placeholder="Contact number"
              />
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
                    {editingUser ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingUser ? 'Update User' : 'Create User'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
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
