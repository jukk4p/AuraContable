
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { MoreHorizontal, PlusCircle, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/lib/i18n/locale-provider';
import type { Client } from '@/lib/types';
import { auth } from '@/lib/firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getClients, addClient, updateClient, deleteClient } from '@/lib/firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, MailWarning } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { generateClientsCsv } from '@/lib/csv-generator';

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
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{client ? t('clients.editClient') : t('clients.addNewClient')}</DialogTitle>
                <DialogDescription>
                    {client ? t('clients.editClientDescription') : t('clients.addNewClientDescription')}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">{t('clients.name')}</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." required disabled={isSaving}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">{t('clients.email')}</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@acme.com" required disabled={isSaving}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34 600 000 000" disabled={isSaving}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="taxId">{t('settings.company.taxId')}</Label>
                    <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="ESB12345678" disabled={isSaving}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="address">{t('settings.company.address')}</Label>
                    <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Anytown" disabled={isSaving}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="España" disabled={isSaving}/>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? t('common.save') + "..." : t('common.save')}</Button>
            </DialogFooter>
        </form>
    );
}

export default function ClientList() {
    const { t } = useLocale();
    const [user, authLoading, authError] = useAuthState(auth);
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
            if (user && user.emailVerified) {
                setDbLoading(true);
                setDbError(null);
                try {
                    const userClients = await getClients(user.uid);
                    setClients(userClients);
                } catch (e: any) {
                    console.error("Error fetching clients: ", e);
                    if (e.code === 'failed-precondition' || (e.message && e.message.includes("requires an index"))) {
                        setDbError("La base de datos de Firestore necesita un índice. Por favor, créalo desde la consola de Firebase. El error te proporcionará un enlace para crearlo con un solo clic.");
                    } else if (e.message && e.message.includes("permission-denied")) {
                         setDbError("Permiso denegado. Revisa las reglas de seguridad de Firestore.");
                    } else {
                        setDbError("Ha ocurrido un error al cargar los clientes.");
                    }
                } finally {
                    setDbLoading(false);
                }
            } else if (!authLoading) {
                setDbLoading(false);
            }
        };
        fetchClients();
    }, [user, authLoading]);

    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, clients]);

    const handleSaveClient = async (clientData: Omit<Client, 'id' | 'avatarUrl' | 'userId' | 'createdAt'> & { id?: string }) => {
        if (!user || !user.emailVerified) {
            toast({ title: "Error", description: "Debes iniciar sesión y verificar tu correo para realizar esta acción.", variant: "destructive" });
            return;
        }
        
        setIsSaving(true);
        try {
            if (clientData.id) {
                // Edit existing client
                const { id, ...updatedClientData } = clientData;
                await updateClient(id, updatedClientData);
                setClients(clients.map(c => c.id === id ? { ...c, ...updatedClientData } as Client : c));
                toast({ title: "Cliente Actualizado", description: "Los detalles del cliente han sido actualizados." });
            } else {
                // Add new client
                const { id, ...newClientData } = clientData; // remove id from the object
                const clientToAdd = {
                    ...newClientData,
                    avatarUrl: `https://placehold.co/40x40?text=${newClientData.name.charAt(0)}`,
                    userId: user.uid,
                };
                const newClient = await addClient(clientToAdd);
                setClients([...clients, newClient]);
                toast({ title: "Cliente Añadido", description: "El nuevo cliente ha sido añadido." });
            }
            handleCloseForm();
        } catch (error) {
            console.error("Error saving client: ", error);
            toast({ title: "Error", description: "Hubo un problema al guardar el cliente.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClient = async (clientId: string) => {
        try {
            await deleteClient(clientId);
            setClients(clients.filter(c => c.id !== clientId));
            toast({ title: "Cliente Eliminado", description: "El cliente ha sido eliminado." });
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
            console.error("Error exporting clients to CSV:", error);
            toast({ title: "Error", description: "Hubo un problema al exportar los clientes.", variant: "destructive" });
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
    
    if (authLoading) {
        return <p>Cargando...</p>
    }

    if (authError) {
        return <p>Error de autenticación: {authError.message}</p>
    }

    if (!user) {
         return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Acceso Denegado</AlertTitle>
                <AlertDescription>Debes iniciar sesión para ver esta página.</AlertDescription>
            </Alert>
        )
    }

    if (!user.emailVerified) {
        return (
            <Alert variant="destructive">
                <MailWarning className="h-4 w-4" />
                <AlertTitle>Verifica tu correo electrónico</AlertTitle>
                <AlertDescription>
                    Hemos enviado un correo de verificación a tu dirección. Por favor, revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta y poder continuar.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <CardTitle>{t('clients.allClients')}</CardTitle>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder={t('clients.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-64"
                        />
                        <Button variant="outline" disabled={isExporting} onClick={handleExportCsv}>
                            <FileDown className="w-4 h-4 mr-2" />
                            {isExporting ? "Exportando..." : "Exportar a CSV"}
                        </Button>

                        <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if(!isOpen) handleCloseForm(); else setIsFormOpen(true); }}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenForm()} disabled={isSaving}>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    {t('clients.newClient')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (isSaving || isFormOpen) e.preventDefault()}} onEscapeKeyDown={handleCloseForm}>
                                <ClientForm client={editingClient} onSave={handleSaveClient} onCancel={handleCloseForm} isSaving={isSaving} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {dbLoading && <p>Cargando clientes...</p>}
                {dbError && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error de Conexión</AlertTitle>
                        <AlertDescription>{dbError}</AlertDescription>
                    </Alert>
                )}
                {!dbLoading && !dbError && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('clients.name')}</TableHead>
                                <TableHead>{t('clients.email')}</TableHead>
                                <TableHead>
                                    <span className="sr-only">{t('common.actions')}</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredClients.map((client) => (
                                <TableRow key={client.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="hidden h-9 w-9 sm:flex">
                                                <AvatarImage src={client.avatarUrl} alt="Avatar" data-ai-hint="person avatar"/>
                                                <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="font-medium">{client.name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{client.email}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">{t('common.toggleMenu')}</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleOpenForm(client)}>{t('common.edit')}</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteClient(client.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">{t('common.delete')}</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                 {!dbError && !dbLoading && filteredClients.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">{t('clients.noClients')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    
