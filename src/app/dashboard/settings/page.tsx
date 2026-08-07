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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
    const { data: session, status } = useSession();
    const user = session?.user;
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
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

    const userId = user?.id;

    useEffect(() => {
        async function loadProfile() {
            // Sin usuario no hay nada que pedir, pero el loading tiene que apagarse
            // igualmente: si no, la pantalla se queda en el esqueleto para siempre.
            if (!userId) {
                if (status !== 'loading') setLoading(false);
                return;
            }
            setLoading(true);
            setLoadError(null);
            try {
                const profile = await getCompanyProfile();
                if (profile) {
                    setCompanyData(profile);
                }
            } catch (e) {
                console.error("Error cargando el perfil de empresa:", e);
                setLoadError("No se ha podido cargar la configuración. Revisa tu conexión e inténtalo de nuevo.");
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [userId, status]);

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            const result = await saveCompanyProfile(companyData);
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

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                toast({ 
                    title: "Imagen demasiado grande", 
                    description: "Por favor selecciona una imagen de menos de 1MB para optimizar el almacenamiento.", 
                    variant: "destructive" 
                });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyData((prev: any) => ({ ...prev, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
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

    if (loading && user) return <div className="p-20 flex justify-center"><div className="animate-spin h-8 w-8 border border-primary border-t-transparent rounded-full" /></div>;

    return (
        <div className="space-y-6 pb-20">
            {loadError && (
                <Alert variant="destructive" className="rounded-md border-danger text-danger">
                    <Shield className="h-4 w-4" />
                    <AlertTitle className="font-medium text-sm">No se pudo cargar la configuración</AlertTitle>
                    <AlertDescription className="text-xs">{loadError}</AlertDescription>
                </Alert>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">Configuración</h2>
                    <p className="text-sm text-muted-foreground">Personaliza tu experiencia y configura AuraContable.</p>
                </div>
                <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="h-9 px-4 font-medium"
                >
                    <Save className="mr-2 h-4 w-4" /> 
                    {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </div>

            <div className="grid md:grid-cols-[240px_1fr] gap-6 items-start">
                {/* Lateral Navigation */}
                <div className="flex flex-col gap-1 sticky top-20">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left group",
                                activeTab === tab.id 
                                    ? "bg-muted text-foreground" 
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                            {tab.id === 'payments' && (
                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="space-y-6">
                    {activeTab === 'profile' && (
                        <Card className="border border-border shadow-sm rounded-xl p-6 bg-card">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 pb-8 border-b border-border">
                                <div className="relative group">
                                    <Avatar className="h-24 w-24 border border-border">
                                        <AvatarImage src={user?.image || undefined} />
                                        <AvatarFallback className="bg-muted text-muted-foreground text-xl font-medium">
                                            {user?.name?.charAt(0) || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <button className="absolute bottom-0 right-0 h-8 w-8 bg-background border border-border text-foreground rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                        <Camera className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="space-y-1 text-center md:text-left">
                                    <h3 className="text-xl font-medium tracking-tight">{user?.name || "Usuario"}</h3>
                                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                                    <div className="flex gap-2 mt-3 justify-center md:justify-start">
                                        <Badge variant="outline" className="text-[10px] font-medium uppercase text-emerald-500 border-emerald-500/30 bg-emerald-500/10">Verificado</Badge>
                                        <Badge variant="outline" className="text-[10px] font-medium uppercase">Enterprise</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <SettingField label="Nombre Completo" placeholder="Ej. Juan Pérez" value={user?.name || ""} disabled />
                                <SettingField label="Correo Electrónico" placeholder="tu@email.com" value={user?.email || ""} disabled />
                            </div>
                        </Card>
                    )}

                    {activeTab === 'appearance' && (
                        <Card className="border border-border shadow-sm rounded-xl p-6 bg-card space-y-6">
                            <div className="space-y-1">
                                <h4 className="text-lg font-medium tracking-tight flex items-center gap-2">
                                    Personalización Visual
                                </h4>
                                <p className="text-sm text-muted-foreground">Configura el tema de la aplicación.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <ThemeCard 
                                    active={theme === 'light'} 
                                    onClick={() => setTheme('light')}
                                    icon={<Sun />} 
                                    label="Modo Claro" 
                                />
                                <ThemeCard 
                                    active={theme === 'dark'} 
                                    onClick={() => setTheme('dark')}
                                    icon={<Moon />} 
                                    label="Modo Oscuro" 
                                />
                                <ThemeCard 
                                    active={theme === 'system'} 
                                    onClick={() => setTheme('system')}
                                    icon={<Monitor />} 
                                    label="Sistema" 
                                />
                            </div>
                        </Card>
                    )}

                    {activeTab === 'company' && (
                        <Card className="border border-border shadow-sm rounded-xl p-6 bg-card">
                            <div className="flex flex-col md:flex-row items-start gap-6 mb-8 pb-8 border-b border-border">
                                <div className="relative group w-full md:w-auto">
                                    <div className="h-32 w-48 rounded-md border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center overflow-hidden relative">
                                        {companyData.logoUrl ? (
                                            <img src={companyData.logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                                        ) : (
                                            <div className="text-center space-y-2 p-4 text-muted-foreground">
                                                <Building className="h-8 w-8 mx-auto opacity-50" />
                                                <p className="text-[10px] font-medium uppercase tracking-wider">Sin Logo</p>
                                            </div>
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        id="company-logo-input" 
                                        accept="image/*" 
                                        onChange={handleLogoChange}
                                        className="hidden" 
                                    />
                                    <div className="flex gap-2 mt-3 justify-center md:justify-start">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => document.getElementById('company-logo-input')?.click()}
                                            className="h-8 text-xs font-normal"
                                        >
                                            <Camera className="mr-2 h-3.5 w-3.5" /> Subir Logo
                                        </Button>
                                        {companyData.logoUrl && (
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => setCompanyData({...companyData, logoUrl: ''})}
                                                className="h-8 w-8 p-0 text-danger hover:text-danger hover:bg-danger/10"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1 flex-1">
                                    <h3 className="text-base font-medium tracking-tight">Logotipo de la Empresa</h3>
                                    <p className="text-muted-foreground text-xs leading-relaxed max-w-sm">Aparecerá en la cabecera de tus facturas y presupuestos. Recomendado: PNG con fondo transparente, max 1MB.</p>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <SettingField 
                                    label="Nombre Comercial" 
                                    value={companyData.companyName || ''} 
                                    onChange={(v) => setCompanyData({...companyData, companyName: v})}
                                    placeholder="Ej. Aura Contable SL" 
                                />
                                <SettingField 
                                    label="CIF / NIF / Tax ID" 
                                    value={companyData.taxId || ''} 
                                    onChange={(v) => setCompanyData({...companyData, taxId: v})}
                                    placeholder="Ej. B12345678" 
                                />
                                <div className="md:col-span-2">
                                    <SettingField 
                                        label="Dirección Fiscal" 
                                        value={companyData.address || ''} 
                                        onChange={(v) => setCompanyData({...companyData, address: v})}
                                        placeholder="Calle Principal 123, Ciudad" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">Moneda Predeterminada</Label>
                                    <Select 
                                        value={companyData.currency || 'EUR'} 
                                        onValueChange={(v) => setCompanyData({...companyData, currency: v})}
                                    >
                                        <SelectTrigger className="h-9 rounded-md border-border bg-background text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EUR">Euro (€)</SelectItem>
                                            <SelectItem value="USD">US Dollar ($)</SelectItem>
                                            <SelectItem value="GBP">British Pound (£)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <SettingField 
                                    label="Email de Facturación" 
                                    value={companyData.email || ''} 
                                    onChange={(v) => setCompanyData({...companyData, email: v})}
                                    placeholder="facturación@empresa.com" 
                                />
                            </div>
                        </Card>
                    )}

                    {activeTab === 'payments' && (
                        <div className="grid gap-4">
                            <IntegrationCard 
                                name="Stripe" 
                                desc="Acepta pagos con tarjeta y Apple Pay en tus facturas." 
                                icon="/images/stripe.svg" 
                                connected={true} 
                            />
                            <IntegrationCard 
                                name="PayPal" 
                                desc="Recibe pagos mediante PayPal de forma sencilla." 
                                icon="/images/PP_logo_h_200x51.png" 
                                connected={true}
                            />
                        </div>
                    )}

                    {activeTab === 'notifs' && (
                        <Card className="border border-border shadow-sm rounded-xl p-6 bg-card space-y-8">
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium tracking-tight flex items-center gap-2 border-b border-border pb-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" /> Alertas por Email
                                </h4>
                                <div className="space-y-4">
                                    <NotificationSwitch label="Facturas Vencidas" desc="Avisame cuando una factura supere su fecha de vencimiento." defaultChecked />
                                    <NotificationSwitch label="Nuevos Pagos" desc="Recibe un email cuando un cliente complete un pago." defaultChecked />
                                    <NotificationSwitch label="Resumen Semanal" desc="Un reporte con el estado de tu tesorería cada lunes." />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium tracking-tight flex items-center gap-2 border-b border-border pb-2">
                                    <Smartphone className="h-4 w-4 text-muted-foreground" /> Notificaciones Directas
                                </h4>
                                <div className="space-y-4">
                                    <NotificationSwitch label="Alertas de Sistema" desc="Mantenimiento y avisos críticos de AuraContable." defaultChecked />
                                    <NotificationSwitch label="Actividad de Seguridad" desc="Avisos de nuevos inicios de sesión desde otros dispositivos." defaultChecked />
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'billing' && (
                        <div className="grid md:grid-cols-3 gap-6">
                            <Card className="md:col-span-2 border border-border shadow-sm rounded-xl p-6 bg-card space-y-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tu Plan Actual</p>
                                    <h3 className="text-2xl font-medium tracking-tight">Aura Enterprise</h3>
                                    <p className="text-sm text-muted-foreground">Renueva el 15 de Abril, 2026</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Facturación anual</p>
                                        <p className="text-lg font-medium">490,00€ <span className="text-sm text-muted-foreground font-normal">/ año</span></p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Método de pago</p>
                                        <p className="text-sm font-medium flex items-center gap-2">Visa **** 4242</p>
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <Button variant="outline" className="h-9 font-normal">Cambiar Método</Button>
                                    <Button className="h-9 font-normal">Gestionar Plan</Button>
                                </div>
                            </Card>

                            <Card className="border border-primary/20 bg-primary/5 p-6 rounded-xl space-y-4">
                                <div className="space-y-2">
                                    <Zap className="h-6 w-6 text-primary" />
                                    <h4 className="text-base font-medium">Aura Plus</h4>
                                    <p className="text-xs text-muted-foreground">Desbloquea funciones avanzadas para tu negocio.</p>
                                </div>
                                <ul className="space-y-2 pt-2">
                                    <li className="flex items-center gap-2 text-xs text-foreground"><Check className="h-3 w-3 text-primary" /> Multi-empresa Ilimitado</li>
                                    <li className="flex items-center gap-2 text-xs text-foreground"><Check className="h-3 w-3 text-primary" /> Conciliación Bancaria IA</li>
                                    <li className="flex items-center gap-2 text-xs text-foreground"><Check className="h-3 w-3 text-primary" /> API de Desarrollador</li>
                                </ul>
                                <Button className="w-full h-9 font-medium mt-4">Actualizar Plan</Button>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SettingField({ label, placeholder, value, disabled, onChange }: { label: string, placeholder: string, value?: string, disabled?: boolean, onChange?: (val: string) => void }) {
    return (
        <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            <Input 
                value={value} 
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder} 
                disabled={disabled}
                className="h-9 rounded-md border-border bg-background text-sm"
            />
        </div>
    );
}

function IntegrationCard({ name, desc, icon, connected }: { name: string, desc: string, icon: string, connected?: boolean }) {
    return (
        <Card className="border border-border shadow-sm rounded-xl p-4 bg-card">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-md border border-border bg-white flex items-center justify-center p-2 shrink-0">
                        {icon.includes('svg') || icon.includes('png') ? (
                            <img src={icon} alt={name} className="h-full w-full object-contain opacity-80" />
                        ) : (
                            <CreditCard className="h-6 w-6 text-muted-foreground" />
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium">{name}</h4>
                            {connected && (
                                <Badge variant="outline" className="text-[10px] font-medium uppercase text-emerald-500 border-emerald-500/30 bg-emerald-500/10 px-2 py-0">
                                    Conectado
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                </div>
                <Button variant={connected ? "outline" : "default"} size="sm" className="h-8 font-normal shrink-0">
                    {connected ? "Desconectar" : "Configurar"}
                </Button>
            </div>
        </Card>
    );
}

function NotificationSwitch({ label, desc, defaultChecked }: { label: string, desc: string, defaultChecked?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Switch defaultChecked={defaultChecked} />
        </div>
    );
}

function ThemeCard({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactElement, label: string }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-xl border transition-all text-sm",
                active 
                    ? "bg-muted border-foreground/20 text-foreground font-medium" 
                    : "bg-card border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
        >
            {React.cloneElement(icon, { className: "h-5 w-5" })}
            <span>{label}</span>
        </button>
    );
}
