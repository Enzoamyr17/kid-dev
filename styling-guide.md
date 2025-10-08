# Styling Guide

This document outlines the styling conventions and component usage patterns for the Kingland Information System (KIS).

## General Principles

1. **Use shadcn/ui components** - Always prefer shadcn/ui components over custom implementations
2. **Consistency** - Maintain uniform styling across all pages and components
3. **Desktop-first responsive** - Design for desktop but ensure mobile responsiveness
4. **Accessibility** - Maintain good contrast scores and keyboard navigation

## Component Usage

### Forms

#### Field Component (Unified Input)
- **ALWAYS use** `<Field>` from `@/components/ui/field` for ALL inputs
- **NEVER use** raw `<input>`, `<select>`, or `<Input>` components directly
- Supports: text, number (with validation), date, and select types
- Number inputs use text-based validation (no spinner arrows)
- Includes built-in label and error message support

```tsx
import { Field } from "@/components/ui/field"

// Text input
<Field
  type="text"
  label={<>Field Name <span className="text-red-500">*</span></>}
  placeholder="Enter field name"
  value={value}
  onChange={setValue}
/>

// Number input (text-based with validation)
<Field
  type="number"
  label="Price"
  placeholder="0.00"
  value={price}
  onChange={setPrice}
  decimals={2}
  min={0}
/>

// Date picker
<Field
  type="date"
  label={<>Date Required <span className="text-red-500">*</span></>}
  placeholder="Select date"
  value={date}
  onChange={setDate}
/>

// Select dropdown
<Field
  type="select"
  label="Status"
  value={status}
  onChange={setStatus}
  options={[
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" }
  ]}
/>

// With error message
<Field
  type="text"
  label="Email"
  value={email}
  onChange={setEmail}
  error="Invalid email address"
/>
```

#### Number Input Validation
- Number fields use `type="text"` with numeric-only validation
- No spinner arrows (better UX)
- Supports `decimals` prop for automatic formatting
- Supports `min` and `max` constraints
- Mobile-friendly with `inputMode="decimal"`

#### Buttons
- Use `<Button>` from `@/components/ui/button`
- Primary actions: `variant="default"` (primary variant)
- Secondary actions: `variant="secondary"`
- Outlined actions: `variant="outline"`
- Ghost/subtle actions: `variant="ghost"`
- Destructive actions: `variant="destructive"`
- Icon buttons: include `size="icon"`

```tsx
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outlined Action</Button>
<Button variant="ghost">Ghost Action</Button>
<Button variant="destructive">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Settings className="h-4 w-4" /></Button>

// Loading State
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Please wait
</Button>
```

#### Dropdowns
- Use `<DropdownMenu>` from `@/components/ui/dropdown-menu`
- Always include trigger and content components

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onSelect={handleAction}>Action</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Tables

#### Standard Tables (Read-only)
- Use shadcn/ui `<Table>` components from `@/components/ui/table`
- Components: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableHead`
- Wrap in `rounded-md border` container

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Header</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Content</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

#### Management Tables (Inline Editing Pattern)
**Use this pattern for ALL Management pages** (Product Management, User Management, etc.)

**Key Features:**
- Inline add row at the top
- Click-to-edit cells with `<Input>` component
- Auto-generated IDs/SKUs (format: `PREFIX{YY}-{00001}`)
- Optimistic updates with automatic rollback on error
- Status toggle button
- Keyboard shortcuts (Enter to save, Escape to cancel)

**Required State:**
```tsx
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
const [isAddingRow, setIsAddingRow] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [editingCell, setEditingCell] = useState<{ itemId: string; field: string } | null>(null);
const [editValue, setEditValue] = useState("");
```

**Implementation:**
```tsx
// Auto-generate ID/SKU
const generateNextId = () => {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const prefix = `KMCI${currentYear}-`; // Change prefix per page
  const currentYearItems = items.filter(i => i.sku.startsWith(prefix));
  if (currentYearItems.length === 0) return `${prefix}00001`;
  const numbers = currentYearItems.map(i => parseInt(i.sku.split('-')[1] || '0', 10));
  const maxNumber = Math.max(...numbers);
  return `${prefix}${(maxNumber + 1).toString().padStart(5, '0')}`;
};

// Edit handlers
const handleCellClick = (itemId: string, field: string, currentValue: string) => {
  setEditingCell({ itemId, field });
  setEditValue(currentValue);
};

const saveEdit = async (itemId: string, field: string, oldValue: string) => {
  if (editValue === oldValue) {
    setEditingCell(null);
    return;
  }

  // Optimistic update
  setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: editValue } : i));
  setEditingCell(null);

  try {
    const response = await fetch("/api/endpoint", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, [field]: editValue }),
    });
    if (!response.ok) throw new Error("Failed to update");
    toast.success("Updated successfully");
  } catch (error) {
    // Revert on error
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: oldValue } : i));
    toast.error("Failed to update");
  }
};

