"use client"

import React, { useState, useEffect } from 'react';
import { 
    User, Building, FileText, Mail, 
    Palette, Bell, Languages, CreditCard, 
    Shield, Check, Save, Globe,
    Trash2, Edit, Sun, Moon, Monitor,
    Sparkles, Palette as PaletteIcon, Zap, Camera, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTheme } from "next-themes";
import { 
    Select, SelectContent, SelectItem, 
    SelectTrigger, SelectValue 
} from '@/components/ui/select';

import { useLocale } from '@/lib/i18n/locale-provider';
import { cn } from '@/lib/utils';
import { useSession } from "next-auth/react";
import { getCompanyProfile, saveCompanyProfile } from '@/actions/company';
import { toast } from '@/hooks/use-toast';

export default function SettingsPage() {
    const { t } = useLocale();
    const { data: session } = useSession();
    const user = session?.user;
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { setTheme, theme } = useTheme();
    const [companyData, setCompanyData] = useState<any>({
        companyName: '',
        taxId: '',
        address: '',
        email: '',
        phone: '',
        logoUrl: '',
        iban: '',
        currency: 'EUR',
    });

    useEffect(() => {
        async function loadProfile() {
            if (user?.id) {
                const profile = await getCompanyProfile(user.id);
                if (profile) {
                    setCompanyData(profile);
                }
                setLoading(false);
            }
        }
        loadProfile();
    }, [user]);

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            const result = await saveCompanyProfile({ ...companyData, userId: user.id });
            if (result.success) {
                toast({ title: "Configuración Guardada", description: "Los cambios se han aplicado correctamente." });
            } else {
                toast({ title: "Error al guardar", description: result.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error crítico", description: "Ocurrió un error inesperado.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: "profile", label: "Perfil de Usuario", icon: User },
        { id: "appearance", label: "Personalización", icon: PaletteIcon },
        { id: "company", label: "Datos de Empresa", icon: Building },
        { id: "payments", label: "Pagos y Pasarelas", icon: CreditCard },
        { id: "notifs", label: "Notificaciones", icon: Bell },
        { id: "billing", label: "Suscripción SaaS", icon: Zap },
    ];

    if (loading && user) return <div className="p-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black font-headline tracking-tighter text-foreground">Configuración</h2>
                    <p className="text-muted-foreground font-medium italic">Personaliza tu experiencia y configura AuraContable.</p>
                </div>
                <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="h-12 rounded-2xl px-8 font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
                >
                    <Save className="mr-2 h-4 w-4" /> 
                    {saving ? "Guardando..." : "Guardar Todos los Cambios"}
                </Button>
            </div>

            <div className="grid gap-8 md:grid-cols-[280px_1fr] items-start">
                {/* Lateral Navigation */}
                <Card className="glass-card border-none shadow-2xl shadow-black/[0.03] p-2 rounded-[2rem] md:sticky md:top-28">
                    <div className="flex flex-col gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm tracking-tight transition-all text-left group",
                                    activeTab === tab.id 
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                        : "hover:bg-primary/5 text-muted-foreground hover:text-primary"
                                )}
                            >
                                <tab.icon className={cn("h-5 w-5", activeTab === tab.id ? "stroke-[2.5]" : "stroke-2")} />
                                {tab.label}
                                {tab.id === 'payments' && (
                                    <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                )}
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Main Content Area */}
                <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                    <AnimatePresence mode="wait">
                        {activeTab === 'profile' && (
                            <motion.div 
                                key="profile"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-8"
                            >
                                <Card className="glass-card border-none shadow-xl shadow-black/[0.02] rounded-[2.5rem] p-8">
                                    <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                                        <div className="relative group">
                                            <Avatar className="h-32 w-32 border-4 border-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
                                                <AvatarImage src={user?.image || undefined} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-black">
                                                    {user?.name?.charAt(0) || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <button className="absolute bottom-0 right-0 h-10 w-10 bg-primary text-primary-foreground rounded-full border-4 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-90">
                                                <Camera className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <div className="space-y-1 text-center md:text-left">
                                            <h3 className="text-2xl font-black font-headline tracking-tight">{user?.name || "Usuario"}</h3>
                                            <p className="text-muted-foreground font-medium italic">{user?.email}</p>
                                            <div className="flex gap-3 mt-4 justify-center md:justify-start">
                                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px] uppercase py-1 px-4 rounded-full transition-all duration-300 hover:bg-emerald-500 hover:text-white cursor-default shadow-sm hover:shadow-emerald-500/20 active:scale-95">Cuenta Verificada</Badge>
                                                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase py-1 px-4 rounded-full transition-all duration-300 hover:bg-primary hover:text-white cursor-default shadow-sm hover:shadow-primary/20 active:scale-95">Plan Enterprise</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-8">
                                        <SettingField label="Nombre Completo" placeholder="Ej. Juan Pérez" value={user?.name || ""} disabled />
                                        <SettingField label="Correo Electrónico" placeholder="tu@email.com" value={user?.email || ""} disabled />
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'appearance' && (
                            <motion.div 
                                key="appearance"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-8"
                            >
                                <Card className="glass-card border-none shadow-xl shadow-black/[0.02] rounded-[2.5rem] p-10 space-y-10">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h4 className="text-2xl font-black font-headline tracking-tighter flex items-center gap-3">
                                                <Sparkles className="h-6 w-6 text-primary" /> Personalización Visual
                                            </h4>
                                            <p className="text-sm font-medium text-muted-foreground italic leading-relaxed">Configura la atmósfera de AuraContable para que se adapte perfectamente a tu entorno de trabajo.</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <ThemeCard 
                                                active={theme === 'light'} 
                                                onClick={() => setTheme('light')}
                                                icon={<Sun />} 
                                                label="Modo Claro" 
                                                desc="Claridad cristalina para el día."
                                            />
                                            <ThemeCard 
                                                active={theme === 'dark'} 
                                                onClick={() => setTheme('dark')}
                                                icon={<Moon />} 
                                                label="Modo Oscuro" 
                                                desc="Elegancia profunda para la noche."
                                            />
                                            <ThemeCard 
                                                active={theme === 'system'} 
                                                onClick={() => setTheme('system')}
                                                icon={<Monitor />} 
                                                label="Modo Sistema" 
                                                desc="Armonía absoluta con tu equipo."
                                            />
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'company' && (
                            <motion.div 
                                key="company"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-8"
                            >
                                <Card className="glass-card border-none shadow-xl shadow-black/[0.02] rounded-[2.5rem] p-8">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre Comercial</Label>
                                            <Input 
                                                value={companyData.companyName || ''} 
                                                onChange={(e) => setCompanyData({...companyData, companyName: e.target.value})}
                                                placeholder="Ej. Aura Contable SL" 
                                                className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-base focus:ring-2 ring-primary/20 transition-all px-6 text-foreground"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CIF / NIF / Tax ID</Label>
                                            <Input 
                                                value={companyData.taxId || ''} 
                                                onChange={(e) => setCompanyData({...companyData, taxId: e.target.value})}
                                                placeholder="Ej. B12345678" 
                                                className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-base focus:ring-2 ring-primary/20 transition-all px-6 text-foreground"
                                            />
                                        </div>
                                        <div className="space-y-3 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dirección Fiscal</Label>
                                            <Input 
                                                value={companyData.address || ''} 
                                                onChange={(e) => setCompanyData({...companyData, address: e.target.value})}
                                                placeholder="Calle Falsa 123, Madrid" 
                                                className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-base focus:ring-2 ring-primary/20 transition-all px-6 text-foreground"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Moneda Predeterminada</Label>
                                            <Select 
                                                value={companyData.currency || 'EUR'} 
                                                onValueChange={(v) => setCompanyData({...companyData, currency: v})}
                                            >
                                                <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-base focus:ring-2 ring-primary/20 transition-all text-foreground">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-white/10 glass shadow-2xl">
                                                    <SelectItem value="EUR" className="font-bold">Euro (€)</SelectItem>
                                                    <SelectItem value="USD" className="font-bold">US Dollar ($)</SelectItem>
                                                    <SelectItem value="GBP" className="font-bold">British Pound (£)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email de Facturación</Label>
                                            <Input 
                                                value={companyData.email || ''} 
                                                onChange={(e) => setCompanyData({...companyData, email: e.target.value})}
                                                placeholder="facturas@empresa.com" 
                                                className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-base focus:ring-2 ring-primary/20 transition-all px-6 text-foreground"
                                            />
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'payments' && (
                            <motion.div 
                                key="payments"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-8"
                            >
                                <div className="grid gap-6">
                                    <IntegrationCard 
                                        name="Stripe" 
                                        desc="Acepta pagos con tarjeta y Apple Pay directamente en tus facturas." 
                                        icon="/images/stripe.svg" 
                                        connected={true} 
                                    />
                                    <IntegrationCard 
                                        name="PayPal" 
                                        desc="Ofrece PayPal como método de pago global para tus clientes." 
                                        icon="/images/PP_logo_h_200x51.png" 
                                        connected={true}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'notifs' && (
                            <motion.div 
                                key="notifs"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-8"
                            >
                                <Card className="glass-card border-none shadow-xl shadow-black/[0.02] rounded-[2.5rem] p-8 space-y-10">
                                    <div className="space-y-6">
                                        <h4 className="text-xl font-black font-headline tracking-tight flex items-center gap-3">
                                            <Mail className="h-5 w-5 text-primary" /> Alertas por Email
                                        </h4>
                                        <div className="space-y-4">
                                            <NotificationSwitch label="Facturas Vencidas" desc="Avisame cuando una factura supere su fecha de vencimiento." defaultChecked />
                                            <NotificationSwitch label="Nuevos Pagos" desc="Recibe un email cuando un cliente complete un pago." defaultChecked />
                                            <NotificationSwitch label="Resumen Semanal" desc="Un reporte con el estado de tu tesorería cada lunes." />
                                        </div>
                                    </div>

                                    <div className="pt-10 border-t border-border/50 space-y-6">
                                        <h4 className="text-xl font-black font-headline tracking-tight flex items-center gap-3">
                                            <Smartphone className="h-5 w-5 text-primary" /> Notificaciones Directas
                                        </h4>
                                        <div className="space-y-4">
                                            <NotificationSwitch label="Alertas de Sistema" desc="Mantenimiento, actualizaciones y avisos críticos de AuraContable." defaultChecked />
                                            <NotificationSwitch label="Actividad de Seguridad" desc="Avisos de nuevos inicios de sesión desde otros dispositivos." defaultChecked />
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'billing' && (
                            <motion.div 
                                key="billing"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-8"
                            >
                                <div className="grid md:grid-cols-3 gap-8">
                                    <Card className="md:col-span-2 glass-card border-none shadow-xl shadow-black/[0.02] rounded-[2.5rem] p-10 space-y-8 overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] -rotate-12">
                                            <Zap className="h-40 w-40" />
                                        </div>
                                        <div className="space-y-2 relative z-10">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Tu Plan Actual</p>
                                            <h3 className="text-4xl font-black font-headline tracking-tighter">Aura Enterprise</h3>
                                            <p className="text-sm font-medium text-muted-foreground italic">Renueva el 15 de Abril, 2026</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-8 pt-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-black opacity-40">Facturación anual</p>
                                                <p className="text-2xl font-black">490,00€ <span className="text-sm opacity-30">/ año</span></p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-black opacity-40">Método de pago</p>
                                                <p className="text-lg font-black flex items-center gap-2 italic">Visa **** 4242</p>
                                            </div>
                                        </div>

                                        <div className="pt-6 flex gap-4">
                                            <Button variant="outline" className="h-12 flex-1 rounded-2xl font-black border-2 border-dashed border-primary/20">Cambiar Método</Button>
                                            <Button className="h-12 flex-1 rounded-2xl font-black shadow-lg shadow-primary/20">Gestionar Plan</Button>
                                        </div>
                                    </Card>

                                    <Card className="bg-primary border-none p-8 rounded-[2.5rem] text-primary-foreground space-y-6 shadow-2xl shadow-primary/40 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <Zap className="h-10 w-10 stroke-[3]" />
                                            <h4 className="text-xl font-black font-headline leading-tight">Potencia tu Negocio con Aura Plus</h4>
                                            <ul className="space-y-3">
                                               <li className="flex items-center gap-3 text-xs font-bold opacity-80"><Check className="h-4 w-4" /> Multi-empresa Ilimitado</li>
                                               <li className="flex items-center gap-3 text-xs font-bold opacity-80"><Check className="h-4 w-4" /> Conciliación Bancaria IA</li>
                                               <li className="flex items-center gap-3 text-xs font-bold opacity-80"><Check className="h-4 w-4" /> API de Desarrollador</li>
                                            </ul>
                                        </div>
                                        <Button className="w-full bg-white text-primary hover:bg-white/90 font-black h-12 rounded-2xl">Descubre Aura Plus</Button>
                                    </Card>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function SettingField({ label, placeholder, value, disabled }: { label: string, placeholder: string, value?: string, disabled?: boolean }) {
    return (
        <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{label}</Label>
            <Input 
                defaultValue={value} 
                placeholder={placeholder} 
                disabled={disabled}
                className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-base focus:ring-2 ring-primary/20 transition-all px-6"
            />
        </div>
    );
}

function IntegrationCard({ name, desc, icon, connected }: { name: string, desc: string, icon: string, connected?: boolean }) {
    return (
        <Card className="glass-card border-none shadow-xl shadow-black/[0.02] rounded-[3rem] p-8 group hover:shadow-primary/5 transition-all duration-500 overflow-hidden relative">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                    <div className="h-20 w-20 rounded-[2rem] bg-white dark:bg-slate-900 border border-border/50 flex items-center justify-center p-3 group-hover:scale-105 transition-transform duration-500 overflow-hidden shadow-sm">
                        <img src={icon} alt={name} className="h-full w-full object-contain" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h4 className="text-2xl font-black font-headline tracking-tighter">{name}</h4>
                            {connected && (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px] uppercase py-1 px-3 flex gap-1 items-center animate-pulse">
                                    <Check className="h-3 w-3" /> Conectado
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-md italic">{desc}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button variant={connected ? "outline" : "default"} className={cn(
                        "h-12 flex-1 md:flex-none rounded-2xl px-8 font-black transition-all",
                        connected ? "border-2 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30" : "shadow-lg shadow-primary/20"
                    )}>
                        {connected ? "Desconectar" : "Configurar Pasarela"}
                    </Button>
                </div>
            </div>
        </Card>
    );
}

function NotificationSwitch({ label, desc, defaultChecked }: { label: string, desc: string, defaultChecked?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-6 group/notif transition-all">
            <div className="space-y-1">
                <p className="text-sm font-black group-hover/notif:text-primary transition-colors">{label}</p>
                <p className="text-xs font-medium text-muted-foreground italic">{desc}</p>
            </div>
            <Switch defaultChecked={defaultChecked} className="data-[state=checked]:bg-primary shadow-lg shadow-black/5" />
        </div>
    );
}

function ThemeCard({ active, onClick, icon, label, desc }: { active: boolean, onClick: () => void, icon: React.ReactElement, label: string, desc: string }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-6 p-10 rounded-[2.5rem] transition-all duration-700 border-4 relative overflow-hidden group",
                active 
                    ? "bg-primary/10 border-primary shadow-[0_20px_40px_rgba(var(--primary-rgb),0.15)] scale-[1.02]" 
                    : "bg-muted/10 border-transparent hover:bg-muted/20 hover:border-muted/30 hover:scale-[1.01]"
            )}
        >
            <div className={cn(
                "h-20 w-20 rounded-[1.8rem] flex items-center justify-center transition-all duration-700",
                active ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30 rotate-3" : "bg-muted/40 text-muted-foreground group-hover:bg-muted/60"
            )}>
                {React.cloneElement(icon, { className: "h-10 w-10 stroke-[2.5]" })}
            </div>
            <div className="text-center space-y-2">
                <p className={cn("text-lg font-black tracking-tight transition-colors", active ? "text-foreground" : "text-muted-foreground")}>{label}</p>
                <p className="text-[10px] font-bold opacity-50 italic uppercase tracking-widest">{desc}</p>
            </div>
            {active && (
                <div className="absolute top-5 right-5 h-8 w-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-500">
                    <Check className="h-4 w-4 stroke-[4]" />
                </div>
            )}
        </button>
    );
}
