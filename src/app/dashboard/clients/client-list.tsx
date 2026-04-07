"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, Mail, Phone, MapPin, Trash2, Edit, View, TrendingUp, MoreHorizontal, FileDown, PlusCircle, Users, AlertCircle, MailWarning } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/lib/i18n/locale-provider';
import type { Client } from '@/lib/types';
import { getClients, addClient, updateClient, deleteClient } from '@/actions/clients';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateClientsCsv } from '@/lib/csv-generator';
import { useSession } from "next-auth/react";

function ClientForm({ client, onSave, onCancel, isSaving }: { client?: Client | null, onSave: (client: Omit<Client, 'id' | 'avatarUrl' | 'userId' | 'createdAt'> & { id?: string }) => void, onCancel: () => void, isSaving: boolean }) {
    const { t } = useLocale();
    const [name, setName] = useState(client?.name || '');
    const [email, setEmail] = useState(client?.email || '');
    const [taxId, setTaxId] = useState(client?.taxId || '');
    const [address, setAddress] = useState(client?.address || '');
    const [country, setCountry] = useState(client?.country || '');
    const [phone, setPhone] = useState(client?.phone || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: client?.id, name, email, taxId, address, country, phone });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <DialogHeader className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        {client ? <Edit className="h-6 w-6 stroke-[2.5]" /> : <UserPlus className="h-6 w-6 stroke-[2.5]" />}
                    </div>
                    <div>
                        <DialogTitle className="text-3xl font-black font-headline tracking-tighter">
                            {client ? t('clients.editClient') : t('clients.addNewClient')}
                        </DialogTitle>
                        <DialogDescription className="font-medium italic opacity-70">
                            {client ? t('clients.editClientDescription') : t('clients.addNewClientDescription')}
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <div className="grid gap-8 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                            <Users className="h-3 w-3 text-primary" /> {t('clients.name')}
                        </Label>
                        <Input 
                            id="name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="Exoddus Inc." 
                            required 
                            disabled={isSaving} 
                            className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-primary/5 focus:border-primary/20 focus:bg-white transition-all shadow-sm font-bold text-lg px-6" 
                        />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                            <Mail className="h-3 w-3 text-primary" /> {t('clients.email')}
                        </Label>
                        <Input 
                            id="email" 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="hola@exoddus.es" 
                            required 
                            disabled={isSaving} 
                            className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-primary/5 focus:border-primary/20 focus:bg-white transition-all shadow-sm font-bold text-lg px-6" 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                            <Phone className="h-3 w-3 text-primary" /> Teléfono
                        </Label>
                        <Input 
                            id="phone" 
                            type="tel" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            placeholder="+34 600 000 000" 
                            disabled={isSaving} 
                            className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-primary/5 focus:border-primary/20 focus:bg-white transition-all shadow-sm font-bold text-lg px-6" 
                        />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="taxId" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                            <AlertCircle className="h-3 w-3 text-primary" /> CIF/NIF
                        </Label>
                        <Input 
                            id="taxId" 
                            value={taxId} 
                            onChange={(e) => setTaxId(e.target.value)} 
                            placeholder="ESB12345678" 
                            disabled={isSaving} 
                            className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-primary/5 focus:border-primary/20 focus:bg-white transition-all shadow-sm font-bold text-lg px-6" 
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                        <MapPin className="h-3 w-3 text-primary" /> Dirección Completa
                    </Label>
                    <Textarea 
                        id="address" 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        placeholder="Calle Principal 123, 28001 Madrid" 
                        disabled={isSaving} 
                        className="min-h-[120px] rounded-[1.5rem] bg-white dark:bg-slate-900 border-2 border-primary/5 focus:border-primary/20 focus:bg-white transition-all shadow-sm font-medium p-6 resize-none" 
                    />
                </div>
            </div>

            <DialogFooter className="pt-6 border-t border-primary/5 gap-4 flex flex-col sm:flex-row">
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={onCancel} 
                    disabled={isSaving} 
                    className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs px-8 hover:bg-muted"
                >
                    {t('common.cancel')}
                </Button>
                <Button 
                    type="submit" 
                    disabled={isSaving} 
                    className="h-14 rounded-2xl px-10 font-black shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white transition-all hover:scale-[1.02] active:scale-95"
                >
                    {isSaving ? (
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                            {t('common.save')}...
                        </div>
                    ) : (client ? "Sincronizar Cambios" : "Guardar Cliente")}
                </Button>
            </DialogFooter>
        </form>
    );
}

