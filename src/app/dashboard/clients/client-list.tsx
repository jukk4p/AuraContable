"use client"

import React, { useState, useMemo } from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockClients } from '@/lib/data';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/lib/i18n/locale-provider';

export default function ClientList() {
    const { t } = useLocale();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClients = useMemo(() => {
        let clients = [...mockClients];
        if (searchTerm) {
            clients = clients.filter(client =>
                client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return clients;
    }, [searchTerm]);

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
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    {t('clients.newClient')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                <DialogTitle>{t('clients.addNewClient')}</DialogTitle>
                                <DialogDescription>
                                    {t('clients.addNewClientDescription')}
                                </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                    {t('clients.name')}
                                    </Label>
                                    <Input id="name" placeholder="Acme Inc." className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="email" className="text-right">
                                    {t('clients.email')}
                                    </Label>
                                    <Input id="email" type="email" placeholder="contact@acme.com" className="col-span-3" />
                                </div>
                                </div>
                                <DialogFooter>
                                <Button type="submit">{t('common.save')}</Button>
                                </DialogFooter>
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
                                            <DropdownMenuItem>{t('common.edit')}</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">{t('common.delete')}</DropdownMenuItem>
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
