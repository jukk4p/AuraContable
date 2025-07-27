"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { Locale } from "@/lib/i18n/locales";

export default function SettingsPage() {
    const { t, locale, setLocale } = useLocale();

    const handleLanguageChange = (value: string) => {
        setLocale(value as Locale);
    }

    return (
        <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="profile">{t('settings.profile.title')}</TabsTrigger>
                <TabsTrigger value="account">{t('settings.account.title')}</TabsTrigger>
                <TabsTrigger value="language">{t('settings.language.title')}</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
                <Card>
                <CardHeader>
                    <CardTitle>{t('settings.profile.title')}</CardTitle>
                    <CardDescription>
                        {t('settings.profile.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('settings.profile.name')}</Label>
                        <Input id="name" defaultValue="John Doe" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('settings.profile.email')}</Label>
                        <Input id="email" type="email" defaultValue="john.doe@example.com" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button>{t('common.saveChanges')}</Button>
                </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="account">
                <Card>
                <CardHeader>
                    <CardTitle>{t('settings.account.title')}</CardTitle>
                    <CardDescription>
                        {t('settings.account.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="new-password">{t('settings.account.newPassword')}</Label>
                    <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">{t('settings.account.confirmPassword')}</Label>
                        <Input id="confirm-password" type="password" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button>{t('settings.account.updatePassword')}</Button>
                </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="language">
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
            </TabsContent>
        </Tabs>
    );
}
