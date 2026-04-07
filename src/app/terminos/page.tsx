"use client"

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, FileText, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TerminosPage() {
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
                            <Scale className="h-3 w-3" />
                            Legal
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tighter text-foreground">
                            Términos de Servicio
                        </h1>
                        <p className="text-muted-foreground font-medium">Última actualización: 24 de marzo de 2026</p>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary border-l-4 border-primary pl-4">1. Aceptación de los Términos</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Al acceder y utilizar **AuraContable**, aceptas estar sujeto a estos Términos de Servicio. Nuestra plataforma está diseñada para facilitar la facturación y gestión financiera de forma eficiente y profesional.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary border-l-4 border-primary pl-4">2. Uso de la Plataforma</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                AuraContable es una herramienta de gestión. El usuario es el único responsable de la veracidad de los datos introducidos, incluyendo la validez fiscal de las facturas generadas.
                            </p>
                            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                                <li>No se permite el uso para actividades ilícitas.</li>
                                <li>El acceso es personal e intransferible.</li>
                                <li>Tú mantienes la propiedad de tus datos, nosotros facilitamos el procesamiento.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary border-l-4 border-primary pl-4">3. Pagos y Suscripciones</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                El procesamiento de pagos para tus clientes se realiza a través de Stripe y PayPal. AuraContable no almacena tus datos bancarios ni secretos API en texto plano; son encriptados según estándares de la industria.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary border-l-4 border-primary pl-4">4. Limitación de Responsabilidad</h2>
                            <p className="text-muted-foreground leading-relaxed italic">
                                AuraContable se proporciona "tal cual". No garantizamos que el servicio sea ininterrumpido o libre de errores, aunque nos esforzamos por ofrecer la máxima disponibilidad.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary border-l-4 border-primary pl-4">5. Modificaciones</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Nos reservamos el derecho de actualizar estos términos en cualquier momento. Los usuarios serán notificados a través de la plataforma.
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
                     <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">© 2026 AuraContable - Tecnología para Profesionales</p>
                </div>
            </footer>
        </div>
    );
}
