"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, Phone, Send, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export default function ContactoPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // Simular envío
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setIsSubmitting(false);
        setIsSuccess(true);
        toast({
            title: "Mensaje enviado",
            description: "Nos pondremos en contacto contigo muy pronto.",
        });
    };

    return (
        <div className="min-h-screen bg-background selection:bg-primary/20">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-md">
                <Link href="/" className="flex items-center gap-2 group">
                    <ArrowLeft className="h-5 w-5 text-primary transition-transform group-hover:-translate-x-1" />
                    <span className="text-xl font-bold font-headline tracking-tighter">AuraContable</span>
                </Link>
            </header>

            <main className="max-w-6xl mx-auto pt-32 pb-20 px-6">
                <div className="grid lg:grid-cols-2 gap-16">
                    {/* Left Column: Info */}
                    <div className="space-y-12">
                         <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
                                <MessageSquare className="h-3 w-3" />
                                Soporte
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter text-foreground">
                                Hablemos de tu <span className="text-primary italic">negocio.</span>
                            </h1>
                            <p className="text-xl text-muted-foreground leading-relaxed max-w-md font-medium">
                                Estamos aquí para resolver tus dudas sobre facturación, integraciones de pago o cualquier inquietud técnica.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <div className="p-3 bg-primary/5 rounded-2xl w-fit">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <h4 className="font-bold font-headline text-lg">Email</h4>
                                <p className="text-muted-foreground font-medium">hola@auracontable.com</p>
                            </div>
                            <div className="space-y-2">
                                <div className="p-3 bg-primary/5 rounded-2xl w-fit">
                                    <Phone className="h-6 w-6 text-primary" />
                                </div>
                                <h4 className="font-bold font-headline text-lg">Teléfono</h4>
                                <p className="text-muted-foreground font-medium">+34 900 000 000</p>
                            </div>
                             <div className="space-y-2">
                                <div className="p-3 bg-primary/5 rounded-2xl w-fit">
                                    <MapPin className="h-6 w-6 text-primary" />
                                </div>
                                <h4 className="font-bold font-headline text-lg">Oficina</h4>
                                <p className="text-muted-foreground font-medium">Calle Tech 123, Madrid</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Form */}
                    <div>
                        {isSuccess ? (
                            <Card className="border-none shadow-2xl shadow-primary/10 bg-white/50 dark:bg-black/20 backdrop-blur-xl rounded-[2rem] overflow-hidden group">
                                <div className="h-2 bg-emerald-500 animate-in slide-in-from-left duration-1000" />
                                <CardContent className="p-12 text-center space-y-6">
                                    <div className="p-4 bg-emerald-500/10 rounded-full w-fit mx-auto group-hover:scale-110 transition-transform duration-500">
                                        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black font-headline tracking-tighter">¡Recibido!</h2>
                                        <p className="text-muted-foreground font-medium leading-relaxed">Tu mensaje ha sido enviado correctamente. Uno de nuestros asesores te contactará en las próximas 24 horas.</p>
                                    </div>
                                    <Button onClick={() => setIsSuccess(false)} variant="outline" className="rounded-full px-8 py-6 h-auto font-bold uppercase tracking-widest text-xs">
                                        Enviar otro mensaje
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6 bg-white/50 dark:bg-black/20 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl shadow-primary/5">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Nombre</label>
                                        <Input required placeholder="Tu nombre" className="h-14 rounded-2xl border-white/10 focus:ring-primary focus:border-primary px-6" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Email</label>
                                        <Input required type="email" placeholder="email@ejemplo.com" className="h-14 rounded-2xl border-white/10 focus:ring-primary focus:border-primary px-6" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Asunto</label>
                                    <Input required placeholder="¿En qué podemos ayudarte?" className="h-14 rounded-2xl border-white/10 focus:ring-primary focus:border-primary px-6" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-2">Mensaje</label>
                                    <Textarea required placeholder="Escribe tu mensaje aquí..." className="min-h-[150px] rounded-[1.5rem] border-white/10 focus:ring-primary focus:border-primary px-6 py-4" />
                                </div>
                                <Button disabled={isSubmitting} className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all gap-3 bg-primary hover:bg-primary/90 text-white border-none">
                                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
                                    {isSubmitting ? "Enviando..." : "Enviar Mensaje"}
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
