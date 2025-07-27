"use client"

import React, { useState, useMemo } from 'react';
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

// Initial dummy data. This will be replaced by Firestore data.
const initialClients: Client[] = [
  { id: '1', name: 'Acme Inc.', email: 'contact@acme.com', avatarUrl: 'https://placehold.co/40x40' },
  { id: '2', name: 'Stark Industries', email: 'tony@starkindustries.com', avatarUrl: 'https://placehold.co/40x40' },
  { id: '3', name: 'Wayne Enterprises', email: 'bruce@wayne.com', avatarUrl: 'https://placehold.co/40x40' },
];

function ClientForm({ client, onSave, onCancel }: { client?: Client | null, onSave: (client: Omit<Client, 'id' | 'avatarUrl'> & { id?: string }) => void, onCancel: () => void }) {
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
                <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button type="submit">{t('common.save')}</Button>
            </DialogFooter>
        </form>
    );
}

export default function ClientList() {
    const { t } = useLocale();
    const [clients, setClients] = useState<Client[]>(initialClients);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, clients]);

    const handleSaveClient = (clientData: Omit<Client, 'id' | 'avatarUrl'> & { id?: string }) => {
        if (clientData.id) {
            // Edit existing client
            setClients(clients.map(c => c.id === clientData.id ? { ...c, name: clientData.name, email: clientData.email } : c));
        } else {
            // Add new client
            const newClient: Client = {
                id: (clients.length + 1).toString(),
                ...clientData,
                avatarUrl: `https://placehold.co/40x40?text=${clientData.name.charAt(0)}`
            };
            setClients([...clients, newClient]);
        }
        setIsFormOpen(false);
        setEditingClient(null);
    };

    const handleDeleteClient = (clientId: string) => {
        setClients(clients.filter(c => c.id !== clientId));
    };

    const handleOpenForm = (client: Client | null = null) => {
        setEditingClient(client);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingClient(null);
    };

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
                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenForm()}>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    {t('clients.newClient')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={handleCloseForm}>
                                <ClientForm client={editingClient} onSave={handleSaveClient} onCancel={handleCloseForm} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
        </Card>
    );
}