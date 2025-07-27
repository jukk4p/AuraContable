
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { AlertCircle } from 'lucide-react';

function ClientForm({ client, onSave, onCancel, isSaving }: { client?: Client | null, onSave: (client: Omit<Client, 'id' | 'avatarUrl' | 'userId'> & { id?: string }) => void, onCancel: () => void, isSaving: boolean }) {
    const { t } = useLocale();
    const [name, setName] = useState(client?.name || '');
    const [email, setEmail] = useState(client?.email || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: client?.id, name, email });
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
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                        {t('clients.name')}
                    </Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                        {t('clients.email')}
                    </Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@acme.com" className="col-span-3" required />
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


    useEffect(() => {
        const fetchClients = async () => {
            if (user) {
                setDbLoading(true);
                setDbError(null);
                try {
                    const userClients = await getClients(user.uid);
                    setClients(userClients);
                } catch (e: any) {
                    console.error("Error fetching clients: ", e);
                    if(e.code === 'failed-precondition') {
                        setDbError("La base de datos de Firestore no está creada o configurada. Por favor, créala desde la consola de Firebase.");
                    } else if (e.message.includes("permission-denied")) {
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

    const handleSaveClient = async (clientData: Omit<Client, 'id' | 'avatarUrl' | 'userId'> & { id?: string }) => {
        if (!user) {
            toast({ title: "Error", description: "Debes iniciar sesión para realizar esta acción.", variant: "destructive" });
            return;
        }
        
        setIsSaving(true);
        try {
            if (clientData.id) {
                // Edit existing client
                const updatedClient = { name: clientData.name, email: clientData.email };
                await updateClient(clientData.id, updatedClient);
                setClients(clients.map(c => c.id === clientData.id ? { ...c, ...updatedClient } : c));
                toast({ title: "Cliente Actualizado", description: "Los detalles del cliente han sido actualizados." });
            } else {
                // Add new client
                const newClientData = {
                    name: clientData.name,
                    email: clientData.email,
                    avatarUrl: `https://placehold.co/40x40?text=${clientData.name.charAt(0)}`,
                    userId: user.uid,
                };
                const newClient = await addClient(newClientData);
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

    const handleOpenForm = (client: Client | null = null) => {
        setEditingClient(client);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingClient(null);
    };
    
    if (authLoading || dbLoading) {
        return <p>Cargando clientes...</p>
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
                        <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if(!isOpen) handleCloseForm(); else setIsFormOpen(true); }}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenForm()}>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    {t('clients.newClient')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => { if (isFormOpen) e.preventDefault()}} onEscapeKeyDown={handleCloseForm}>
                                <ClientForm client={editingClient} onSave={handleSaveClient} onCancel={handleCloseForm} isSaving={isSaving} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {dbError && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error de Conexión</AlertTitle>
                        <AlertDescription>{dbError}</AlertDescription>
                    </Alert>
                )}
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
                 {!dbError && filteredClients.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">{t('clients.noClients')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    