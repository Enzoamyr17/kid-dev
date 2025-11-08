"use client";

import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarFooter, SidebarMenuSub } from "@/components/ui/sidebar";
import { ChartBar, LogOut, MoonIcon, SunIcon, Package, ArrowLeft, FolderKanban, DollarSign, Building2, FileText } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { logout } from "@/app/actions/auth";

const sidebarItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: ChartBar,
  }
];

const projectsItems = [
  {
    label: "All Projects",
    href: "/projects",
  },
  {
    label: "Project Encoding",
    href: "/project-encoding",
  },
  {
    label: "Workflow Templates",
    href: "/workflow-templates",
  }
];

const financeItems = [
  {
    label: "Expense Management",
    href: "/expense-management",
  },
  {
    label: "Transactions",
    href: "/transactions",
  }
];

const inventoryItems = [
  {
    label: "Products",
    href: "/products",
  },
  {
    label: "Suppliers",
    href: "/suppliers",
  }
];

const organizationItems = [
  {
    label: "Companies",
    href: "/companies",
  },
  {
    label: "Users",
    href: "/users",
  }
];

const auditItem = {
  label: "Audit Logs",
  href: "/dashboard/audit-logs",
  icon: FileText,
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const router = useRouter();
  const pathname = usePathname();
  const [title, setTitle] = useState<string>("");
  
  useEffect(() => {
    const getTitle = async () => {
    if (pathname.includes('/projects/')) {
      const response = await fetch(`/api/projects/${pathname.split('/').pop()}`);
      const data = await response.json();
      setTitle(await data.code);
    }else{
      setTitle(pathname.split('/').pop() || "");
    }
  }
  getTitle();
  }, [pathname]);

  return (
    <SidebarProvider className="">
      <Sidebar variant="inset">
        <SidebarHeader className="flex items-center justify-center h-16">
          <h2 className="text-5xl font-bold">Kingland</h2>
        </SidebarHeader>
        <SidebarContent className="flex flex-col justify-between h-full pt-2 pb-6">
          <SidebarGroup>
            {/* Dashboard */}
            {sidebarItems.map((item) => (
              <SidebarMenuItem key={item.label} onClick={() => router.push(item.href)}>
                <SidebarMenuButton>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {/* Projects Section */}
            <SidebarMenuButton className="hover:bg-transparent">
              <FolderKanban className="mr-2 h-4 w-4" /> Projects
            </SidebarMenuButton>
            <SidebarMenuSub>
              {projectsItems.map((item) => (
                <SidebarMenuItem onClick={() => router.push('/dashboard' + item.href)} key={item.label}>
                  <SidebarMenuButton>
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenuSub>

            {/* Finance Section */}
            <SidebarMenuButton className="hover:bg-transparent">
              <DollarSign className="mr-2 h-4 w-4" /> Finance
            </SidebarMenuButton>
            <SidebarMenuSub>
              {financeItems.map((item) => (
                <SidebarMenuItem onClick={() => router.push('/dashboard' + item.href)} key={item.label}>
                  <SidebarMenuButton>
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenuSub>

            {/* Inventory Section */}
            <SidebarMenuButton className="hover:bg-transparent">
              <Package className="mr-2 h-4 w-4" /> Inventory
            </SidebarMenuButton>
            <SidebarMenuSub>
              {inventoryItems.map((item) => (
                <SidebarMenuItem onClick={() => router.push('/dashboard' + item.href)} key={item.label}>
                  <SidebarMenuButton>
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenuSub>

            {/* Organization Section */}
            <SidebarMenuButton className="hover:bg-transparent">
              <Building2 className="mr-2 h-4 w-4" /> Organization
            </SidebarMenuButton>
            <SidebarMenuSub>
              {organizationItems.map((item) => (
                <SidebarMenuItem onClick={() => router.push('/dashboard' + item.href)} key={item.label}>
                  <SidebarMenuButton>
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenuSub>

            {/* Audit Logs */}
            <SidebarMenuItem onClick={() => router.push(auditItem.href)}>
              <SidebarMenuButton>
                <auditItem.icon className="mr-2 h-4 w-4" />
                <span>{auditItem.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarGroup>

          <SidebarFooter>
              <SidebarMenuButton onClick={() => logout()}>
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
            <div className="flex items-center font-semibold text-2xl tracking-wide capitalize">{title || "No Data Available"}</div>
          </div>
          <div className="flex justify-evenly items-center gap-2">
            <Button onClick={() => {
              document.documentElement.classList.toggle("dark");
            }} variant="ghost" size="icon">
              <MoonIcon className="dark:hidden"/>
              <SunIcon className="hidden dark:block"/>
            </Button>
            {pathname !== "/dashboard" && (
              <Button onClick={() => router.push(pathname.split('/').slice(0, -1).join('/'))} variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