export default function ClientList() {
    const { t } = useLocale();
    const { data: session, status } = useSession();
    const user = session?.user;
    const [clients, setClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [dbLoading, setDbLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            if (user?.id) {
                setDbLoading(true);
                setDbError(null);
                try {
                    const userClients = await getClients(user.id);
                    setClients(userClients);
                } catch (e: any) {
                    console.error("Error fetching clients: ", e);
                    setDbError("Ha ocurrido un error al cargar los clientes.");
                } finally {
                    setDbLoading(false);
                }
            } else if (status !== 'loading') {
                setDbLoading(false);
            }
        };
        fetchClients();
    }, [user, status]);

    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, clients]);

    const handleSaveClient = async (clientData: Omit<Client, 'id' | 'avatarUrl' | 'userId' | 'createdAt'> & { id?: string }) => {
        if (!user?.id) {
            toast({ title: "Error", description: "Debes iniciar sesión para realizar esta acción.", variant: "destructive" });
            return;
        }
        
        setIsSaving(true);
        try {
            let result;
            if (clientData.id) {
                const { id, ...updatedClientData } = clientData;
                result = await updateClient(id, { ...updatedClientData, userId: user.id });
                if (result.success) {
                    setClients(clients.map(c => c.id === id ? { ...c, ...updatedClientData } as Client : c));
                    toast({ title: "Cliente Actualizado", description: "Los detalles del cliente han sido actualizados." });
                    handleCloseForm();
                } else {
                    toast({ title: "Error al actualizar", description: result.error, variant: "destructive" });
                }
            } else {
                const { id, ...newClientData } = clientData;
                const clientToAdd = {
                    ...newClientData,
                    userId: user.id,
                };
                result = await addClient(clientToAdd);
                if (result.success) {
                    setClients([...clients, result.data]);
                    toast({ title: "Cliente Añadido", description: "El nuevo cliente ha sido añadido correctamente." });
                    handleCloseForm();
                } else {
                    toast({ title: "Error al crear", description: result.error, variant: "destructive" });
                }
            }
        } catch (error) {
            console.error("Error saving client: ", error);
            toast({ title: "Error crítico", description: "Hubo un problema inesperado al guardar el cliente.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClient = async (clientId: string) => {
        try {
            const result = await deleteClient(clientId);
            if (result.success) {
                setClients(clients.filter(c => c.id !== clientId));
                toast({ title: "Cliente Eliminado", description: "El cliente ha sido eliminado correctamente." });
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch (error) {
            console.error("Error deleting client: ", error);
            toast({ title: "Error", description: "Hubo un problema al eliminar el cliente.", variant: "destructive" });
        }
    };
    
    const handleExportCsv = async () => {
        if (filteredClients.length === 0) {
            toast({ title: "No hay clientes", description: "No hay clientes para exportar.", variant: "destructive" });
            return;
        }
        setIsExporting(true);
        try {
            await generateClientsCsv(filteredClients);
        } catch (error) {
            console.error("Error exporting clients:", error);
            toast({ title: "Error", description: "Hubo un problema al exportar.", variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const handleOpenForm = (client: Client | null = null) => {
        setEditingClient(client);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingClient(null);
    };
    
    if (status === 'loading') return <div className="p-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

    if (!user) {
         return (
            <Alert variant="destructive" className="rounded-3xl border-none shadow-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-black uppercase tracking-widest text-xs">Acceso Denegado</AlertTitle>
                <AlertDescription className="font-bold">Debes iniciar sesión para ver esta página.</AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black font-headline tracking-tighter capitalize">{t('clients.allClients')}</h2>
                    <p className="text-muted-foreground font-medium italic">Gestiona tus relaciones comerciales y analiza tu volumen de ventas.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        disabled={isExporting} 
                        onClick={handleExportCsv}
                        className="h-12 rounded-2xl px-6 font-bold border-2 border-dashed border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-solid transition-all active:scale-95 shadow-sm group/export"
                    >
                        <FileDown className="mr-2 h-4 w-4 transition-transform group-hover/export:-translate-y-0.5" />
                        {isExporting ? "Generando..." : "Exportar CSV"}
                    </Button>

                    <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if(!isOpen) handleCloseForm(); else setIsFormOpen(true); }}>
                        <DialogTrigger asChild>
                            <Button onClick={() => handleOpenForm()} disabled={isSaving} className="h-12 rounded-2xl px-6 font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95">
                                <UserPlus className="mr-2 h-5 w-5 stroke-[2.5]" />
                                {t('clients.newClient')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl glass rounded-[2.5rem] border-white/10 shadow-3xl p-8" onInteractOutside={(e) => { if (isSaving || isFormOpen) e.preventDefault()}} onEscapeKeyDown={handleCloseForm}>
                            <ClientForm client={editingClient} onSave={handleSaveClient} onCancel={handleCloseForm} isSaving={isSaving} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="space-y-6">
                {/* Search Bar */}
                <Card className="glass-card border-none shadow-xl shadow-black/5 p-2 rounded-[2rem]">
                    <div className="relative group p-2">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder={t('clients.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-14 pl-14 rounded-2xl bg-muted/30 border-none group-focus-within:ring-2 ring-primary/10 transition-all font-bold text-lg"
                        />
                    </div>
                </Card>

                {dbError && (
                    <Alert variant="destructive" className="rounded-2xl border-none shadow-xl">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="font-black uppercase tracking-widest text-[10px]">Error de Conexión</AlertTitle>
                        <AlertDescription className="font-bold text-xs">{dbError}</AlertDescription>
                    </Alert>
                )}

                {/* Clients List */}
                <div className="grid gap-4">
                    <AnimatePresence>
                        {dbLoading ? (
                           <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-40">
                               <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                               <p className="text-xs font-black uppercase tracking-widest">Sincronizando con la nube...</p>
                           </div>
                        ) : (
                            filteredClients.map((client, idx) => (
                                <motion.div 
                                    key={client.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => handleOpenForm(client)}
                                    className="group relative bg-white dark:bg-slate-900 border border-border/40 hover:border-primary/40 rounded-[2rem] p-6 shadow-xl shadow-black/[0.02] hover:shadow-primary/5 transition-all cursor-pointer"
                                >
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="flex items-center gap-5">
                                            <Avatar className="h-16 w-16 ring-4 ring-muted shadow-lg">
                                                <AvatarImage src={client.avatarUrl} alt="Avatar" />
                                                <AvatarFallback className="bg-primary/10 text-primary font-black text-xl">{client.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-black font-headline tracking-tighter group-hover:text-primary transition-colors">{client.name}</h3>
                                                <div className="flex flex-wrap items-center gap-4 text-muted-foreground font-medium text-xs italic">
                                                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email}</span>
                                                    {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>}
                                                    {client.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {client.address?.split(',')[0]}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-8 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-primary/10 group/dots transition-all">
                                                            <MoreHorizontal className="h-5 w-5 text-muted-foreground group-hover/dots:text-primary transition-colors" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="glass rounded-2xl border-white/10 shadow-2xl p-1 w-48">
                                                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest px-3 py-2 opacity-50">{t('common.actions')}</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleOpenForm(client)} className="rounded-xl p-3 gap-3 font-bold text-xs focus:bg-primary/5 cursor-pointer">
                                                            <Edit className="h-4 w-4" /> {t('common.edit')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleOpenForm(client)} className="rounded-xl p-3 gap-3 font-bold text-xs focus:bg-primary/5 cursor-pointer">
                                                            <View className="h-4 w-4" /> Ver Ficha
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-border/50" />
                                                        <DropdownMenuItem onClick={() => handleDeleteClient(client.id)} className="rounded-xl p-3 gap-3 font-bold text-xs text-destructive focus:bg-destructive/5 cursor-pointer">
                                                            <Trash2 className="h-4 w-4" /> {t('common.delete')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                        {!dbLoading && !dbError && filteredClients.length === 0 && (
                            <div className="text-center py-20 bg-muted/20 rounded-[3rem] border-2 border-dashed border-muted">
                                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">{t('clients.noClients')}</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
