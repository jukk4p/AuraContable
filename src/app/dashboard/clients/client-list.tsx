"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Mail, Phone, MapPin, Trash2, Edit, View, MoreHorizontal, FileDown, AlertCircle, Users, CheckCircle2 } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-provider';
import type { Client } from '@/lib/types';
import { getClients, deleteClient } from '@/actions/clients';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateClientsCsv } from '@/lib/csv-generator';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

function StatCard({ title, value, trend, icon }: { title: string, value: string, trend: string, icon?: React.ReactNode }) {
    return (
        <Card className="p-4 rounded-xl border border-border shadow-sm flex flex-col gap-3 bg-card hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
                {icon}
            </div>
            <div className="flex justify-between items-end">
                <h3 className="text-2xl font-semibold tracking-tight">{value}</h3>
                <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{trend}</span>
            </div>
        </Card>
    );
}

export default function ClientList() {
    const { t } = useLocale();
    const { data: session, status } = useSession();
    const user = session?.user;
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dbLoading, setDbLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const userId = user?.id;

    useEffect(() => {
        const fetchClients = async () => {
            if (userId) {
                setDbLoading(true);
                setDbError(null);
                try {
                    const userClients = await getClients();
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
    }, [userId, status]);

    const stats = useMemo(() => {
        const total = clients.length;
        const now = new Date();
        const nuevos = clients.filter(c => {
            if (!c.createdAt) return false;
            const diffTime = Math.abs(now.getTime() - new Date(c.createdAt).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30;
        }).length;
        const conCIF = clients.filter(c => !!c.taxId).length;
        return { total, nuevos, conCIF };
    }, [clients]);

    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, clients]);

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

    if (status === 'loading') return <div className="p-10 text-center text-sm text-muted-foreground">Cargando...</div>;

    if (!user) {
         return (
            <Alert variant="destructive" className="rounded-md border-danger text-danger">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-medium text-xs">Acceso Denegado</AlertTitle>
                <AlertDescription className="text-sm">Debes iniciar sesión para ver esta página.</AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">{t('clients.allClients')}</h2>
                    <p className="text-sm text-muted-foreground">Gestiona tu cartera de clientes corporativos y particulares.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        disabled={isExporting} 
                        onClick={handleExportCsv}
                        size="sm" className="h-9"
                    >
                        <FileDown className="mr-2 h-4 w-4" />
                        {isExporting ? "Generando..." : "Exportar CSV"}
                    </Button>

                    <Button onClick={() => router.push('/dashboard/clients/new')} size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                        <UserPlus className="mr-2 h-4 w-4" />
                        {t('clients.newClient')}
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Clientes" value={stats.total.toString()} trend="Cartera" icon={<Users className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Nuevos (Mes)" value={stats.nuevos.toString()} trend="Crecimiento" icon={<UserPlus className="h-4 w-4 text-muted-foreground" />} />
                <StatCard title="Con CIF/NIF" value={stats.conCIF.toString()} trend="Validados" icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} />
            </div>

            {/* Filters Row */}
            <Card className="rounded-xl border border-border shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-card">
                <div className="relative flex-1 w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder={t('clients.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 pl-9 rounded-md text-sm transition-all"
                    />
                </div>
            </Card>

            {dbError && (
                <Alert variant="destructive" className="rounded-md border-danger text-danger">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-medium text-xs">Error</AlertTitle>
                    <AlertDescription className="text-sm">{dbError}</AlertDescription>
                </Alert>
            )}

            {/* Clients Table */}
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-medium">Cliente</th>
                                <th className="px-4 py-3 font-medium">Contacto</th>
                                <th className="px-4 py-3 font-medium">Dirección</th>
                                <th className="px-4 py-3 font-medium text-center">Score Pago</th>
                                <th className="px-4 py-3 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {dbLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">Cargando clientes...</td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">{t('clients.noClients')}</td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => {
                                    // Mock score computation based on ID to be deterministic but varied
                                    const scoreValue = client.id.charCodeAt(0) % 3;
                                    const scoreLabel = scoreValue === 0 ? "Excelente" : scoreValue === 1 ? "Bueno" : "Regular";
                                    const scoreVariant = scoreValue === 0 ? "success" : scoreValue === 1 ? "primary" : "warning";

                                    return (
                                    <tr key={client.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 rounded-md">
                                                    <AvatarImage src={client.avatarUrl} alt="Avatar" />
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium rounded-md">{client.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">{client.name}</span>
                                                    <span className="text-xs text-muted-foreground">{client.taxId || 'Sin CIF'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email}</span>
                                                {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">
                                            {client.address ? (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {client.address.split(',')[0]}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge variant="secondary" className={`text-[10px] uppercase font-medium px-2 py-0 border-transparent shadow-none h-5 inline-flex items-center
                                                ${scoreVariant === 'success' ? 'bg-success/10 text-success' : 
                                                  scoreVariant === 'primary' ? 'bg-primary/10 text-primary' : 
                                                  'bg-warning/10 text-warning'}`}>
                                                {scoreLabel}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}>
                                                    <View className="h-4 w-4" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40 rounded-md p-1">
                                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)} className="text-xs cursor-pointer rounded-sm">
                                                            <Edit className="h-4 w-4 mr-2" /> {t('common.edit')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeleteClient(client.id)} className="text-xs text-danger focus:bg-danger/10 focus:text-danger cursor-pointer rounded-sm">
                                                            <Trash2 className="h-4 w-4 mr-2" /> {t('common.delete')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
