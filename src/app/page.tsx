
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
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await addDoc(collection(db, "users"), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            createdAt: new Date()
        });

        await sendEmailVerification(user);
        setVerificationSent(true);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
            setError("Por favor, verifica tu correo electrónico antes de iniciar sesión.");
            await auth.signOut();
        } else {
            router.push('/dashboard');
        }
      }
    } catch (err: any) {
        switch (err.code) {
            case 'auth/user-not-found':
                setError("No existe ningún usuario con este correo electrónico.");
                break;
            case 'auth/wrong-password':
                setError("La contraseña es incorrecta.");
                break;
            case 'auth/email-already-in-use':
                setError("Este correo electrónico ya está en uso.");
                break;
            case 'auth/weak-password':
                setError("La contraseña debe tener al menos 6 caracteres.");
                break;
            default:
                setError("Ha ocurrido un error. Por favor, inténtalo de nuevo.");
                break;
        }
    } finally {
        setIsLoading(false);
    }
  };
  
  if (verificationSent) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
             <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <MailCheck className="h-12 w-12 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl">¡Verifica tu correo!</CardTitle>
                    <CardDescription>
                        Hemos enviado un enlace de verificación a <strong>{email}</strong>. Por favor, revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button variant="link" onClick={() => {setVerificationSent(false); setIsSignUp(false);}} className="w-full">
                        Volver a inicio de sesión
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }


  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
        <div className="hidden bg-primary lg:flex lg:flex-col lg:items-center lg:justify-center p-12 text-primary-foreground">
            <div className="flex items-center gap-2 mb-4">
                <FileText className="h-10 w-10" />
                <span className="text-4xl font-bold font-headline">InvoiceFlow</span>
            </div>
            <p className="mt-4 text-xl text-center">
               La herramienta definitiva para autónomos y pymes. Simplifica tu facturación y céntrate en lo que de verdad importa.
            </p>
        </div>
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                 <div className="flex justify-center lg:hidden mb-6">
                    <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
                        {isSignUp ? "Crea tu cuenta" : "Bienvenido de nuevo"}
                    </h2>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                         {isSignUp ? "¿Ya tienes una cuenta?" : t('login.noAccount')}{" "}
                        <Button variant="link" onClick={() => {setIsSignUp(!isSignUp); setError(null);}} className="p-0 h-auto font-medium text-primary" disabled={isLoading}>
                            {isSignUp ? t('login.signIn') : t('login.signUp')}
                        </Button>
                    </p>
                </div>
                 {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error de autenticación</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <form className="mt-8 space-y-6" onSubmit={handleAuthAction}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <Label htmlFor="email">{t('login.email')}</Label>
                            <Input id="email" type="email" placeholder="nombre@ejemplo.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} className="mt-1"/>
                        </div>
                        <div>
                            <Label htmlFor="password">{t('login.password')}</Label>
                            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} className="mt-1"/>
                        </div>
                    </div>

                    <div>
                        <Button type="submit" className="w-full group" disabled={isLoading}>
                             {isLoading ? "Cargando..." : (isSignUp ? 'Crear cuenta' : 'Iniciar Sesión')}
                            <span className="absolute right-4 transform transition-transform group-hover:translate-x-1">
                                <MoveRight className="h-4 w-4" />
                            </span>
                        </Button>
                    </div>
                </form>
                 <Separator className="my-6">
                  <span className="px-2 text-muted-foreground bg-background">{t('login.or')}</span>
                </Separator>

                <div className="mt-6">
                     <Button variant="outline" className="w-full" disabled={isLoading}>
                        <GoogleIcon className="mr-2 h-4 w-4" />
                        {t('login.googleSignIn')}
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
}
