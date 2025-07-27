"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, LayoutGrid, Settings, Users, PanelLeft, Search, PlusCircle, Receipt } from "lucide-react"
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import React from "react"
import { useLocale } from "@/lib/i18n/locale-provider"
import { cn } from "@/lib/utils"

function CustomSidebarTrigger() {
    const { toggleSidebar } = useSidebar();
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleSidebar()}
            className="hidden md:flex"
        >
            <PanelLeft />
        </Button>
    )
}

function DashboardHeader({children}: {children: React.ReactNode}) {
  const pathname = usePathname()
  const { t } = useLocale();
  const { state } = useSidebar();

  const navItems = [
    { href: "/dashboard", icon: LayoutGrid, label: t('nav.dashboard') },
    { href: "/dashboard/invoices", icon: FileText, label: t('nav.invoices') },
    { href: "/dashboard/clients", icon: Users, label: t('nav.clients') },
    { href: "/dashboard/expenses", icon: Receipt, label: t('nav.expenses') },
    { href: "/dashboard/settings", icon: Settings, label: t('nav.settings') },
  ]
  
  const getPageTitle = () => {
    switch (pathname) {
      case '/dashboard':
        return t('nav.dashboard');
      case '/dashboard/invoices':
        return t('nav.invoices');
      case '/dashboard/invoices/new':
        return t('nav.newInvoice');
      case '/dashboard/clients':
        return t('nav.clients');
      case '/dashboard/expenses':
        return t('nav.expenses');
      case '/dashboard/settings':
        return t('nav.settings');
      default:
        if (pathname.startsWith('/dashboard/invoices/')) return t('nav.invoiceDetails');
        return 'InvoiceFlow';
    }
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-4 flex items-center justify-between">
          <Link href="/dashboard" className={cn("flex items-center gap-2", state === 'collapsed' && "invisible")}>
            <FileText className="w-8 h-8 text-primary" />
            <span className="text-xl font-semibold font-headline">InvoiceFlow</span>
          </Link>
          <CustomSidebarTrigger />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className={cn("text-2xl font-semibold font-headline", state === 'collapsed' && "hidden")}>{getPageTitle()}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('common.search') + "..."} className="pl-9" />
            </div>
            <Link href="/dashboard/invoices/new">
                <Button>
                    <PlusCircle className="w-4 h-4 mr-2"/>
                    {t('common.createInvoice')}
                </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative w-10 h-10 rounded-full">
                  <Avatar>
                    <AvatarImage src="https://placehold.co/40x40" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('nav.myAccount')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/dashboard/settings">{t('nav.settings')}</Link></DropdownMenuItem>
                <DropdownMenuItem>{t('nav.support')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/">{t('nav.signOut')}</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
            {children}
        </main>
      </SidebarInset>
    </>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardHeader>
        {children}
      </DashboardHeader>
    </SidebarProvider>
  )
}
