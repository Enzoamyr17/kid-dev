import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarFooter, SidebarMenuAction } from "@/components/ui/sidebar";
import { ChartBar, LogOut } from "lucide-react";

const sidebarItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: ChartBar,
  },
];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader className="flex items-center justify-center h-16">
          <h2 className="text-5xl font-bold">Kingland</h2>
        </SidebarHeader>
        <SidebarContent className="flex flex-col justify-between h-full pt-2 pb-6">
          <SidebarGroup>
            {sidebarItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarGroup>
          <SidebarFooter>
              <SidebarMenuButton>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
          </SidebarFooter>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
