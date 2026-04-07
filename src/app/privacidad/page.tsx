"use client"

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacidadPage() {
    return (
        <div className="min-h-screen bg-background selection:bg-primary/20">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-md">
                <Link href="/" className="flex items-center gap-2 group">
                    <ArrowLeft className="h-5 w-5 text-primary transition-transform group-hover:-translate-x-1" />
                    <span className="text-xl font-bold font-headline tracking-tighter">AuraContable</span>
                </Link>
            </header>

            <main className="max-w-3xl mx-auto pt-32 pb-20 px-6">
                <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
                            <ShieldCheck className="h-3 w-3" />
                            Seguridad
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tighter text-foreground">
                            Política de Privacidad
                        </h1>
                        <p className="text-muted-foreground font-medium">Última actualización: 24 de marzo de 2026</p>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary border-l-4 border-primary pl-4">1. Recopilación de Datos</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                En AuraContable recolectamos únicamente la información necesaria para el funcionamiento del servicio:
                            </p>
                            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                                <li>Datos de contacto (nombre, email).</li>
                                <li>Información de facturación (dirección fiscal, CIF/NIF).</li>
                                <li>Credenciales de API (Stripe/PayPal) que se almacenan de forma segura.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary border-l-4 border-primary pl-4">2. Uso de tu Información</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Procesamos tus datos exclusivamente para:
                            </p>
                             <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                                <li>Generar y gestionar tus facturas.</li>
                                <li>Facilitar los cobros electrónicos a través de terceros autorizados.</li>
                                <li>Enviarte notificaciones críticas sobre tu cuenta.</li>
                            </ul>
                            <p className="text-muted-foreground font-bold bg-muted/30 p-4 rounded-xl italic">
                                Jamás vendemos tus datos a terceros ni los utilizamos para fines publicitarios externos.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary border-l-4 border-primary pl-4">3. Seguridad de los Datos</h2>
                            <div className="flex items-start gap-4 p-6 bg-emerald-50! dark:bg-emerald-950/20! border border-emerald-500/20 rounded-2xl">
                                <Lock className="h-10 w-10 text-emerald-500 shrink-0" />
                                <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80 leading-loose">
                                    Utilizamos encriptación de grado bancario para proteger tus datos en reposo y tránsito. Los secretos de las APIs de pagos se cifran antes de ser almacenados en nuestra base de datos PostgreSQL.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary border-l-4 border-primary pl-4">4. Tus Derechos</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Según el RGPD (GDPR), tienes derecho a acceder, rectificar o eliminar tus datos en cualquier momento desde tu panel de configuración o contactando con nosotros.
                            </p>
                        </section>
                    </div>

                    <div className="pt-12 border-t border-border/50">
                        <Button asChild className="rounded-full px-8 py-6 text-lg font-bold shadow-xl shadow-primary/20">
                            <Link href="/">Volver al Inicio</Link>
                        </Button>
                    </div>
                </div>
            </main>

            <footer className="py-12 px-6 border-t border-border/50 bg-muted/20">
                <div className="max-w-3xl mx-auto text-center">
                     <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">© 2026 AuraContable - Privacidad Garantizada</p>
                </div>
            </footer>
        </div>
    );
}
