
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { es } from "date-fns/locale"
import { useLocale } from "@/lib/i18n/locale-provider"
import { Client, InvoiceStatus, InvoiceTax } from "@/lib/types"
import React, { useState, useEffect, useCallback } from 'react'
import { auth } from "@/lib/firebase/config"
import { useAuthState } from "react-firebase-hooks/auth"
import { getClients, addInvoice, getInvoices, getCompanyProfile, getInvoiceById, updateInvoice } from "@/lib/firebase/firestore"
import { useRouter, useParams } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const invoiceFormSchema = z.object({
    invoiceNumber: z.string().min(1, "El número de factura es obligatorio"),
    clientId: z.string().min(1, "El cliente es obligatorio"),
    issueDate: z.date({required_error: "La fecha de emisión es obligatoria"}),
    dueDate: z.date({required_error: "La fecha de vencimiento es obligatoria"}),
    status: z.enum(["Pending", "Paid", "Overdue"], {required_error: "El estado es obligatorio"}),
    items: z.array(z.object({
        description: z.string().min(1, "La descripción es obligatoria"),
        quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1"),
        price: z.coerce.number().min(0, "El precio no puede ser negativo"),
    })).min(1, "Se requiere al menos un concepto"),
    taxes: z.array(z.object({
        id: z.string(),
        name: z.string(),
        percentage: z.coerce.number(),
    })).optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
})

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

const PRESET_TAXES = {
  es: [
    { id: 'es-iva-21', name: 'IVA', percentage: 21 },
    { id: 'es-iva-10', name: 'IVA Reducido', percentage: 10 },
    { id: 'es-irpf-15', name: 'IRPF', percentage: -15 },
    { id: 'es-irpf-7', name: 'IRPF (Nuevos autónomos)', percentage: -7 },
  ],
  it: [
    { id: 'it-iva-22', name: 'IVA', percentage: 22 },
  ],
  fr: [
    { id: 'fr-tva-20', name: 'TVA', percentage: 20 },
  ],
  gb: [
    { id: 'gb-vat-20', name: 'VAT', percentage: 20 },
  ]
};

