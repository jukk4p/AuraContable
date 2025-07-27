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
import { mockClients } from "@/lib/data"
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

const invoiceFormSchema = z.object({
    invoiceNumber: z.string().min(1, "Invoice number is required"),
    clientId: z.string().min(1, "Client is required"),
    issueDate: z.date(),
    dueDate: z.date(),
    status: z.enum(["Pending", "Paid", "Overdue"]),
    items: z.array(z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
        price: z.coerce.number().min(0, "Price cannot be negative"),
    })).min(1, "At least one item is required"),
    notes: z.string().optional(),
})

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

export default function NewInvoicePage() {
    const { toast } = useToast()

    const form = useForm<InvoiceFormValues>({
        resolver: zodResolver(invoiceFormSchema),
        defaultValues: {
            invoiceNumber: `INV-${new Date().getFullYear()}-`,
            status: "Pending",
            issueDate: new Date(),
            items: [{ description: "", quantity: 1, price: 0 }],
            notes: "",
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    const watchedItems = form.watch("items");

    const calculateTotals = () => {
        const subtotal = watchedItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        return { subtotal };
    }

    const { subtotal } = calculateTotals();

    function onSubmit(data: InvoiceFormValues) {
        console.log(data)
        toast({
            title: "Invoice Created",
            description: `Invoice ${data.invoiceNumber} has been successfully created.`,
        })
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Invoice</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="clientId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Client</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a client" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {mockClients.map(client => (
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
                                        <FormLabel>Invoice Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="INV-2024-001" {...field} />
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
                                            <FormLabel>Issue Date</FormLabel>
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
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
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
                                            <FormLabel>Due Date</FormLabel>
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
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
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
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Pending">Pending</SelectItem>
                                                <SelectItem value="Paid">Paid</SelectItem>
                                                <SelectItem value="Overdue">Overdue</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="space-y-4">
                            <FormLabel>Items</FormLabel>
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-start">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.description`}
                                            render={({ field }) => (
                                                <FormItem>
                                                     <FormControl>
                                                        <Input placeholder="Item description" {...field} />
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
                                                    <FormControl>
                                                        <Input type="number" placeholder="Qty" {...field} />
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
                                                    <FormControl>
                                                        <Input type="number" placeholder="Price" {...field} />
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
                                Add Item
                            </Button>

                            <div className="flex justify-end mt-4">
                                <div className="text-right">
                                    <p className="text-muted-foreground">Subtotal</p>
                                    <p className="font-semibold text-lg">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal)}</p>
                                </div>
                            </div>
                             <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Add any additional notes..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                         <Button variant="outline" type="button" onClick={() => form.reset()}>Cancel</Button>
                        <Button type="submit">Save Invoice</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    )
}
