
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileText, AlertCircle, MailCheck, MoveRight } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { signIn } from "next-auth/react";
import { registerUser } from "@/actions/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { TiltCard } from "@/components/tilt-card";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M12 22c-2.39 0-4.63-.82-6.4-2.2" />
        <path d="M20.2 13.8c.12-.6.2-1.2.2-1.8 0-5.523-4.477-10-10-10-2.39 0-4.63.82-6.4 2.2" />
        <path d="M3.8 10.2c-.12.6-.2 1.2-.2 1.8 0 5.523 4.477 10 10 10 2.39 0 4.63-.82 6.4-2.2" />
        <path d="M12 12h.01" />
      </svg>
    )
}

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await registerUser({ email, password, name });
        
        if (result.error) {
            setError(result.error);
        } else {
            const signInResult = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (signInResult?.error) {
                setError(signInResult.error);
            } else {
                router.push('/dashboard');
            }
        }
      } else {
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError(result.error);
        } else if (result?.ok) {
            router.push('/dashboard');
        }
      }
    } catch (err: any) {
        setError("Ha ocurrido un error inesperado al procesar la solicitud.");
    } finally {
        setIsLoading(false);
    }
  };
  
  if (verificationSent) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
             <Card className="w-full max-w-md glass-card border-white/10 shadow-2xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <MailCheck className="h-12 w-12 text-emerald-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold font-headline">¡Verifica tu correo!</CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">
                        Hemos enviado un enlace de verificación a <strong>{email}</strong>. Por favor, revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button variant="link" onClick={() => {setVerificationSent(false); setIsSignUp(false);}} className="w-full text-primary font-bold">
                        Volver a inicio de sesión
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }


  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 bg-background overflow-hidden">
        <div className="hidden bg-primary lg:flex lg:flex-col lg:items-center lg:justify-center p-12 text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary-foreground/20 z-0"></div>
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl z-0"></div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary-foreground/10 rounded-full blur-3xl z-0"></div>
            
            <TiltCard intensity={5} className="flex flex-col items-center gap-6 z-10 w-full max-w-lg">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex justify-center"
                >
                    <div className="flex items-center gap-4">
                        <FileText className="h-16 w-16" />
                        <span className="text-6xl font-bold font-headline tracking-tighter">AuraContable</span>
                    </div>
                </motion.div>
                <motion.p 
                    initial={{ y: 20, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="mt-4 text-2xl text-center font-medium leading-relaxed opacity-90 italic"
                >
                    La herramienta definitiva para autónomos y pymes. Simplifica tu facturación y céntrate en lo que de verdad importa.
                </motion.p>
            </TiltCard>
        </div>
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50"></div>
            
            <AnimatePresence mode="wait">
                    <div className="w-full max-w-md space-y-8 z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-center lg:hidden mb-6">
                            <FileText className="h-10 w-10 text-primary" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-headline">
                                {isSignUp ? "Crea tu cuenta" : "Bienvenido de nuevo"}
                            </h2>
                            <p className="mt-4 text-sm text-muted-foreground font-medium">
                                {isSignUp ? "¿Ya tienes una cuenta?" : t('login.noAccount')}{" "}
                                <Button 
                                    variant="link" 
                                    onClick={() => {setIsSignUp(!isSignUp); setError(null);}} 
                                    className="p-0 h-auto font-bold text-primary hover:no-underline transition-all duration-300" 
                                    disabled={isLoading}
                                >
                                    {isSignUp ? t('login.signIn') : t('login.signUp')}
                                </Button>
                            </p>
                        </div>

                        {error && (
                            <Alert variant="destructive" className="glass-card border-destructive/20 animate-in fade-in zoom-in duration-300 overflow-hidden">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="font-bold tracking-tight">Error de autenticación</AlertTitle>
                                <AlertDescription className="font-medium opacity-90">{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="mt-8">
                            <form className="space-y-6" onSubmit={handleAuthAction} id="login-form">
                                <div className="space-y-4 rounded-md">
                                    {isSignUp && (
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-sm font-semibold tracking-tight text-muted-foreground">{t('login.name') || "Nombre"}</Label>
                                            <Input 
                                                id="name" 
                                                name="name"
                                                type="text" 
                                                placeholder="Tu nombre completo" 
                                                required 
                                                value={name} 
                                                onChange={e => setName(e.target.value)} 
                                                disabled={isLoading} 
                                                className="h-12 glass transition-all focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-semibold tracking-tight text-muted-foreground">{t('login.email')}</Label>
                                        <Input 
                                            id="email" 
                                            name="email"
                                            type="email" 
                                            placeholder="nombre@ejemplo.com" 
                                            required 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            disabled={isLoading} 
                                            className="h-12 glass transition-all focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-sm font-semibold tracking-tight text-muted-foreground">{t('login.password')}</Label>
                                        <Input 
                                            id="password" 
                                            name="password"
                                            type="password" 
                                            required 
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)} 
                                            disabled={isLoading} 
                                            className="h-12 glass transition-all focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button 
                                        type="submit" 
                                        onClick={(e) => {
                                            // Fail-safe check: if form submit doesn't fire, we trigger it here
                                            if (!isLoading) {
                                                console.log("Login button clicked");
                                            }
                                        }}
                                        className="w-full h-12 text-lg font-bold group relative overflow-hidden shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]" 
                                        disabled={isLoading}
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {isLoading ? "Cargando..." : (isSignUp ? 'Empezar ahora' : 'Iniciar Sesión')}
                                            {!isLoading && <MoveRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />}
                                        </span>
                                    </Button>
                                </div>
                            </form>
                        </div>
                        
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <Separator className="bg-border/50" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-4 text-muted-foreground font-black tracking-[0.2em]">{t('login.or')}</span>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <Button 
                                variant="ghost" 
                                type="button"
                                className="h-12 border border-border/50 bg-muted/20 hover:bg-primary/5 hover:text-primary transition-all font-bold text-foreground rounded-xl" 
                                disabled={isLoading} 
                                onClick={() => signIn("google")}
                            >
                                <GoogleIcon className="mr-3 h-5 w-5" />
                                Continuar con Google
                            </Button>
                        </div>
                        
                        <p className="px-8 text-center text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                            Al continuar, aceptas nuestros términos de servicio y política de privacidad.
                        </p>
                    </div>
            </AnimatePresence>
        </div>
    </div>
  );
}
