"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
    FileText, LayoutDashboard, Settings, Users, PanelLeft, 
    Search, Plus, Receipt, BarChart3, Bell, 
    User, HelpCircle, LogOut, Sun, Moon,
    Globe, CreditCard, ShieldCheck, Folder, FileSignature
} from "lucide-react"
import { 
    SidebarProvider, Sidebar, SidebarHeader, 
    SidebarContent, SidebarMenu, SidebarMenuItem, 
    SidebarMenuButton, SidebarInset, SidebarTrigger, 
    useSidebar, SidebarGroup, SidebarGroupLabel, SidebarGroupContent
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, 
    DropdownMenuGroup 
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import React, { useCallback, useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useLocale } from "@/lib/i18n/locale-provider"
import { cn } from "@/lib/utils"
import { AnimatePresence } from "framer-motion"
import { PageWrapper } from "@/components/page-wrapper"
import { signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { getNotifications, markNotificationAsRead } from "@/actions/notifications"

function CustomSidebarTrigger() {
    const { toggleSidebar } = useSidebar();
    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-all rounded-md"
            onClick={() => toggleSidebar()}
        >
            <PanelLeft className="h-4 w-4" />
        </Button>
    )
}

type NotificationRow = Awaited<ReturnType<typeof getNotifications>>[number];

/**
 * Campana conectada a la tabla `notifications`.
 *
 * Mostraba cuatro avisos inventados en el propio componente (facturas y
 * clientes que no existen) mientras las acciones reales no las llamaba nadie.
 */
function NotificationsBell() {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;

    const [notifications, setNotifications] = useState<NotificationRow[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!userId) {
            if (status !== 'loading') setLoading(false);
            return;
        }
        try {
            setNotifications(await getNotifications());
        } catch (error) {
            console.error("Error cargando las notificaciones:", error);
        } finally {
            setLoading(false);
        }
    }, [userId, status]);

    useEffect(() => { load(); }, [load]);

    const unread = notifications.filter(n => !n.isRead);

    const handleMarkAllRead = async () => {
        // Optimista: la campana no debe parpadear esperando al servidor.
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        await Promise.all(unread.map(n => markNotificationAsRead(n.id)));
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-all rounded-md">
                    <Bell className="h-4 w-4" />
                    {unread.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-danger" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[380px] p-0 rounded-lg shadow-lg border-border/50">
                <div className="p-4 border-b border-border/50 bg-muted/20">
                    <div className="flex justify-between items-center">
                        <DropdownMenuLabel className="p-0 text-sm font-medium">Notificaciones</DropdownMenuLabel>
                        {unread.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="h-auto p-0 text-xs text-primary font-medium hover:bg-transparent"
                            >
                                Marcar leídas
                            </Button>
                        )}
                    </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <p className="p-4 text-xs text-muted-foreground">Cargando...</p>
                    ) : notifications.length === 0 ? (
                        <p className="p-4 text-xs text-muted-foreground">No tienes notificaciones.</p>
                    ) : (
                        notifications.map(notif => (
                            <Link
                                key={notif.id}
                                href={notif.href}
                                onClick={() => { if (!notif.isRead) markNotificationAsRead(notif.id); }}
                                className={cn(
                                    "block p-4 border-b border-border/50 hover:bg-muted/30 transition-colors",
                                    !notif.isRead && "bg-primary/5"
                                )}
                            >
                                <div className="flex gap-3">
                                    <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", notif.isRead ? "bg-muted-foreground/30" : "bg-primary")} />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{notif.title}</p>
                                        <p className="text-xs text-muted-foreground leading-snug">{notif.body}</p>
                                        <p className="text-[10px] text-muted-foreground opacity-70">
                                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: es })}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
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

  const navGroups = [
      {
          label: "Principal",
          items: [
              { href: "/dashboard", icon: LayoutDashboard, label: "Panel", exact: true },
              { href: "/dashboard/invoices", icon: FileText, label: "Facturas" },
              // Presupuestos está fuera del menú hasta que exista de verdad: la
              // pantalla es solo interfaz, no hay tabla ni acciones detrás.
              { href: "/dashboard/clients", icon: Users, label: "Clientes" },
              { href: "/dashboard/expenses", icon: Receipt, label: "Gastos" },
              { href: "/dashboard/documents", icon: Folder, label: "Documentos" },
          ]
      },
      {
          label: "Análisis",
          items: [
              { href: "/dashboard/reports", icon: BarChart3, label: "Informes" },
          ]
      },
      {
          label: "Configuración",
          items: [
              { href: "/dashboard/settings", icon: Settings, label: "Ajustes" },
          ]
      }
  ]
  
  const [mounted, setMounted] = React.useState(false);
  const [searchPlaceholder, setSearchPlaceholder] = React.useState("Buscar (⌘K)...");

  React.useEffect(() => {
    setMounted(true);
    const isMac = typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac');
    setSearchPlaceholder(isMac ? "Buscar (⌘K)..." : "Buscar (Ctrl+K)...");
  }, []);

  const getPageTitle = () => {
    for (const group of navGroups) {
        const current = group.items.find(item => item.exact ? pathname === item.href : pathname.startsWith(item.href));
        if (current) return current.label;
    }
    return "AuraContable";
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border bg-card w-[180px] transition-all duration-300">
        <SidebarHeader className="h-[44px] px-3 border-b border-border flex items-center justify-between flex-row">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">A</span>
            </div>
            {state !== "collapsed" && (
                <span className="text-sm font-semibold tracking-tight text-foreground">AuraContable</span>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-3">
          {navGroups.map((group, groupIdx) => (
            <SidebarGroup key={groupIdx} className="px-0 py-1">
              {state !== "collapsed" && (
                <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1.5 tracking-wider">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item, idx) => {
                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={idx}>
                        <SidebarMenuButton asChild tooltip={item.label} className={cn(
                          "w-full text-xs font-medium h-8 px-2 rounded-md transition-colors",
                          isActive 
                            ? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" 
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}>
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4 shrink-0" />
                            {state !== "collapsed" && <span>{item.label}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <div className="mt-auto p-2 border-t border-border flex flex-col gap-1">
            <Button variant="ghost" className="w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8 px-2 rounded-md" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {mounted && theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {state !== "collapsed" && (
                    <span>Cambiar Tema</span>
                )}
            </Button>
            
            <Button variant="ghost" className="w-full justify-start text-xs text-danger hover:text-danger hover:bg-danger/10 h-8 px-2 rounded-md" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                {state !== "collapsed" && (
                    <span>Cerrar Sesión</span>
                )}
            </Button>
        </div>
      </Sidebar>

      <SidebarInset className="bg-background flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="sticky top-0 z-40 flex items-center justify-between h-[44px] px-5 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <CustomSidebarTrigger />
            <div className="h-4 w-px bg-border hidden md:block" />
            <h1 className="text-sm font-medium text-foreground">{getPageTitle()}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative hidden md:flex items-center">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={searchPlaceholder} 
                className="w-64 h-8 pl-9 rounded-md bg-muted/50 border-transparent focus-visible:border-border focus-visible:ring-0 text-sm transition-all" 
              />
            </div>
            
            <div className="flex items-center gap-1 mx-2">
                <NotificationsBell />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-md hover:bg-muted hover:text-foreground transition-colors hidden sm:flex">
                    <HelpCircle className="h-4 w-4" />
                </Button>
            </div>

            <Button size="sm" className="h-8 text-xs px-3 bg-primary text-primary-foreground hover:bg-primary/90 hidden sm:flex font-medium">
                <Plus className="h-3 w-3 mr-1" /> Nuevo
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 ml-2 rounded-full hover:ring-2 hover:ring-border transition-all">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image || undefined} alt="User" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user?.name?.substring(0,2).toUpperCase() || "AC"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-lg p-1 border-border/50">
                <DropdownMenuLabel className="p-3">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{user?.name || "Administrador"}</span>
                        <span className="text-xs text-muted-foreground truncate">{user?.email || "admin@auracontable.es"}</span>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50 mx-1" />
                <DropdownMenuGroup className="p-1">
                    <DropdownMenuItem className="rounded-md p-2 gap-2 text-sm cursor-pointer">
                        <User className="h-4 w-4" /> Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-md p-2 gap-2 text-sm cursor-pointer">
                        <Settings className="h-4 w-4" /> Ajustes
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border/50 mx-1" />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="rounded-md p-2 gap-2 text-sm text-danger focus:bg-danger/10 focus:text-danger cursor-pointer">
                    <LogOut className="h-4 w-4" /> Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-[20px] overflow-y-auto overflow-x-hidden bg-background">
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
