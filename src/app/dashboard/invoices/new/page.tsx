
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
import { Client, InvoiceStatus } from "@/lib/types"
import React, { useState, useEffect } from 'react'
import { auth } from "@/lib/firebase/config"
import { useAuthState } from "react-firebase-hooks/auth"
import { getClients, addInvoice, getInvoices } from "@/lib/firebase/firestore"
import { useRouter } from "next/navigation"

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
    notes: z.string().optional(),
})

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

export default function NewInvoicePage() {
    const { t, formatCurrency, locale: currentLocale } = useLocale();
    const { toast } = useToast()
    const router = useRouter();
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
            notes: "",
        },
    })
    
    useEffect(() => {
        const fetchData = async () => {
            if(user) {
                setIsLoading(true);
                try {
                    const [userClients, userInvoices] = await Promise.all([
                        getClients(user.uid),
                        getInvoices(user.uid)
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
                    });

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
    }, [user, form, toast]);


    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    const watchedItems = form.watch("items");

    const calculateTotals = () => {
        const subtotal = watchedItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0)), 0);
        return { subtotal };
    }

    const { subtotal } = calculateTotals();

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

        try {
            await addInvoice({
                ...data,
                client: selectedClient,
                subtotal: subtotal,
                userId: user.uid,
            });

            toast({
                title: t('newInvoice.toast.title'),
                description: `${t('newInvoice.toast.description')} ${data.invoiceNumber}`,
            });

            router.push('/dashboard/invoices');
        } catch (error) {
            console.error("Error creating invoice:", error);
            toast({ title: "Error", description: "Hubo un problema al crear la factura.", variant: "destructive" });
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
                        <CardTitle>{t('newInvoice.title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="clientId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('invoices.client')}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                             <div className="grid grid-cols-2 gap-4">
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
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                    >
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: localeMap[currentLocale as keyof typeof localeMap] || undefined })
                                                    ) : (
                                                        <span>{t('newInvoice.pickDate')}</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                    locale={localeMap[currentLocale as keyof typeof localeMap] || undefined}
                                                />
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
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                    >
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: localeMap[currentLocale as keyof typeof localeMap] || undefined })
                                                    ) : (
                                                        <span>{t('newInvoice.pickDate')}</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                    locale={localeMap[currentLocale as keyof typeof localeMap] || undefined}
                                                />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('invoices.status')}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        </div>
                        <div className="space-y-4">
                            <FormLabel>{t('newInvoice.items')}</FormLabel>
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-start">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.description`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="sr-only">Description</FormLabel>
                                                     <FormControl>
                                                        <Input placeholder={t('newInvoice.itemDescription')} {...field} />
                                                     </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="sr-only">Quantity</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder={t('newInvoice.itemQuantity')} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.price`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="sr-only">Price</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder={t('newInvoice.itemPrice')} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                             <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ description: "", quantity: 1, price: 0 })}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {t('newInvoice.addItem')}
                            </Button>

                            <div className="flex justify-end mt-4">
                                <div className="text-right">
                                    <p className="text-muted-foreground">{t('newInvoice.subtotal')}</p>
                                    <p className="font-semibold text-lg">{formatCurrency(subtotal)}</p>
                                </div>
                            </div>
                             <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('newInvoice.notes')}</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder={t('newInvoice.notesPlaceholder')} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                         <Button variant="outline" type="button" onClick={() => form.reset()} disabled={isSubmitting}>{t('common.cancel')}</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : t('common.save')}</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    )
}

    