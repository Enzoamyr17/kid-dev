"use client";

import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarFooter, SidebarMenuSub } from "@/components/ui/sidebar";
import { ChartBar, FileText, LogOut, MoonIcon, SunIcon, Package } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const sidebarItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: ChartBar,
  }
];

const purchasingItems = [
  {
    label: "Quotations",
    href: "/quotations",
  },
  {
    label: "Purchase Requests",
    href: "/purchase-requests",
  },
  {
    label: "Purchase Orders",
    href: "/purchase-orders",
  }
];

const managementItems = [
  {
    label: "Product Management",
    href: "/products",
  }
];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const router = useRouter();
  const title = usePathname().split('/').pop();

  return (
    <SidebarProvider className="">
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
            <SidebarMenuButton className="hover:bg-transparent">
              <FileText className="mr-2 h-4 w-4" /> Purchasing
            </SidebarMenuButton>
            <SidebarMenuSub>
              {purchasingItems.map((item) => (
                <SidebarMenuItem onClick={() => router.push('/dashboard' + item.href)} key={item.label}>
                  <SidebarMenuButton>
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenuSub>
            <SidebarMenuButton className="hover:bg-transparent">
              <Package className="mr-2 h-4 w-4" /> Management
            </SidebarMenuButton>
            <SidebarMenuSub>
              {managementItems.map((item) => (
                <SidebarMenuItem onClick={() => router.push('/dashboard' + item.href)} key={item.label}>
                  <SidebarMenuButton>
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenuSub>
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
        <header className="sticky top-0 bg-background flex h-16 shrink-0 items-center justify-between border-b px-4 z-40">
          <div className="flex justify-evenly items-center gap-2">
            <SidebarTrigger />
            <div className="flex items-center font-semibold text-2xl tracking-wide capitalize">{title || "Kingland"}</div>
          </div>
          <div className="flex justify-evenly items-center gap-2">
            <Button onClick={() => {
              document.documentElement.classList.toggle("dark");
            }} variant="ghost" size="icon">
              <MoonIcon className="dark:hidden"/>
              <SunIcon className="hidden dark:block"/>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