export default function NewInvoicePage() {
    const { t, formatCurrency, locale: currentLocale } = useLocale();
    const { toast } = useToast()
    const router = useRouter();
    const params = useParams();
    const invoiceId = params.id as string | undefined;
    const isEditing = !!invoiceId;

    const [user] = useAuthState(auth);
    const [clients, setClients] = useState<Client[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const form = useForm<InvoiceFormValues>({
        resolver: zodResolver(invoiceFormSchema),
        defaultValues: {
            invoiceNumber: "",
            status: "Pending",
            items: [{ description: "", quantity: 1, price: 0 }],
            taxes: [],
            notes: "",
            terms: "",
        },
    })
    
    useEffect(() => {
        const fetchData = async () => {
            if(user) {
                setIsLoading(true);
                try {
                    if (isEditing) {
                        const [invoiceData, userClients] = await Promise.all([
                            getInvoiceById(invoiceId),
                            getClients(user.uid),
                        ]);
                        setClients(userClients);
                        if (invoiceData) {
                            form.reset({
                                ...invoiceData,
                                clientId: invoiceData.clientId,
                            });
                        } else {
                            toast({ title: "Error", description: "Factura no encontrada.", variant: "destructive" });
                            router.push('/dashboard/invoices');
                        }
                    } else {
                        const [userClients, userInvoices, companyProfile] = await Promise.all([
                            getClients(user.uid),
                            getInvoices(user.uid),
                            getCompanyProfile(user.uid)
                        ]);
                        
                        setClients(userClients);

                        const currentYear = new Date().getFullYear();
                        const yearPrefix = `FAC-${currentYear}-`;
                        
                        const invoicesThisYear = userInvoices.filter(inv => inv.invoiceNumber.startsWith(yearPrefix));
                        
                        let nextInvoiceNumber = 1;
                        if (invoicesThisYear.length > 0) {
                            const invoiceNumbers = invoicesThisYear.map(inv => {
                                const parts = inv.invoiceNumber.split('-');
                                return parseInt(parts[parts.length - 1], 10);
                            });
                            const maxNumber = Math.max(...invoiceNumbers);
                            nextInvoiceNumber = maxNumber + 1;
                        }

                        const newInvoiceNumber = `${yearPrefix}${String(nextInvoiceNumber).padStart(3, '0')}`;
                        
                        form.reset({
                            ...form.getValues(),
                            invoiceNumber: newInvoiceNumber,
                            terms: companyProfile?.terms || "",
                            taxes: companyProfile?.defaultTaxes || [],
                        });
                    }
                } catch (error) {
                    console.error("Error fetching initial data:", error);
                    toast({ title: "Error", description: "No se pudieron cargar los datos iniciales.", variant: "destructive" });
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [user, isEditing, invoiceId, form, toast, router]);


    const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
        control: form.control,
        name: "items"
    });

    const { fields: taxFields, append: appendTax, remove: removeTax } = useFieldArray({
        control: form.control,
        name: "taxes"
    });

    const watchedItems = form.watch("items");
    const watchedTaxes = form.watch("taxes");

    const calculateTotals = useCallback(() => {
        const subtotal = watchedItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0)), 0);
        
        const taxAmounts = (watchedTaxes || []).map(tax => ({
            ...tax,
            amount: subtotal * (tax.percentage / 100)
        }));

        const totalTaxAmount = taxAmounts.reduce((acc, tax) => acc + tax.amount, 0);

        const total = subtotal + totalTaxAmount;

        return { subtotal, taxAmounts, total };
    }, [watchedItems, watchedTaxes]);

    const { subtotal, taxAmounts, total } = calculateTotals();

    async function onSubmit(data: InvoiceFormValues) {
        if (!user) {
            toast({ title: "Error", description: "Debes iniciar sesión para crear una factura.", variant: "destructive" });
            return;
        }
        
        setIsSubmitting(true);

        const selectedClient = clients.find(c => c.id === data.clientId);
        if (!selectedClient) {
             toast({ title: "Error", description: "Cliente no válido.", variant: "destructive" });
             setIsSubmitting(false);
             return;
        }

        const invoicePayload = {
            ...data,
            client: selectedClient,
            subtotal,
            total,
            taxes: data.taxes || [],
            notes: data.notes || '',
            terms: data.terms || '',
            userId: user.uid,
        };

        try {
            if (isEditing) {
                await updateInvoice(invoiceId, invoicePayload);
                toast({
                    title: "Factura Actualizada",
                    description: `La factura ${data.invoiceNumber} ha sido actualizada.`,
                });
            } else {
                await addInvoice(invoicePayload);
                toast({
                    title: t('newInvoice.toast.title'),
                    description: `${t('newInvoice.toast.description')} ${data.invoiceNumber}`,
                });
            }

            router.push('/dashboard/invoices');
        } catch (error) {
            console.error("Error saving invoice:", error);
            toast({ title: "Error", description: "Hubo un problema al guardar la factura.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const localeMap = {
        es: es,
    }

    if (isLoading) {
        return <p>Cargando formulario...</p>
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{isEditing ? "Editar Factura" : t('newInvoice.title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Top Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <FormField
                                control={form.control}
                                name="clientId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('invoices.client')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={clients.length > 0 ? t('newInvoice.selectClient') : 'Crea un cliente primero'} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {clients.map(client => (
                                                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="invoiceNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('invoices.invoiceNumber')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder="FAC-2024-001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('invoices.status')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('newInvoice.selectStatus')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Pending">{t('invoices.statusPending')}</SelectItem>
                                                <SelectItem value="Paid">{t('invoices.statusPaid')}</SelectItem>
                                                <SelectItem value="Overdue">{t('invoices.statusOverdue')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="issueDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>{t('invoices.issueDate')}</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                variant={"outline"}
                                                className={cn( "w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                >
                                                {field.value ? ( format(field.value, "PPP", { locale: localeMap[currentLocale as keyof typeof localeMap] || undefined }) ) : ( <span>{t('newInvoice.pickDate')}</span> )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={localeMap[currentLocale as keyof typeof localeMap] || undefined} />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="dueDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>{t('invoices.dueDate')}</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                variant={"outline"}
                                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground" )}
                                                >
                                                {field.value ? ( format(field.value, "PPP", { locale: localeMap[currentLocale as keyof typeof localeMap] || undefined }) ) : ( <span>{t('newInvoice.pickDate')}</span> )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={localeMap[currentLocale as keyof typeof localeMap] || undefined} />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Items Section */}
                        <div className="space-y-4">
                            <FormLabel>{t('newInvoice.items')}</FormLabel>
                             <div className="grid grid-cols-[1fr_100px_120px_120px_auto] gap-2 items-center text-sm font-medium text-muted-foreground px-2">
                                <span>{t('newInvoice.itemDescription')}</span>
                                <span className="text-center">{t('newInvoice.itemQuantity')}</span>
                                <span className="text-right">{t('newInvoice.itemPrice')}</span>
                                <span className="text-right">Total</span>
                                <span className="sr-only">Delete</span>
                            </div>
                            <div className="space-y-2">
                                {itemFields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-[1fr_100px_120px_120px_auto] gap-2 items-start">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.description`}
                                            render={({ field }) => (
                                                <FormItem><FormControl><Input placeholder={t('newInvoice.itemDescription')} {...field} /></FormControl><FormMessage /></FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem><FormControl><Input type="number" placeholder="1" {...field} className="text-center"/></FormControl><FormMessage /></FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.price`}
                                            render={({ field }) => (
                                                <FormItem><FormControl><Input type="number" placeholder="0.00" {...field} className="text-right"/></FormControl><FormMessage /></FormItem>
                                            )}
                                        />
                                        <div className="text-right font-medium py-2 px-3">
                                            {formatCurrency((form.getValues(`items.${index}.quantity`) || 0) * (form.getValues(`items.${index}.price`) || 0))}
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
                             <Button type="button" variant="outline" size="sm" onClick={() => appendItem({ description: "", quantity: 1, price: 0 })}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {t('newInvoice.addItem')}
                            </Button>
                        </div>

                        {/* Totals and Notes Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('newInvoice.notes')}</FormLabel>
                                            <FormControl><Textarea placeholder={t('newInvoice.notesPlaceholder')} {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="terms"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('settings.invoicing.defaultTerms')}</FormLabel>
                                            <FormControl><Textarea placeholder={t('settings.invoicing.defaultTermsPlaceholder')} {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2 p-4 rounded-lg border">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">{t('newInvoice.subtotal')}</span>
                                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                                    </div>

                                    {taxFields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-[1fr_80px_auto] gap-2 items-center">
                                            <FormField
                                                control={form.control}
                                                name={`taxes.${index}.name`}
                                                render={({ field }) => <FormItem><FormControl><Input placeholder="Impuesto" {...field} /></FormControl></FormItem>}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`taxes.${index}.percentage`}
                                                render={({ field }) => <FormItem><FormControl><Input type="number" placeholder="%" {...field} className="text-right" /></FormControl></FormItem>}
                                            />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTax(index)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                    {taxAmounts.map((tax, index) => (
                                        <div key={tax.id} className="flex justify-between items-center">
                                            <span className="text-muted-foreground">{tax.name} ({tax.percentage}%)</span>
                                            <span className="font-medium">{formatCurrency(tax.amount)}</span>
                                        </div>
                                    ))}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button type="button" variant="outline" size="sm" className="mt-2">
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                {t('settings.invoicing.addTax')}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuLabel>España</DropdownMenuLabel>
                                            {PRESET_TAXES.es.map(tax => (
                                                <DropdownMenuItem key={tax.id} onSelect={() => appendTax(tax)}>
                                                    {tax.name} ({tax.percentage}%)
                                                </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>Internacional</DropdownMenuLabel>
                                            {PRESET_TAXES.it.map(tax => (
                                                 <DropdownMenuItem key={tax.id} onSelect={() => appendTax(tax)}>
                                                    {tax.name} ({tax.percentage}%) - Italia
                                                </DropdownMenuItem>
                                            ))}
                                            {PRESET_TAXES.fr.map(tax => (
                                                 <DropdownMenuItem key={tax.id} onSelect={() => appendTax(tax)}>
                                                    {tax.name} ({tax.percentage}%) - Francia
                                                </DropdownMenuItem>
                                            ))}
                                            {PRESET_TAXES.gb.map(tax => (
                                                 <DropdownMenuItem key={tax.id} onSelect={() => appendTax(tax)}>
                                                    {tax.name} ({tax.percentage}%) - UK
                                                </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => appendTax({ id: `tax-${Date.now()}`, name: "", percentage: 0 })}>
                                                Impuesto personalizado
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <hr className="my-2" />
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span>Total</span>
                                        <span>{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                         <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>{t('common.cancel')}</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : t('common.save')}</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    )
}
