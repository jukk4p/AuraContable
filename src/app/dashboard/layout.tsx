"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
    FileText, LayoutDashboard, Settings, Users, PanelLeft, 
    Search, Plus, Receipt, BarChart3, Bell, 
    User, HelpCircle, LogOut, Sun, Moon,
    Globe, CreditCard, ShieldCheck
} from "lucide-react"
import { 
    SidebarProvider, Sidebar, SidebarHeader, 
    SidebarContent, SidebarMenu, SidebarMenuItem, 
    SidebarMenuButton, SidebarInset, SidebarTrigger, 
    useSidebar 
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, 
    DropdownMenuGroup 
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import React, { useEffect, useState } from "react"
import { useLocale } from "@/lib/i18n/locale-provider"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { PageWrapper } from "@/components/page-wrapper"
import { signOut, useSession } from "next-auth/react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useTheme } from "next-themes"

function CustomSidebarTrigger() {
    const { toggleSidebar } = useSidebar();
    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all rounded-xl active:scale-95"
            onClick={() => toggleSidebar()}
        >
            <PanelLeft className="h-5 w-5 stroke-[2.5]" />
        </Button>
    )
}

function NotificationsBell() {
    const [unreadCount] = useState(0); // Mock count for SaaS Pro

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary active:scale-95">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2.5 right-2.5 flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[380px] p-0 overflow-hidden glass rounded-3xl shadow-2xl border-white/10 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-border/50 bg-muted/20">
                    <div className="flex justify-between items-center">
                        <DropdownMenuLabel className="p-0 text-xl font-black font-headline tracking-tighter">Notificaciones</DropdownMenuLabel>
                        {unreadCount > 0 && <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">{unreadCount} Nuevas</span>}
                    </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto p-2">
                     <div className="p-6 text-center text-muted-foreground italic flex flex-col items-center gap-3">
                        <p className="text-sm font-bold flex flex-col gap-1">
                            <span>¡Todo al día!</span>
                            <span className="text-[10px] uppercase font-black tracking-widest opacity-50">Implementando notificaciones reales...</span>
                        </p>
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function DashboardHeaderContent({children}: {children: React.ReactNode}) {
  const pathname = usePathname()
  const { t } = useLocale();
  const { state } = useSidebar();
  const { data: session } = useSession();
  const user = session?.user;
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Panel", exact: true },
    { href: "/dashboard/invoices", icon: FileText, label: "Facturas" },
    { href: "/dashboard/clients", icon: Users, label: "Clientes" },
    { href: "/dashboard/expenses", icon: Receipt, label: "Gastos" },
    { href: "/dashboard/reports", icon: BarChart3, label: "Informes" },
    { href: "/dashboard/settings", icon: Settings, label: "Ajustes" },
  ]
  
  const getPageTitle = () => {
    const current = navItems.find(item => item.exact ? pathname === item.href : pathname.startsWith(item.href));
    return current ? current.label : "AuraContable";
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r-0 bg-slate-950 text-slate-400 group-data-[collapsible=icon]:w-16 transition-all duration-300">
        <SidebarHeader className="h-20 flex items-center justify-center border-b border-white/5">
            <Link href="/dashboard" className="flex items-center gap-3 group/logo">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/30 group-hover/logo:scale-110 transition-transform duration-500">
                    <div className="text-lg font-black tracking-tighter">A</div>
                </div>
                <span className={cn("text-xl font-black font-headline tracking-tighter text-foreground transition-all duration-300", state === 'collapsed' && "opacity-0 invisible w-0")}>
                    Aura<span className="text-primary group-hover/logo:text-primary/70 transition-colors italic">Contable</span>
                </span>
            </Link>
        </SidebarHeader>

        <SidebarContent className="px-3 py-6">
          <SidebarMenu className="gap-2">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton 
                    isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)} 
                    tooltip={item.label}
                    className={cn(
                        "h-12 px-4 rounded-xl font-bold tracking-tight transition-all duration-300 relative group/btn",
                        state === 'collapsed' ? "justify-center" : "gap-4",
                        (item.exact ? pathname === item.href : pathname.startsWith(item.href)) 
                            ? "bg-primary/10 text-primary relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-6 before:bg-primary before:rounded-r-full font-black shadow-sm ring-1 ring-primary/5" 
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", (item.exact ? pathname === item.href : pathname.startsWith(item.href)) ? "stroke-[2.5]" : "stroke-[2]")} />
                    <span className={cn("transition-all duration-300", state === 'collapsed' && "opacity-0 invisible w-0 overflow-hidden")}>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <div className="mt-auto p-4 border-t border-white/5 space-y-2">
            <Button 
                variant="ghost" 
                size="sm" 
                className={cn("w-full h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5", state === 'collapsed' ? "justify-center px-0" : "justify-start px-4 gap-4")}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className={cn(state === 'collapsed' && "hidden")}>
                    {theme === 'dark' ? t('settings.appearance.light') : t('settings.appearance.dark')}
                </span>
            </Button>
        </div>
      </Sidebar>

      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-40 flex items-center justify-between h-20 px-8 border-b bg-background/80 backdrop-blur-xl transition-all">
          <div className="flex items-center gap-6">
            <CustomSidebarTrigger />
            <div className="h-6 w-px bg-border hidden md:block" />
            <h1 className="text-2xl font-black font-headline tracking-tighter text-foreground">{getPageTitle()}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative hidden lg:flex items-center group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Buscar facturas, clientes..." 
                className="w-80 h-11 pl-11 rounded-2xl bg-muted/30 border-none group-focus-within:ring-2 ring-primary/20 transition-all font-medium" 
              />
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 uppercase">
                ⌘ K
              </kbd>
            </div>
            
            <div className="flex items-center gap-1 ml-4 pr-4 border-r mr-2">
                <NotificationsBell />
                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground rounded-full hover:bg-primary/5 hover:text-primary transition-colors">
                    <HelpCircle className="h-5 w-5" />
                </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-12 px-2 rounded-2xl gap-3 hover:bg-primary/5 hover:text-primary transition-all">
                  <Avatar className="h-9 w-9 border-2 border-primary/20 p-0.5">
                    <AvatarImage src={user?.image || undefined} alt="User" />
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">
                        {user?.name?.substring(0,2).toUpperCase() || "AC"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start gap-0">
                    <span className="text-sm font-black leading-none">{user?.name?.split(' ')[0] || "Usuario"}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">Plan Pro</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 glass rounded-3xl p-2 border-white/10 shadow-2xl animate-in fade-in zoom-in-95">
                <DropdownMenuLabel className="p-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-black tracking-tight">{user?.name || "Administrador Aura"}</span>
                        <span className="text-xs text-muted-foreground font-medium truncate">{user?.email || "admin@auracontable.es"}</span>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50 mx-2" />
                <DropdownMenuGroup className="p-1">
                    <DropdownMenuItem className="rounded-2xl p-3 gap-3 font-bold focus:bg-primary/5 focus:text-primary transition-all cursor-pointer">
                        <User className="h-4 w-4" /> Perfil de Usuario
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-2xl p-3 gap-3 font-bold focus:bg-primary/5 focus:text-primary transition-all cursor-pointer">
                        <Globe className="h-4 w-4" /> Preferencias Regionales
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-2xl p-3 gap-3 font-bold focus:bg-primary/5 focus:text-primary transition-all cursor-pointer">
                        <ShieldCheck className="h-4 w-4" /> Seguridad y Acceso
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border/50 mx-2" />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="rounded-2xl p-3 gap-3 font-bold text-destructive focus:bg-destructive/5 focus:text-destructive transition-all cursor-pointer mb-1">
                    <LogOut className="h-4 w-4" /> Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-8 lg:p-12 overflow-auto overflow-x-hidden selection:bg-primary/10 scrollbar-hide">
          <AnimatePresence mode="wait">
            <PageWrapper key={pathname}>
              {children}
            </PageWrapper>
          </AnimatePresence>
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
      <DashboardHeaderContent>
        {children}
      </DashboardHeaderContent>
    </SidebarProvider>
  )
}
