# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

**IMPORTANT**:
- DO NOT run `npm run dev` - The user always has the dev server running
- DO NOT run `npm run build` - The user runs this at the end of each session
- Only run these commands if explicitly requested by the user

## Architecture

This is a Next.js 15 application using:
- **App Router** (`src/app/` directory structure)
- **TypeScript** with strict mode enabled
- **Tailwind CSS 4** with inline theme configuration
- **React 19**

### Font Configuration

Poppins font loaded with weights: 400, 500, 600, 700

Legacy setup (if still present):
- Geist Sans (variable: `--font-geist-sans`)
- Geist Mono (variable: `--font-geist-mono`)

### Tailwind CSS 4 Setup

This project uses Tailwind CSS 4 with the new inline theme syntax. Theme customization is done in [src/app/globals.css](src/app/globals.css) using `@theme inline` blocks rather than a separate `tailwind.config.js` file.

Color scheme variables (`--background`, `--foreground`) are defined in CSS custom properties and automatically adapt to dark mode via `prefers-color-scheme`.

### Path Aliases

TypeScript path alias configured in [tsconfig.json](tsconfig.json):
- `@/*` → `./src/*`

### ESLint Configuration

Uses ESLint flat config format in [eslint.config.mjs](eslint.config.mjs) with Next.js recommended rules (`next/core-web-vitals`, `next/typescript`).

## Component Patterns

### shadcn/ui Components

