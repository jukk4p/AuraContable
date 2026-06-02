"use client"

import React, { useEffect, useMemo, useState } from 'react';
import { 
    Search, Plus, FileText, Download, 
    Trash2, FolderOpen, AlertCircle, Image as ImageIcon,
    Receipt, ExternalLink, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from "next-auth/react";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

import { getExpenses, updateExpense } from '@/actions/expenses';
import {
    getReceiptMeta,
    formatReceiptSize,
    buildReceiptFilename,
    type ReceiptMeta,
} from '@/lib/receipt-utils';

interface ReceiptDocument {
    expenseId: string;
    provider: string;
    category: string;
    date: Date;
    amount: number;
    dataUrl: string;
    meta: ReceiptMeta;
}

export default function DocumentsPage() {
    const { data: session, status } = useSession();
    const user = session?.user;
    
    const [documents, setDocuments] = useState<ReceiptDocument[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dbLoading, setDbLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);
    const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocuments = async () => {
            if (!user?.id) {
                if (status !== 'loading') setDbLoading(false);
                return;
            }
            setDbLoading(true);
            setDbError(null);
            try {
                const expenses = await getExpenses(user.id);
                const docs: ReceiptDocument[] = expenses
                    .filter((e: any) => e.receiptUrl)
                    .map((e: any) => {
                        const meta = getReceiptMeta(e.receiptUrl);
                        if (!meta) return null;
                        return {
                            expenseId: e.id,
                            provider: e.provider,
                            category: e.category,
                            date: new Date(e.date),
                            amount: (e.amount || 0) * (e.quantity || 1),
                            dataUrl: e.receiptUrl,
                            meta,
                        };
                    })
                    .filter((d: ReceiptDocument | null): d is ReceiptDocument => d !== null);
                setDocuments(docs);
            } catch (e) {
                console.error(e);
                setDbError("No se pudieron cargar los documentos adjuntos a tus gastos.");
            } finally {
                setDbLoading(false);
            }
        };
        fetchDocuments();
    }, [user, status]);

    const filteredDocs = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return documents;
        return documents.filter(doc =>
            doc.provider.toLowerCase().includes(term) ||
            doc.category.toLowerCase().includes(term) ||
            doc.meta.extension.toLowerCase().includes(term)
        );
    }, [documents, searchTerm]);

    const handleDownload = (doc: ReceiptDocument) => {
        const filename = buildReceiptFilename(doc.provider, doc.date, doc.meta.extension);
        const link = document.createElement('a');
        link.href = doc.dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRemove = async (doc: ReceiptDocument) => {
        if (pendingRemoveId) return;
        const confirmed = window.confirm(
            `¿Quitar la factura de "${doc.provider}"? El gasto seguirá registrado, solo se desvinculará el archivo.`
        );
        if (!confirmed) return;
        setPendingRemoveId(doc.expenseId);
        try {
            await updateExpense(doc.expenseId, { receiptUrl: '' });
            setDocuments(prev => prev.filter(d => d.expenseId !== doc.expenseId));
            toast({ title: "Factura desvinculada", description: "El archivo se quitó del gasto, pero el registro se mantiene." });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "No se pudo quitar la factura.", variant: "destructive" });
        } finally {
            setPendingRemoveId(null);
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
                    <h2 className="text-2xl font-semibold tracking-tight">Documentos</h2>
                    <p className="text-sm text-muted-foreground">
                        Facturas y recibos adjuntos a tus gastos. Se suben al registrar un gasto.
                    </p>
                </div>
                <Button asChild size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                    <Link href="/dashboard/expenses/new">
                        <Plus className="mr-2 h-4 w-4" /> Subir en un nuevo gasto
                    </Link>
                </Button>
            </div>

            {/* Filters */}
            <Card className="rounded-xl border border-border shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-card">
                <div className="relative flex-1 w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar por proveedor, categoría o tipo..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 pl-9 rounded-md text-sm transition-all"
                    />
                </div>
                <div className="text-xs text-muted-foreground">
                    {dbLoading ? 'Cargando…' : `${documents.length} documento${documents.length === 1 ? '' : 's'}`}
                </div>
            </Card>

            {dbError && (
                <Alert variant="destructive" className="rounded-md border-danger text-danger">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-medium text-xs">Error</AlertTitle>
                    <AlertDescription className="text-sm">{dbError}</AlertDescription>
                </Alert>
            )}

            {/* Documents List */}
            {dbLoading ? (
                <div className="text-center py-20 border border-border rounded-xl bg-card">
                    <Loader2 className="h-6 w-6 text-muted-foreground mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-muted-foreground">Cargando documentos…</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card">
                    <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                        {documents.length === 0
                            ? 'No tienes documentos guardados.'
                            : 'Ningún documento coincide con tu búsqueda.'}
                    </p>
                    {documents.length === 0 && (
                        <>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Adjunta un PDF o imagen al registrar un gasto y aparecerá aquí.
                            </p>
                            <Button asChild size="sm" variant="outline" className="mt-4 h-9">
                                <Link href="/dashboard/expenses/new">
                                    <Receipt className="mr-2 h-4 w-4" /> Registrar un gasto con factura
                                </Link>
                            </Button>
                        </>
                    )}
                </div>
            ) : (
                <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Documento</th>
                                    <th className="px-4 py-3 font-medium">Proveedor</th>
                                    <th className="px-4 py-3 font-medium">Categoría</th>
                                    <th className="px-4 py-3 font-medium">Fecha</th>
                                    <th className="px-4 py-3 font-medium text-right">Tamaño</th>
                                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredDocs.map((doc) => {
                                    const isImage = doc.meta.kind === 'image';
                                    const filename = buildReceiptFilename(doc.provider, doc.date, doc.meta.extension);
                                    return (
                                        <tr key={doc.expenseId} className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-4 py-3 font-medium text-foreground">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                        isImage ? 'bg-primary/10 text-primary' : 'bg-danger/10 text-danger'
                                                    }`}>
                                                        {isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => window.open(doc.dataUrl, '_blank')}
                                                            className="block text-sm font-medium text-foreground hover:text-primary truncate text-left"
                                                            title={filename}
                                                        >
                                                            {filename}
                                                        </button>
                                                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                                                            {isImage ? 'Imagen' : 'PDF'} · .{doc.meta.extension}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-foreground font-medium">
                                                {doc.provider}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="text-[10px] uppercase font-medium border-border/50 rounded-md">
                                                    {doc.category}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">
                                                {format(doc.date, "dd MMM yyyy", { locale: es })}
                                            </td>
                                            <td className="px-4 py-3 text-right text-muted-foreground text-xs font-medium">
                                                {formatReceiptSize(doc.meta.sizeBytes)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        onClick={() => window.open(doc.dataUrl, '_blank')}
                                                        title="Ver"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleDownload(doc)}
                                                        title="Descargar"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-danger hover:bg-danger/10 hover:text-danger"
                                                        onClick={() => handleRemove(doc)}
                                                        disabled={pendingRemoveId === doc.expenseId}
                                                        title="Quitar factura"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
