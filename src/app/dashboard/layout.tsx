
"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FileText, LayoutGrid, Settings, Users, PanelLeft, Search, PlusCircle, Receipt, AreaChart, Bell, Circle, AlertCircle } from "lucide-react"
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import React, { useEffect, useState } from "react"
import { useLocale } from "@/lib/i18n/locale-provider"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/firebase/config"
import { signOut } from "firebase/auth"
import { useAuthState } from "react-firebase-hooks/auth"
import { AppNotification, CompanyProfile } from "@/lib/types"
import { getNotifications, markNotificationAsRead, getCompanyProfile } from "@/lib/firebase/firestore"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useTheme } from "next-themes"

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

function NotificationsBell() {
    const [user] = useAuthState(auth);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setError(null);
            const unsubscribe = getNotifications(user.uid, (data) => {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.isRead).length);
            }, (err) => {
                 console.error("Error fetching notifications:", err);
                if (err.code === 'failed-precondition') {
                    setError("Las notificaciones no están listas, inténtalo de nuevo en unos minutos.");
                } else if (err.code === 'permission-denied') {
                     setError("No se pudieron cargar las notificaciones por falta de permisos.");
                }
                else {
                    setError("No se pudieron cargar las notificaciones.");
                }
            });

            return () => unsubscribe();
        }
    }, [user]);

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
        // The real-time listener will update the state automatically.
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup className="max-h-96 overflow-y-auto">
                    {error && (
                        <DropdownMenuItem disabled className="flex items-center gap-2 text-destructive">
                           <AlertCircle className="h-4 w-4" />
                           <span className="flex-1">{error}</span>
                        </DropdownMenuItem>
                    )}
                    {!error && notifications.length === 0 && (
                        <DropdownMenuItem disabled>No tienes notificaciones</DropdownMenuItem>
                    )}
                    {!error && notifications.map(notif => (
                         <DropdownMenuItem key={notif.id} className="flex items-start gap-2" onSelect={(e) => e.preventDefault()}>
                            {!notif.isRead && <Circle className="h-2 w-2 mt-1.5 fill-primary text-primary" />}
                            <div className={cn("flex-1 space-y-1", notif.isRead && "pl-4")}>
                               <Link href={notif.href} className="hover:underline">
                                 <p className="font-semibold">{notif.title}</p>
                                 <p className="text-sm text-muted-foreground">{notif.body}</p>
                                 <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(notif.createdAt, { addSuffix: true, locale: es })}
                                </p>
                               </Link>
                                {!notif.isRead && (
                                     <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => handleMarkAsRead(notif.id)}>Marcar como leída</Button>
                                )}
                            </div>
                         </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem className="justify-center">
                    Ver todas las notificaciones
                 </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function DashboardHeaderContent({children}: {children: React.ReactNode}) {
  const pathname = usePathname()
  const router = useRouter();
  const { t } = useLocale();
  const { state } = useSidebar();
  const [user, loading, error] = useAuthState(auth);
  const { setTheme } = useTheme();
  const [initials, setInitials] = useState("...");

  useEffect(() => {
    async function fetchAndSetTheme() {
        if (user) {
            const profile = await getCompanyProfile(user.uid);
            if (profile && profile.theme) {
                setTheme(profile.theme);
            }
        }
    }
    fetchAndSetTheme();
  }, [user, setTheme]);

  useEffect(() => {
      if (loading) {
          setInitials("...");
      } else if (user) {
          if (user.displayName) {
              const names = user.displayName.split(' ');
              if (names.length > 1) {
                  setInitials(`${names[0][0]}${names[names.length - 1][0]}`.toUpperCase());
              } else {
                  setInitials(user.displayName.substring(0, 2).toUpperCase());
              }
          } else if (user.email) {
            setInitials(user.email.substring(0,2).toUpperCase());
          }
           else {
              setInitials("U");
          }
      } else {
          setInitials("U");
      }
  }, [user, loading]);


  const navItems = [
    { href: "/dashboard", icon: LayoutGrid, label: t('nav.dashboard'), exact: true },
    { href: "/dashboard/invoices", icon: FileText, label: t('nav.invoices') },
    { href: "/dashboard/clients", icon: Users, label: t('nav.clients') },
    { href: "/dashboard/expenses", icon: Receipt, label: t('nav.expenses') },
    { href: "/dashboard/reports", icon: AreaChart, label: t('nav.reports') },
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
      case '/dashboard/reports':
        return t('nav.reports');
      case '/dashboard/settings':
        return t('nav.settings');
      default:
        if (pathname.startsWith('/dashboard/invoices/')) return t('nav.invoiceDetails');
        return 'InvoiceFlow';
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  return (
    <>
      <Sidebar>
        <SidebarHeader className={cn("p-2 flex items-center", state === 'expanded' ? "justify-between" : "justify-center")}>
          <Link href="/dashboard" className={cn("flex items-center gap-2", state === 'collapsed' && "hidden")}>
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
                  <SidebarMenuButton 
                    isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)} 
                    tooltip={item.label}>
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
            <h1 className={cn("text-2xl font-semibold font-headline whitespace-nowrap", state === 'collapsed' && "hidden")}>{getPageTitle()}</h1>
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
            <NotificationsBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative w-10 h-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={user?.photoURL || undefined} alt="User" />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.displayName || 'My Account'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/dashboard/settings">{t('nav.settings')}</Link></DropdownMenuItem>
                <DropdownMenuItem>{t('nav.support')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>{t('nav.signOut')}</DropdownMenuItem>
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
      <DashboardHeaderContent>
        {children}
      </DashboardHeaderContent>
    </SidebarProvider>
  )
}