This project uses [shadcn/ui](https://ui.shadcn.com) as the primary component library. All components are located in [src/components/ui](src/components/ui).

**Installed Components:**
- `Button` - Standard buttons with variants (primary, secondary, ghost, destructive, outline)
- `Field` - Unified input component for text, numbers, dates, and dropdowns (ALWAYS use this instead of raw inputs)
- `DatePicker` - Custom wrapper combining Calendar + Popover (integrated into Field component)
- `Calendar` - Date selection component
- `Sidebar` - Collapsible sidebar with icon-only collapsed state
- `Popover` - Floating content container
- `Dropdown Menu` - Context menus and dropdowns
- `Tabs` - Tabbed navigation
- `Sonner` - Toast notifications (use for error handling and optimistic updates)
- `Input` - Text input fields (deprecated for forms - use Field component, OK for inline table editing)
- `Separator` - Visual dividers
- `Sheet` - Side panels and modals
- `Tooltip` - Hover information
- `Skeleton` - Loading placeholders
- `Table` - Table components (TableHeader, TableBody, TableRow, TableCell, TableHead)

**Component Usage Rules:**
- All page components use `"use client"` directive (client-side interactivity required for charts and state)
- **ALWAYS** use existing shadcn/ui components before creating custom ones
- **ALWAYS** use `Field` component from [src/components/ui/field.tsx](src/components/ui/field.tsx) for all form inputs (text, number, date, select)
- **NEVER** use `<input type="text">`, `<input type="number">`, `<input type="date">`, or `<select>` directly in forms
- **NEVER** use `<Input type="date">` or `<Input type="number">` - always use the `Field` component for forms
- Number inputs use text input with validation (no spinner arrows) - controlled via Field component
- For inline table editing, use `<Input>` component (exception to the rule above)
- Follow the ui/ folder pattern for all UI components
- Use `class-variance-authority` for component variants
- Dashboard metrics use gradient backgrounds with Tailwind classes
- Charts configured with ChartJS registration in page component

### Management Table Pattern (Inline Editing)

All "Management" pages (Product Management, etc.) should use this standardized inline editing table pattern with optimistic updates.

**Key Features:**
- Inline row for adding new entries
- Click any cell to edit in place
- Auto-generated IDs/SKUs
- Optimistic updates with error rollback
- Status toggle with visual feedback

**Implementation Pattern:**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManagementPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newItem, setNewItem] = useState({ /* fields */ });

  // Auto-generate ID/SKU
  const generateNextId = () => {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const prefix = `PREFIX${currentYear}-`;
    const currentYearItems = items.filter(i => i.id.startsWith(prefix));
    const maxNumber = currentYearItems.length > 0 
      ? Math.max(...currentYearItems.map(i => parseInt(i.id.split('-')[1] || '0', 10)))
      : 0;
    return `${prefix}${(maxNumber + 1).toString().padStart(5, '0')}`;
  };

  // Handle cell click to start editing
  const handleCellClick = (itemId: string, field: string, currentValue: string) => {
    setEditingCell({ itemId, field });
    setEditValue(currentValue);
  };

  // Save edit with optimistic update
  const saveEdit = async (itemId: string, field: string, oldValue: string) => {
    if (editValue === oldValue) {
      setEditingCell(null);
      return;
    }

    // Optimistic update
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: editValue } : i));
    setEditingCell(null);

    try {
      const response = await fetch("/api/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, [field]: editValue }),
      });
      if (!response.ok) throw new Error("Failed to update");
      toast.success("Updated successfully");
    } catch (error) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: oldValue } : i));
      toast.error("Failed to update");
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent, itemId: string, field: string, oldValue: string) => {
    if (e.key === 'Enter') saveEdit(itemId, field, oldValue);
    else if (e.key === 'Escape') { setEditingCell(null); setEditValue(""); }
  };

  // Toggle status with optimistic update
  const toggleStatus = async (itemId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, isActive: newStatus } : i));

    try {
      const response = await fetch("/api/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, isActive: newStatus }),
      });
      if (!response.ok) throw new Error("Failed");
      toast.success(`Item ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, isActive: currentStatus } : i));
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Management</h1>
          <p className="text-muted-foreground">Manage your items</p>
        </div>
        {!isAddingRow && (
          <Button onClick={() => { setNewItem({ id: generateNextId(), /* ... */ }); setIsAddingRow(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Add Row */}
            {isAddingRow && (
              <TableRow className="bg-muted/50">
                <TableCell>
                  <Input value={newItem.id} disabled className="h-8 bg-muted/30" />
                </TableCell>
                <TableCell>
                  <Input 
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    disabled={isSubmitting}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Data Rows */}
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell onClick={() => handleCellClick(item.id, 'name', item.name)} className="cursor-pointer hover:bg-muted/50">
                  {editingCell?.itemId === item.id && editingCell?.field === 'name' ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(item.id, 'name', item.name)}
                      onKeyDown={(e) => handleKeyPress(e, item.id, 'name', item.name)}
                      className="h-8"
                      autoFocus
                    />
                  ) : item.name}
                </TableCell>
                <TableCell>
                  <button onClick={() => toggleStatus(item.id, item.isActive)} className={/* status badge classes */}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

**Pattern Rules:**
- Use `<Input>` for inline table editing (exception to Field component rule)
- Auto-generate IDs/SKUs with year prefix
- Implement optimistic updates for all mutations
- Revert changes on error with toast notification
- Use `bg-muted/50` for add row background
- Use `hover:bg-muted/50` for editable cells
- Always include loading states and disabled states during submission

## Styling Approach

- Tailwind CSS v4 with utility-first approach
- Custom CSS variables for theming in [globals.css](src/app/globals.css)
- Component variants via `class-variance-authority`
- Poppins font family with weights: 400, 500, 600, 700
- **IMPORTANT**: Follow the comprehensive styling conventions in [STYLING-GUIDE.md](STYLING-GUIDE.md)
  - Button variants: primary, secondary, ghost, destructive, outline
  - Always use shadcn/ui DatePicker for date inputs (never `<Input type="date">`)
  - Consistent component patterns for forms, tables, tabs, and cards
  - Standard spacing, typography, and color conventions
  - Use Sonner toasts for notifications and error handling

## State Management

- Currently using React useState for local component state
- No global state management library yet

## Development Guidelines

### Code Organization

- **Component Reuse**: Always utilize existing components before creating new ones
- **File Length**: Keep files under 2000 lines. Extract components when:
  - Files exceed this threshold
  - Code blocks are reused across multiple files
  - Always ask before extracting components

### Change Implementation

- Only implement changes explicitly mentioned by the user
- **Small changes/bug fixes**: Implement automatically
- **Big changes**: Ask first before proceeding
- **IMPORTANT**: When adding frontend features that require backend support, update [BACKEND.md](BACKEND.md) with the necessary API endpoints, database schema changes, and business logic requirements

### Performance Priorities

- Optimize for lower loading times and render times
- Implement data pre-fetching on hover when appropriate
- Use optimistic updates for better perceived performance
- Implement seamless updates on cached data

### UI/UX Patterns

- **Loading States**:
  - Minimize page-level loading states (prefer seamless transitions)
  - Button loading states are acceptable (submissions, saving, deleting)
- **Error Handling**: Use toasts, especially when reverting optimistic updates
- **Design**: Desktop-first but responsive
- **Accessibility**: Maintain good contrast scores
- **Consistency**: Keep visuals uniform by using components
