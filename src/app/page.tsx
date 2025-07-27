"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileText, AlertCircle } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
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

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/dashboard');
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
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
            <FileText className="h-8 w-8 text-primary" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight font-headline">InvoiceFlow</CardTitle>
            <CardDescription>{isSignUp ? t('login.signUp') : t('login.title')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
                 <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <form onSubmit={handleAuthAction}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('login.email')}</Label>
                  <Input id="email" type="email" placeholder="nombre@ejemplo.com" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('login.password')}</Label>
                  <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}/>
                </div>
              </div>
              <Button type="submit" className="w-full mt-6">{isSignUp ? t('login.signUp') : t('login.signIn')}</Button>
            </form>
            <Separator className="my-6">
              <span className="px-2 text-muted-foreground bg-background">{t('login.or')}</span>
            </Separator>
            <Button variant="outline" className="w-full">
              <GoogleIcon className="mr-2 h-4 w-4" />
              {t('login.googleSignIn')}
            </Button>
            <div className="mt-4 text-center text-sm">
                {isSignUp ? "¿Ya tienes una cuenta?" : t('login.noAccount')}{" "}
                <Button variant="link" onClick={() => {setIsSignUp(!isSignUp); setError(null);}} className="p-0 h-auto">
                    {isSignUp ? t('login.signIn') : t('login.signUp')}
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
