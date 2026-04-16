"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getPublicInvoiceById } from "@/actions/invoices";
import { createStripeSession, capturePayPalOrder } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import Image from "next/image";

export default function PublicInvoicePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params.id as string;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    
    const isSuccess = searchParams.get("success") === "true";
    const isCanceled = searchParams.get("canceled") === "true";

    useEffect(() => {
        async function fetchData() {
            const res = await getPublicInvoiceById(id);
            setData(res);
            setLoading(false);
        }
        fetchData();
    }, [id]);

    const handleStripePay = async () => {
        setPaying(true);
        try {
            const { url } = await createStripeSession(id);
            if (url) window.location.href = url;
        } catch (error) {
            console.error(error);
            alert("Error al iniciar el pago con Stripe.");
        } finally {
            setPaying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Cargando factura...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Card className="max-w-md w-full mx-4 shadow-xl border-destructive/20 overflow-hidden">
                    <div className="h-2 bg-destructive" />
                    <CardHeader>
                        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <CardTitle className="text-center text-2xl font-headline">Factura no encontrada</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-muted-foreground pb-8">
                        El enlace que has seguido puede haber expirado o la factura no existe.
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { invoice, company } = data;
    const isPaid = invoice.status === "Paid" || isSuccess;

    return (
        <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#0a0a0b] py-12 px-4 selection:bg-primary/20">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {isSuccess && (
                     <Card className="bg-emerald-50! dark:bg-emerald-950/20! border-emerald-500/20! shadow-lg animate-in fade-in zoom-in duration-500 overflow-hidden">
                        <div className="h-1.5 bg-emerald-500" />
                        <CardContent className="flex items-center gap-4 py-4">
                            <div className="p-3 bg-emerald-500/10 rounded-full shrink-0">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-900 dark:text-emerald-100">¡Pago realizado con éxito!</h3>
                                <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">Hemos recibido tu pago. Gracias por tu confianza.</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isCanceled && (
                    <Card className="bg-amber-50! dark:bg-amber-950/20! border-amber-500/20! shadow-lg animate-in fade-in zoom-in duration-500 overflow-hidden">
                        <div className="h-1.5 bg-amber-500" />
                        <CardContent className="flex items-center gap-4 py-4">
                            <div className="p-3 bg-amber-500/10 rounded-full shrink-0">
                                <AlertCircle className="h-6 w-6 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-amber-900 dark:text-amber-100">Pago cancelado</h3>
                                <p className="text-sm text-amber-700/80 dark:text-amber-400/80">El proceso de pago fue interrumpido. No se ha realizado ningún cargo.</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/50">
                    <div className="space-y-4">
                        {company.logoUrl ? (
                            <Image src={company.logoUrl} alt={company.name} width={100} height={40} className="h-12 w-auto object-contain" />
                        ) : (
                            <div className="text-3xl font-black tracking-tighter text-primary">{company.name}</div>
                        )}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">FACTURA</p>
                            <h1 className="text-3xl font-headline font-semibold">#{invoice.invoiceNumber}</h1>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-start md:items-end gap-3">
                         <Badge 
                            variant={isPaid ? "default" : (invoice.status === "Overdue" ? "destructive" : "secondary")}
                            className={`px-4 py-1.5 text-sm font-bold uppercase tracking-widest ${isPaid ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                        >
                            {isPaid ? "PAGADA" : (invoice.status === "Overdue" ? "VENCIDA" : "PENDIENTE")}
                        </Badge>
                        <div className="text-right">
                             <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter">Vencimiento</p>
                             <p className="text-lg font-headline font-medium">{new Date(invoice.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12 bg-white dark:bg-black/20 p-8 rounded-2xl border border-border/50 shadow-sm">
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-[10px] font-black uppercase text-muted-foreground/40 mb-2 tracking-[0.2em]">EMITIDA POR</h4>
                            <div className="space-y-1">
                                <p className="font-bold text-lg">{company.name}</p>
                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{company.address}</p>
                                <p className="text-sm font-medium">{company.taxId}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6 md:text-right">
                        <div>
                            <h4 className="text-[10px] font-black uppercase text-muted-foreground/40 mb-2 tracking-[0.2em]">CLIENTE</h4>
                            <div className="space-y-1">
                                <p className="font-bold text-lg">{invoice.client.name}</p>
                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{invoice.client.address}</p>
                                <p className="text-sm font-medium">{invoice.client.taxId}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <Card className="border-none shadow-none bg-transparent">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border/50">
                                        <th className="text-left py-4 text-[10px] font-black uppercase text-muted-foreground/40 tracking-[0.2em]">CONCEPTO</th>
                                        <th className="text-right py-4 text-[10px] font-black uppercase text-muted-foreground/40 tracking-[0.2em]">CANT.</th>
                                        <th className="text-right py-4 text-[10px] font-black uppercase text-muted-foreground/40 tracking-[0.2em]">PRECIO</th>
                                        <th className="text-right py-4 text-[10px] font-black uppercase text-muted-foreground/40 tracking-[0.2em]">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {invoice.items.map((item: any) => (
                                        <tr key={item.id} className="group">
                                            <td className="py-6 pr-4">
                                                <p className="font-medium text-base group-hover:text-primary transition-colors">{item.description}</p>
                                            </td>
                                            <td className="text-right font-mono text-sm py-6">{item.quantity}</td>
                                            <td className="text-right font-mono text-sm py-6">
                                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: company.currency || 'EUR' }).format(item.price)}
                                            </td>
                                            <td className="text-right font-bold text-base py-6">
                                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: company.currency || 'EUR' }).format(item.price * item.quantity)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col md:flex-row gap-8 justify-between pt-8 border-t border-border/50">
                    <div className="flex-1 max-w-sm">
                        {invoice.notes && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-[0.2em]">NOTAS ADICIONALES</h4>
                                <p className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-xl italic leading-loose">
                                    "{invoice.notes}"
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[280px]">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Subtotal</span>
                            <span className="font-mono">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: company.currency || 'EUR' }).format(invoice.subtotal)}</span>
                        </div>
                        {invoice.taxes?.map((tax: any) => (
                             <div key={tax.id} className="flex justify-between items-center py-2">
                                <span className="text-sm text-muted-foreground font-medium uppercase tracking-widest text-[10px]">{tax.name} ({tax.percentage}%)</span>
                                <span className="font-mono">+{new Intl.NumberFormat('es-ES', { style: 'currency', currency: company.currency || 'EUR' }).format(invoice.subtotal * (tax.percentage / 100))}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center py-6 mt-2 border-t border-border/50">
                            <span className="text-lg font-black tracking-tight text-primary">TOTAL FACTURA</span>
                            <span className="text-3xl font-headline font-black">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: company.currency || 'EUR' }).format(invoice.total)}
                            </span>
                        </div>
                        
                        {!isPaid && (
                            <div className="space-y-4 pt-6">
                                {company.stripeEnabled && (
                                    <Button 
                                        onClick={handleStripePay} 
                                        disabled={paying} 
                                        className="w-full h-14 text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all bg-[#635BFF] hover:bg-[#5a52e5] text-white gap-3 border-none"
                                    >
                                        {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                                        Pagar con Tarjeta
                                    </Button>
                                )}
                                
                                {company.paypalEnabled && (
                                    <PayPalScriptProvider options={{ clientId: company.paypalClientId || "", currency: company.currency || "EUR" }}>
                                        <PayPalButtons 
                                            style={{ layout: "vertical", shape: "pill", label: "pay" }}
                                            createOrder={(data, actions) => {
                                                return actions.order.create({
                                                    intent: "CAPTURE" as any,
                                                    purchase_units: [{
                                                        amount: {
                                                            currency_code: company.currency || "EUR",
                                                            value: invoice.total.toString(),
                                                        },
                                                        invoice_id: invoice.invoiceNumber,
                                                    }],
                                                });
                                            }}
                                            onApprove={async (data, actions) => {
                                                if (actions.order) {
                                                    const order = await actions.order.capture();
                                                    if (order.id) await capturePayPalOrder(order.id, id);
                                                    window.location.reload();
                                                }
                                            }}
                                        />
                                    </PayPalScriptProvider>
                                )}
                            </div>
                        )}

                        <Button variant="outline" className="w-full h-12 mt-4 text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors gap-2 border-border/50">
                            <Download className="h-4 w-4" />
                            Descargar en PDF
                        </Button>
                    </div>
                </div>

                <footer className="pt-20 text-center space-y-4">
                    <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Propulsado por</p>
                    <div className="flex items-center justify-center gap-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default">
                        <span className="font-headline font-bold text-xl tracking-tighter">AuraContable</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
