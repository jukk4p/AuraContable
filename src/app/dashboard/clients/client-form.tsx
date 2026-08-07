"use client"

import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Mail, Phone, AlertCircle, Globe, MapPin, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/lib/i18n/locale-provider';
import type { Client } from '@/lib/types';
import { addClient, updateClient } from '@/actions/clients';
import { toast } from '@/hooks/use-toast';

const clientFormSchema = z.object({
    name: z.string().min(1, "El nombre del cliente o razón social es obligatorio"),
    email: z.string().email("Email inválido").min(1, "El email es obligatorio"),
    taxId: z.string().min(1, "El CIF/NIF es obligatorio"),
    phone: z.string().optional().default(""),
    address: z.string().optional().default(""),
    country: z.string().optional().default(""),
    notes: z.string().optional().default(""),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
    client?: Client | null;
    userId: string;
}

export default function ClientForm({ client, userId }: ClientFormProps) {
    const { t } = useLocale();
    const router = useRouter();
    const isEditing = !!client;
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientFormSchema),
        defaultValues: {
            name: client?.name || '',
            email: client?.email || '',
            taxId: client?.taxId || '',
            phone: client?.phone || '',
            address: client?.address || '',
            country: client?.country || '',
            notes: client?.notes || '',
        }
    });

    const onSubmit = async (values: ClientFormValues) => {
        setIsSaving(true);
        try {
            let result;
            if (isEditing && client) {
                result = await updateClient(client.id, { ...values, userId });
                if (result.success) {
                    toast({ title: "Cliente Actualizado", description: "Los detalles del cliente han sido actualizados." });
                    router.push('/dashboard/clients');
                } else {
                    toast({ title: "Error al actualizar", description: result.error, variant: "destructive" });
                }
            } else {
                result = await addClient(values);
                if (result.success) {
                    toast({ title: "Cliente Añadido", description: "El nuevo cliente ha sido añadido correctamente." });
                    router.push('/dashboard/clients');
                } else {
                    toast({ title: "Error al crear", description: result.error, variant: "destructive" });
                }
            }
        } catch (error) {
            console.error("Error saving client: ", error);
            toast({ title: "Error crítico", description: "Hubo un problema al guardar el cliente.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
            {/* Back header */}
            <div className="flex items-center gap-3">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => router.push('/dashboard/clients')} 
                    className="h-10 w-10 rounded-xl hover:bg-muted"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-black font-headline tracking-tighter">
                        {isEditing ? "Editar Cliente" : "Crear Nuevo Cliente"}
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium italic">
                        {isEditing ? "Modifica la información comercial del cliente." : "Introduce los datos de facturación de tu nuevo cliente."}
                    </p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Card className="glass-card border border-border/40 shadow-2xl rounded-[2rem] overflow-hidden p-8">
                        <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                            <Users className="h-3.5 w-3.5 text-primary" /> Nombre Comercial / Razón Social
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Exoddus Inc." 
                                                disabled={isSaving} 
                                                className="h-12 rounded-xl bg-muted/20 border-none focus:ring-2 ring-primary/10 transition-all font-semibold text-sm px-4" 
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                            <Mail className="h-3.5 w-3.5 text-primary" /> Correo Electrónico
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="email" 
                                                placeholder="contacto@empresa.com" 
                                                disabled={isSaving} 
                                                className="h-12 rounded-xl bg-muted/20 border-none focus:ring-2 ring-primary/10 transition-all font-semibold text-sm px-4" 
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                            <Phone className="h-3.5 w-3.5 text-primary" /> Teléfono de Contacto
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="+34 600 000 000" 
                                                disabled={isSaving} 
                                                className="h-12 rounded-xl bg-muted/20 border-none focus:ring-2 ring-primary/10 transition-all font-semibold text-sm px-4" 
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="taxId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                            <AlertCircle className="h-3.5 w-3.5 text-primary" /> CIF / NIF / Identificación Fiscal
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="ESB12345678" 
                                                disabled={isSaving} 
                                                className="h-12 rounded-xl bg-muted/20 border-none focus:ring-2 ring-primary/10 transition-all font-semibold text-sm px-4" 
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="country"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                            <Globe className="h-3.5 w-3.5 text-primary" /> País
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="España" 
                                                disabled={isSaving} 
                                                className="h-12 rounded-xl bg-muted/20 border-none focus:ring-2 ring-primary/10 transition-all font-semibold text-sm px-4" 
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                            <MapPin className="h-3.5 w-3.5 text-primary" /> Dirección de Facturación
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Calle Principal 123, 2B" 
                                                disabled={isSaving} 
                                                className="h-12 rounded-xl bg-muted/20 border-none focus:ring-2 ring-primary/10 transition-all font-semibold text-sm px-4" 
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem className="space-y-2 md:col-span-2">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                            <FileText className="h-3.5 w-3.5 text-primary" /> Notas Internas u Observaciones
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Información adicional relevante sobre este cliente..." 
                                                disabled={isSaving} 
                                                className="min-h-[100px] rounded-xl bg-muted/20 border-none focus:ring-2 ring-primary/10 transition-all font-semibold text-sm p-4 resize-none" 
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => router.push('/dashboard/clients')} 
                            disabled={isSaving}
                            className="h-12 rounded-xl px-6 font-bold"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isSaving}
                            className="h-12 rounded-xl px-8 font-black bg-primary hover:bg-primary/95 text-white transition-all shadow-md active:scale-95"
                        >
                            {isSaving ? "Guardando..." : "Guardar Cliente"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