const handleKeyPress = (e: React.KeyboardEvent, itemId: string, field: string, oldValue: string) => {
  if (e.key === 'Enter') saveEdit(itemId, field, oldValue);
  else if (e.key === 'Escape') { setEditingCell(null); setEditValue(""); }
};

// Table structure
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
            <Input placeholder="Auto-generated" value={newItem.id} disabled className="h-8 bg-muted/30" />
          </TableCell>
          <TableCell>
            <Input 
              placeholder="Name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              disabled={isSubmitting}
              className="h-8"
            />
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={handleSubmit} disabled={isSubmitting} className="h-8 w-8">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCancel} disabled={isSubmitting} className="h-8 w-8">
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )}

      {/* Data Rows with Inline Editing */}
      {items.map((item) => (
        <TableRow key={item.id}>
          <TableCell className="font-medium">{item.id}</TableCell>
          <TableCell
            onClick={() => handleCellClick(item.id, 'name', item.name)}
            className="cursor-pointer hover:bg-muted/50"
          >
            {editingCell?.itemId === item.id && editingCell?.field === 'name' ? (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => saveEdit(item.id, 'name', item.name)}
                onKeyDown={(e) => handleKeyPress(e, item.id, 'name', item.name)}
                className="h-8"
                autoFocus
              />
            ) : (
              item.name
            )}
          </TableCell>
          <TableCell>
            <button
              onClick={() => toggleStatus(item.id, item.isActive)}
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${
                item.isActive 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
              }`}
            >
              {item.isActive ? 'Active' : 'Inactive'}
            </button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

**Styling Rules:**
- Add row background: `bg-muted/50`
- Editable cells hover: `cursor-pointer hover:bg-muted/50`
- Disabled ID field: `bg-muted/30`
- Input height: `h-8`
- Action buttons: `h-8 w-8` with icon size `h-4 w-4`
- Check icon: `text-green-600`
- X icon: `text-red-600`

#### Table Totals Row
- Use `bg-muted/50` or `bg-muted/30` for total rows
- Right-align labels
- Bold totals

```tsx
<tr className="border-t bg-muted/50">
  <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-right">
    Grand Total:
  </td>
  <td className="px-4 py-3 text-sm font-bold">
    ₱{total.toFixed(2)}
  </td>
</tr>
```

### Tabs

- **ALWAYS** use `<Tabs>` from `@/components/ui/tabs`
- Use TabsList for the tab navigation
- Use TabsTrigger for each tab button
- Use TabsContent for each tab panel
- Set defaultValue to the initial tab

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="reports">Reports</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    Overview content
  </TabsContent>

  <TabsContent value="analytics">
    Analytics content
  </TabsContent>

  <TabsContent value="reports">
    Reports content
  </TabsContent>
</Tabs>
```

### Cards

- Use semantic divs with border and rounded corners
- Header: `bg-muted px-4 py-3`
- Content: appropriate padding based on content type

```tsx
<div className="border rounded-lg overflow-hidden">
  <div className="bg-muted px-4 py-3">
    <h3 className="font-semibold">Card Title</h3>
  </div>
  <div className="p-4">
    Card content
  </div>
</div>
```

### Status Badges

- Use span elements with background and text color
- Pending: `bg-yellow-100 text-yellow-800`
- Success: `bg-green-100 text-green-800`
- Error: `bg-red-100 text-red-800`
- Info: `bg-blue-100 text-blue-800`

```tsx
<span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
  Pending
</span>
```

### Sheets/Sidebars

#### Sidebar
- **ALWAYS** use `<Sidebar>` from `@/components/ui/sidebar` for main navigation
- Wrap in `<SidebarProvider>` at the root layout level
- Use collapsible sidebar with icon-only collapsed state
- Structure: SidebarHeader → SidebarContent (with SidebarGroup/SidebarMenu) → SidebarFooter

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      <h2 className="text-lg font-semibold">Dashboard</h2>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      Footer content
    </SidebarFooter>
  </Sidebar>

  <main>
    <SidebarTrigger />
    {children}
  </main>
</SidebarProvider>
```

#### Sheet (Slide-out Panels)
- Use `<Sheet>` from `@/components/ui/sheet` for slide-out panels
- Standard width: `w-full sm:max-w-lg`
- Use flex column layout: `flex flex-col`
- Structure: Header → Info Grid → Separator → Scrollable Content → Separator → Footer

```tsx
<Sheet open={isOpen} onOpenChange={onClose}>
  <SheetContent className="w-full sm:max-w-lg flex flex-col">
    <SheetHeader>
      <SheetTitle className="flex items-center justify-between">
        <span>Panel Title</span>
        <Badge variant="outline">ID</Badge>
      </SheetTitle>
    </SheetHeader>

    {/* Info Grid */}
    <div className="grid grid-cols-2 gap-4 py-4 text-sm">
      <div>
        <span className="text-muted-foreground">Label</span>
        <p className="font-medium">Value</p>
      </div>
    </div>

    <Separator className="my-4" />

    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-4 px-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4">
            <div className="w-20 h-20 bg-blue-500 rounded shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
              <Badge variant="outline" className="text-xs mb-2">
                {item.category}
              </Badge>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Qty: {item.quantity}</span>
                <p className="text-sm font-semibold">₱{item.total.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <Separator className="my-4" />

    <SheetFooter className="flex-col gap-4">
      <div className="flex items-center justify-between text-lg font-semibold">
        <span>Total:</span>
        <span>₱{total.toLocaleString()}</span>
      </div>
      <Button className="w-full" size="lg">Action</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

## Layout Patterns

### Form Layouts
- Use responsive grid: `grid grid-cols-1 md:grid-cols-2 gap-6`
- Group related fields
- Place action buttons at bottom right: `flex justify-end gap-4`

### Page Headers
- Title: `text-3xl font-semibold`
- Subtitle: `text-xl font-semibold`
- Include bottom margin: `mb-4`

### Spacing
- Section spacing: `space-y-6`
- Form field spacing: `space-y-2`
- Button groups: `gap-4`
- Grid gaps: `gap-6`

## Typography

### Font Sizes
- Page title: `text-3xl`
- Section title: `text-xl`
- Subsection: `text-lg`
- Body text: `text-sm`
- Small text: `text-xs`

### Font Weights
- Titles: `font-semibold`
- Labels: `font-medium`
- Body: `font-normal`
- Emphasis: `font-bold`

## Colors

Use Tailwind/shadcn theme colors:
- `background` - Page background
- `foreground` - Primary text
- `muted` - Secondary backgrounds
- `muted-foreground` - Secondary text
- `primary` - Primary actions and highlights
- `border` - Borders and dividers
- `accent` - Subtle highlights

## Notifications & Toasts

- **ALWAYS** use Sonner for toast notifications via `@/components/ui/sonner`
- Add `<Toaster />` to root layout
- Use for success, error, loading, and informational messages
- Especially important for reverting optimistic updates

```tsx
// In layout.tsx
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}

// Usage in components
import { toast } from "sonner"

toast.success("Changes saved successfully")
toast.error("Failed to save changes")
toast.loading("Saving changes...")

toast.promise(saveChanges(), {
  loading: "Saving...",
  success: "Saved successfully!",
  error: "Failed to save",
})
```

## Loading States

### Skeleton Loaders
- Use `<Skeleton>` from `@/components/ui/skeleton` for loading placeholders
- Minimize page-level loading states - prefer seamless transitions
- Use Skeleton for content that's loading

```tsx
import { Skeleton } from "@/components/ui/skeleton"

<div className="space-y-2">
  <Skeleton className="h-4 w-[250px]" />
  <Skeleton className="h-4 w-[200px]" />
  <Skeleton className="h-4 w-[150px]" />
</div>
```

### Tooltips
- Use `<Tooltip>` from `@/components/ui/tooltip` for additional context
- Especially important for icon-only buttons

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <Settings className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Settings</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Available shadcn/ui Components

All components are located in [src/components/ui](src/components/ui):

- **Button** - All button variants
- **Field** - Unified input component (text, number, date, select) - ALWAYS USE THIS
- **DatePicker** - Date selection (integrated into Field component)
- **Calendar** - Calendar component (used by Field/DatePicker)
- **Sidebar** - Main navigation sidebar
- **Popover** - Floating content
- **Dropdown Menu** - Context menus
- **Tabs** - Tabbed navigation
- **Sonner** - Toast notifications
- **Input** - Text inputs (deprecated - use Field instead)
- **Separator** - Visual dividers
- **Sheet** - Slide-out panels
- **Tooltip** - Hover information
- **Skeleton** - Loading placeholders

## Best Practices

1. **Always use Field component** - Use `<Field>` for ALL inputs (text, number, date, select)
2. **Never use raw inputs** - Don't use `<input>`, `<select>`, or `<Input>` directly
3. **Never use `<input type="number">`** - Use `<Field type="number">` with text-based validation instead
4. **Never hardcode dates as strings** - Always use Date objects with Field date type
5. **Always use shadcn/ui components** - Check available components before creating custom ones
6. **Always include loading states** - Use Button loading states or Skeleton components
7. **Use Sonner for notifications** - Especially when reverting optimistic updates
8. **Use semantic HTML** - Proper use of form, label, table elements
9. **Maintain keyboard navigation** - All interactive elements should be keyboard accessible
10. **Responsive tables** - Always wrap tables in overflow containers
11. **Consistent spacing** - Use Tailwind spacing utilities consistently
12. **Icon usage** - Import from `lucide-react`, size with `h-4 w-4` or `h-5 w-5`
13. **Use Tooltip for icon buttons** - Improve accessibility and UX

## Currency Formatting

Always format Philippine Peso with:
```tsx
₱{value.toFixed(2)}
```

## Date Formatting

Use native JavaScript or date-fns:
```tsx
// Display
{date ? new Date(date).toLocaleDateString() : "N/A"}

// With date-fns (in DatePicker)
{date ? format(date, "PPP") : <span>{placeholder}</span>}
```