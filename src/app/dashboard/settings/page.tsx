
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Locale } from "@/lib/i18n/locales";
import { Building, Languages, Shield, User, Bell, Palette, FileText, Moon, Sun, Monitor, PlusCircle, Trash2, Mail, Image as ImageIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import React, { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase/config";
import { updateProfile, updateEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import type { CompanyProfile, InvoiceTax } from "@/lib/types";
import { getCompanyProfile, saveCompanyProfile } from "@/lib/firebase/firestore";
import Image from "next/image";


export default function SettingsPage() {
    const { t } = useLocale();
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [user] = useAuthState(auth);
    const { toast } = useToast();


    useEffect(() => {
        async function fetchProfile() {
            if (user) {
                setIsLoading(true);
                const existingProfile = await getCompanyProfile(user.uid);
                if (existingProfile) {
                    setCompanyProfile({
                        ...existingProfile,
                        templates: existingProfile.templates || {
                            newInvoice: { subject: '', body: '' },
                            reminder: { subject: '', body: '' }
                        }
                    });
                } else {
                    setCompanyProfile({
                        userId: user.uid,
                        name: '', taxId: '', address: '', billingEmail: '', iban: '', fiscalData: '', logoUrl: '', terms: '', defaultTaxes: [],
                        templates: {
                            newInvoice: { subject: '', body: '' },
                            reminder: { subject: '', body: '' }
                        }
                    });
                }
                setIsLoading(false);
            }
        }
        fetchProfile();
    }, [user]);

    const handleProfileChange = (updatedProfile: CompanyProfile) => {
        setCompanyProfile(updatedProfile);
    }
    
    const handleSaveAllChanges = async () => {
        if (!user || !companyProfile) return;
        setIsSaving(true);
        try {
            await saveCompanyProfile(companyProfile);
            toast({
                title: "Ajustes guardados",
                description: "Todos tus cambios se han guardado correctamente.",
            });
        } catch (error) {
             toast({
                title: "Error",
                description: "Hubo un problema al guardar los ajustes.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }


    const tabs = [
        { value: "profile", label: t('settings.profile.title'), icon: User },
        { value: "company", label: t('settings.company.title'), icon: Building },
        { value: "invoicing", label: t('settings.invoicing.title'), icon: FileText },
        { value: "templates", label: t('settings.templates.title'), icon: Mail },
        { value: "appearance", label: t('settings.appearance.title'), icon: Palette },
        { value: "notifications", label: t('settings.notifications.title'), icon: Bell },
        { value: "language", label: t('settings.language.title'), icon: Languages },
        { value: "security", label: t('settings.security.title'), icon: Shield },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold font-headline">{t('nav.settings')}</h1>
                <Button onClick={handleSaveAllChanges} disabled={isSaving || isLoading}>
                    {isSaving ? "Guardando..." : t('common.saveChanges')}
                </Button>
            </div>
            
            <Tabs defaultValue="profile" className="grid md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr] gap-6 items-start">
                <TabsList className="w-full h-auto bg-transparent p-0 flex-col items-start" orientation="vertical">
                    {tabs.map((tab) => (
                         <TabsTrigger key={tab.value} value={tab.value} className="w-full justify-start gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                
                <div className="col-span-1">
                    <TabsContent value="profile" className="m-0">
                        <ProfileSettings />
                    </TabsContent>
                    <TabsContent value="company" className="m-0">
                        <CompanySettings 
                            profile={companyProfile}
                            onProfileChange={handleProfileChange}
                            isLoading={isLoading}
                        />
                    </TabsContent>
                    <TabsContent value="invoicing" className="m-0">
                        <InvoicingSettings 
                            profile={companyProfile}
                            onProfileChange={handleProfileChange}
                            isLoading={isLoading}
                        />
                    </TabsContent>
                    <TabsContent value="templates" className="m-0">
                        <TemplateSettings 
                             profile={companyProfile}
                            onProfileChange={handleProfileChange}
                            isLoading={isLoading}
                        />
                    </TabsContent>
                    <TabsContent value="security" className="m-0">
                        <SecuritySettings />
                    </TabsContent>
                    <TabsContent value="notifications" className="m-0">
                        <NotificationsSettings />
                    </TabsContent>
                    <TabsContent value="appearance" className="m-0">
                        <AppearanceSettings />
                    </TabsContent>
                    <TabsContent value="language" className="m-0">
                        <LanguageSettings />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}


function ProfileSettings() {
    const { t } = useLocale();
    const [user, loading, error] = useAuthState(auth);
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.displayName || '');
            setEmail(user.email || '');
        }
    }, [user]);

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        try {
            if (name !== user.displayName) {
                await updateProfile(user, { displayName: name });
            }
            if (email !== user.email) {
                await updateEmail(user, email);
            }
            toast({
                title: "Perfil actualizado",
                description: "Tus cambios se han guardado correctamente.",
            });
        } catch (error: any) {
            console.error("Error updating profile:", error);
            toast({
                title: "Error",
                description: `Hubo un problema al actualizar tu perfil: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) {
        return <p>Cargando perfil...</p>
    }

    return (
        <Card>
            <form onSubmit={handleSaveChanges}>
                <CardHeader>
                    <CardTitle>{t('settings.profile.title')}</CardTitle>
                    <CardDescription>
                        {t('settings.profile.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('settings.profile.name')}</Label>
                        <Input 
                            id="name" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSaving}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('settings.profile.email')}</Label>
                        <Input 
                            id="email" 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSaving}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSaving || loading}>
                        {isSaving ? "Guardando..." : t('common.saveChanges')}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}

type CompanySettingsProps = {
  profile: CompanyProfile | null;
  onProfileChange: (profile: CompanyProfile) => void;
  isLoading: boolean;
};


function CompanySettings({ profile, onProfileChange, isLoading }: CompanySettingsProps) {
    const { t } = useLocale();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!profile) return;
        onProfileChange({ ...profile, [e.target.id]: e.target.value });
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!profile) return;
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onProfileChange({ ...profile, logoUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };
    
    if (isLoading || !profile) {
        return <p>Cargando datos de la empresa...</p>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.company.title')}</CardTitle>
                <CardDescription>{t('settings.company.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('settings.company.name')}</Label>
                        <Input id="name" placeholder="Acme Inc." value={profile.name} onChange={handleChange}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="taxId">{t('settings.company.taxId')}</Label>
                        <Input id="taxId" placeholder="ESB12345678" value={profile.taxId} onChange={handleChange}/>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">{t('settings.company.address')}</Label>
                    <Input id="address" placeholder="123 Main St, Anytown" value={profile.address} onChange={handleChange}/>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="billingEmail">{t('settings.company.billingEmail')}</Label>
                        <Input id="billingEmail" type="email" placeholder="billing@acme.com" value={profile.billingEmail} onChange={handleChange}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="iban">{t('settings.company.iban')}</Label>
                        <Input id="iban" placeholder="ES91 2100 0418 4502 0005 1332" value={profile.iban} onChange={handleChange}/>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="fiscalData">{t('settings.company.fiscalData')}</Label>
                    <Textarea id="fiscalData" placeholder={t('settings.company.fiscalDataPlaceholder')} value={profile.fiscalData} onChange={handleChange}/>
                </div>
                 <div className="space-y-2">
                    <Label>{t('settings.company.logo')}</Label>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-md border flex items-center justify-center bg-muted/50 overflow-hidden">
                            {profile.logoUrl ? (
                                <Image src={profile.logoUrl} alt="Company Logo" width={96} height={96} className="object-contain" />
                            ) : (
                                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                            )}
                        </div>
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                            {t('settings.company.uploadLogo')}
                        </Button>
                        <Input ref={fileInputRef} id="company-logo" type="file" className="hidden" onChange={handleLogoChange} accept="image/png, image/jpeg, image/gif"/>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('settings.company.logoHint')}</p>
                </div>
            </CardContent>
        </Card>
    )
}

type InvoicingSettingsProps = {
  profile: CompanyProfile | null;
  onProfileChange: (profile: CompanyProfile) => void;
  isLoading: boolean;
};

function InvoicingSettings({ profile, onProfileChange, isLoading }: InvoicingSettingsProps) {
    const { t } = useLocale();

    const handleFieldChange = (field: keyof CompanyProfile, value: any) => {
        if (!profile) return;
        onProfileChange({ ...profile, [field]: value });
    };

    const handleTaxChange = (index: number, field: keyof InvoiceTax, value: string | number) => {
        if (!profile || !profile.defaultTaxes) return;
        const newTaxes = [...profile.defaultTaxes];
        const taxToUpdate = { ...newTaxes[index], [field]: value };
        
        if(field === 'percentage' && typeof value === 'string') {
            taxToUpdate.percentage = parseFloat(value) || 0;
        }

        newTaxes[index] = taxToUpdate;
        onProfileChange({ ...profile, defaultTaxes: newTaxes });
    };

    const addTax = () => {
        if (!profile) return;
        const newTaxes = [...(profile.defaultTaxes || []), { id: `new-${Date.now()}`, name: '', percentage: 0 }];
        onProfileChange({ ...profile, defaultTaxes: newTaxes });
    };

    const removeTax = (index: number) => {
        if (!profile || !profile.defaultTaxes) return;
        const newTaxes = profile.defaultTaxes.filter((_, i) => i !== index);
        onProfileChange({ ...profile, defaultTaxes: newTaxes });
    };

     if (isLoading || !profile) {
        return <p>Cargando ajustes de facturación...</p>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.invoicing.title')}</CardTitle>
                <CardDescription>{t('settings.invoicing.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-2">
                    <Label>{t('settings.invoicing.defaultTaxes')}</Label>
                    <div className="space-y-2">
                        {(profile.defaultTaxes || []).map((tax, index) => (
                             <div key={index} className="flex items-center gap-2">
                                <Input 
                                    placeholder="IVA" 
                                    className="w-1/3" 
                                    value={tax.name}
                                    onChange={(e) => handleTaxChange(index, 'name', e.target.value)}
                                />
                                <Input 
                                    type="number" 
                                    placeholder="21" 
                                    className="w-1/4" 
                                    value={tax.percentage}
                                    onChange={(e) => handleTaxChange(index, 'percentage', e.target.value)}
                                />
                                <span className="text-muted-foreground">%</span>
                                <Button variant="ghost" size="icon" onClick={() => removeTax(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                     <Button variant="outline" size="sm" onClick={addTax}><PlusCircle className="h-4 w-4 mr-2" /> {t('settings.invoicing.addTax')}</Button>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="terms">{t('settings.invoicing.defaultTerms')}</Label>
                    <Textarea 
                        id="terms" 
                        placeholder={t('settings.invoicing.defaultTermsPlaceholder')} 
                        value={profile.terms || ''}
                        onChange={(e) => handleFieldChange('terms', e.target.value)}
                    />
                </div>

            </CardContent>
        </Card>
    );
}

type TemplateSettingsProps = {
  profile: CompanyProfile | null;
  onProfileChange: (profile: CompanyProfile) => void;
  isLoading: boolean;
};

function TemplateSettings({ profile, onProfileChange, isLoading }: TemplateSettingsProps) {
    const { t } = useLocale();

    const handleChange = (template: 'newInvoice' | 'reminder', field: 'subject' | 'body', value: string) => {
        if (!profile) return;
        
        onProfileChange({
            ...profile,
            templates: {
                ...profile.templates,
                [template]: {
                    ...profile.templates?.[template],
                    [field]: value
                }
            }
        });
    };

    if (isLoading || !profile) {
        return <p>Cargando plantillas...</p>;
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.templates.title')}</CardTitle>
                <CardDescription>{t('settings.templates.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>{t('settings.templates.newInvoice.title')}</Label>
                    <Input 
                        placeholder={t('settings.templates.newInvoice.subjectPlaceholder')} 
                        value={profile.templates?.newInvoice.subject || ''}
                        onChange={(e) => handleChange('newInvoice', 'subject', e.target.value)}
                    />
                    <Textarea 
                        rows={5} 
                        placeholder={t('settings.templates.newInvoice.bodyPlaceholder')} 
                        value={profile.templates?.newInvoice.body || ''}
                        onChange={(e) => handleChange('newInvoice', 'body', e.target.value)}
                    />
                </div>
                 <div className="space-y-2">
                    <Label>{t('settings.templates.reminder.title')}</Label>
                    <Input 
                        placeholder={t('settings.templates.reminder.subjectPlaceholder')} 
                        value={profile.templates?.reminder.subject || ''}
                        onChange={(e) => handleChange('reminder', 'subject', e.target.value)}
                    />
                    <Textarea 
                        rows={5} 
                        placeholder={t('settings.templates.reminder.bodyPlaceholder')}
                        value={profile.templates?.reminder.body || ''}
                        onChange={(e) => handleChange('reminder', 'body', e.target.value)}
                    />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">{t('settings.templates.variablesInfo')}</p>
                    <p className="text-sm font-mono text-muted-foreground">{"{{clientName}} {{invoiceNumber}} {{invoiceTotal}} {{dueDate}}"}</p>
                </div>
            </CardContent>
        </Card>
    )
}


function SecuritySettings() {
    const { t } = useLocale();
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.security.title')}</CardTitle>
                <CardDescription>
                    {t('settings.security.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="new-password">{t('settings.security.newPassword')}</Label>
                <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t('settings.security.confirmPassword')}</Label>
                    <Input id="confirm-password" type="password" />
                </div>
            </CardContent>
            <CardFooter>
                <Button>{t('settings.security.updatePassword')}</Button>
            </CardFooter>
        </Card>
    )
}

function NotificationsSettings() {
    const { t } = useLocale();
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.notifications.title')}</CardTitle>
                <CardDescription>{t('settings.notifications.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor="invoice-paid-email">{t('settings.notifications.invoicePaid.title')}</Label>
                        <p className="text-sm text-muted-foreground">{t('settings.notifications.invoicePaid.description')}</p>
                    </div>
                    <Switch id="invoice-paid-email" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor="invoice-overdue-email">{t('settings.notifications.invoiceOverdue.title')}</Label>
                         <p className="text-sm text-muted-foreground">{t('settings.notifications.invoiceOverdue.description')}</p>
                    </div>
                    <Switch id="invoice-overdue-email" />
                </div>
            </CardContent>
        </Card>
    );
}

function LanguageSettings() {
    const { t, locale, setLocale } = useLocale();

    const handleLanguageChange = (value: string) => {
        setLocale(value as Locale);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.language.title')}</CardTitle>
                <CardDescription>{t('settings.language.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                    <div className="w-full max-w-xs">
                        <Label htmlFor="language-select">{t('settings.language.select')}</Label>
                    <Select value={locale} onValueChange={handleLanguageChange}>
                        <SelectTrigger id="language-select">
                            <SelectValue placeholder={t('settings.language.select')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="it">Italiano</SelectItem>
                            <SelectItem value="ca">Català</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
            </CardContent>
        </Card>
    )
}

function AppearanceSettings() {
    const { t } = useLocale();
    const { theme, setTheme } = useTheme();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.appearance.title')}</CardTitle>
                <CardDescription>{t('settings.appearance.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="w-full max-w-xs space-y-2">
                    <Label htmlFor="theme-select">{t('settings.appearance.theme')}</Label>
                     <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger id="theme-select">
                            <SelectValue placeholder={t('settings.appearance.theme')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">
                                <div className="flex items-center gap-2">
                                    <Sun className="h-4 w-4"/>
                                    {t('settings.appearance.light')}
                                </div>
                            </SelectItem>
                            <SelectItem value="dark">
                                <div className="flex items-center gap-2">
                                    <Moon className="h-4 w-4"/>
                                    {t('settings.appearance.dark')}
                                </div>
                            </SelectItem>
                            <SelectItem value="system">
                                <div className="flex items-center gap-2">
                                    <Monitor className="h-4 w-4"/>
                                    {t('settings.appearance.system')}
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    )
}
