"use client";

import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Users, BarChart3, Bell, CheckCircle2, ArrowRight, Layers, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { TiltCard } from "@/components/tilt-card";
import { cn } from "@/lib/utils";

import Image from "next/image";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
            {/* Header / Navbar */}
            <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <FileText className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                    <span className="text-2xl font-bold font-headline tracking-tighter">AuraContable</span>
                </div>
                <nav className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">Características</a>
                    <a href="#stats" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">Estadísticas</a>
                    <Link href="/login" className="text-sm font-bold text-foreground hover:text-primary transition-colors uppercase tracking-widest">Acceder</Link>
                    <Link href="/login">
                        <Button className="h-10 px-6 rounded-full font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all uppercase tracking-widest text-xs">Registrarse</Button>
                    </Link>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                    <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-emerald-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
                </div>

                <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div 
                        initial={{ x: -50, opacity: 0 }} 
                        animate={{ x: 0, opacity: 1 }} 
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <h1 className="text-6xl lg:text-8xl font-black font-headline tracking-tighter leading-[0.9] text-foreground mb-8">
                            Tus facturas, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">brillando con éxito.</span>
                        </h1>
                        <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-lg font-medium leading-relaxed">
                            Gestiona tu facturación de forma sencilla, profesional y elegante. Diseñada para que te centres en lo que realmente importa: hacer crecer tu negocio.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link href="/login">
                                <Button className="h-14 px-8 rounded-full text-lg font-bold shadow-xl shadow-primary/30 group hover:shadow-2xl transition-all">
                                    Empezar Gratis
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <Link href="/demo">
                                <Button variant="ghost" className="h-14 px-8 rounded-full text-lg font-bold glass-card border border-white/10 hover:bg-primary/20 hover:text-primary transition-all">Ver Demo</Button>
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0, rotate: 2 }} 
                        animate={{ scale: 1, opacity: 1, rotate: 0 }} 
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="relative"
                    >
                        <TiltCard intensity={10}>
                            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-emerald-400/20 rounded-[2rem] blur-2xl opacity-50 -z-10"></div>
                            <Image 
                                src="/images/real_aura_dashboard.png" 
                                alt="Dashboard Real de AuraContable" 
                                width={1200}
                                height={800}
                                priority
                                className="w-full rounded-[1.5rem] shadow-2xl shadow-black/40 border border-white/10 glass-card object-cover"
                            />
                        </TiltCard>
                        <div className="absolute -bottom-6 -right-6 glass-card p-6 border border-white/10 rounded-2xl animate-bounce-slow">
                            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white/5 relative overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20 space-y-4">
                        <motion.h2 
                            initial={{ y: 20, opacity: 0 }} 
                            whileInView={{ y: 0, opacity: 1 }} 
                            viewport={{ once: true }}
                            className="text-4xl lg:text-6xl font-black font-headline tracking-tighter"
                        >
                            Todo lo que necesitas <br />
                            en un solo lugar.
                        </motion.h2>
                        <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">Potencia tu negocio con herramientas diseñadas para el crecimiento.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: Layers, title: "Facturación Ágil", desc: "Crea y gestiona facturas profesionales en segundos. Olvídate de los errores manuales.", color: "primary" },
                            { icon: BarChart3, title: "Informes Inteligentes", desc: "Visualiza tu rentabilidad en tiempo real con gráficos modernos y precisos.", color: "emerald-400" },
                            { icon: Users, title: "Gestión de Clientes", desc: "Mantén tu base de clientes organizada y accede a su historial con un clic.", color: "amber-400" },
                            { icon: Bell, title: "Notificaciones Live", desc: "Mantente informado de pagos realizados y facturas vencidas al instante.", color: "blue-400" },
                            { icon: Zap, title: "Velocidad Extrema", desc: "Utilizamos Next.js y PostgreSQL para ofrecerte la experiencia más rápida y segura.", color: "emerald-400" },
                            { icon: ShieldCheck, title: "Privacidad Total", desc: "Tus datos están seguros y encriptados. Autalojado y bajo tu control total.", color: "rose-400" },
                        ].map((f, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 20 }} 
                                whileInView={{ opacity: 1, y: 0 }} 
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <TiltCard intensity={15} className="h-full">
                                    <Card className="glass-card border-white/10 h-full hover:shadow-2xl transition-all duration-300">
                                        <CardHeader>
                                            <div className="h-12 w-12 bg-muted/10 rounded-xl flex items-center justify-center mb-4 transition-transform">
                                                <f.icon className="h-6 w-6 opacity-80" />
                                            </div>
                                            <CardTitle className="text-2xl font-bold tracking-tight">{f.title}</CardTitle>
                                            <CardDescription className="text-muted-foreground font-medium text-lg leading-relaxed">{f.desc}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                </TiltCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section id="stats" className="py-24 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -z-10"></div>
                <div className="container mx-auto px-6 grid md:grid-cols-3 gap-12 text-center items-center">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} className="space-y-2">
                        <p className="text-5xl lg:text-7xl font-black font-headline tracking-tighter text-primary">10k+</p>
                        <p className="text-lg font-bold text-muted-foreground tracking-widest uppercase">Facturas Generadas</p>
                    </motion.div>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="space-y-2">
                        <p className="text-5xl lg:text-7xl font-black font-headline tracking-tighter text-emerald-400">1k+</p>
                        <p className="text-lg font-bold text-muted-foreground tracking-widest uppercase">Usuarios Felices</p>
                    </motion.div>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="space-y-2">
                        <p className="text-5xl lg:text-7xl font-black font-headline tracking-tighter text-amber-400">99.9%</p>
                        <p className="text-lg font-bold text-muted-foreground tracking-widest uppercase">Disponibilidad</p>
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
                <div className="absolute inset-x-0 -top-40 -z-0 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                    <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-white to-emerald-200 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
                </div>

                <div className="container mx-auto px-6 text-center space-y-12 relative z-10">
                    <h2 className="text-5xl lg:text-7xl font-black font-headline tracking-tighter">¿Listo para hacer brillar <br />tu negocio?</h2>
                    <p className="text-2xl font-medium opacity-90 max-w-2xl mx-auto">Únete a miles de emprendedores que ya han transformado su gestión financiera.</p>
                    <Link href="/login" className="inline-block pt-8">
                        <Button className="h-16 px-12 rounded-full text-2xl font-bold bg-white text-primary hover:bg-emerald-50 transition-all shadow-2xl">
                            Consigue AuraContable Ahora
                            <ArrowRight className="ml-3 h-6 w-6" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10 px-6">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-muted-foreground font-medium">
                    <div className="flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        <span className="text-xl font-bold text-foreground font-headline tracking-tighter">AuraContable</span>
                    </div>
                    <p className="text-sm">© 2026 AuraContable. Todos los derechos reservados.</p>
                    <div className="flex gap-8 text-sm">
                        <Link href="/terminos" className="hover:text-primary transition-colors">Términos</Link>
                        <Link href="/privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
                        <Link href="/contacto" className="hover:text-primary transition-colors">Contacto</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
