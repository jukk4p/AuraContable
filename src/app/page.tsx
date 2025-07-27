"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

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
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
            <FileText className="h-8 w-8 text-primary" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight font-headline">InvoiceFlow</CardTitle>
            <CardDescription>{t('login.title')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <Input id="email" type="email" placeholder="nombre@ejemplo.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Input id="password" type="password" required />
              </div>
            </div>
            <Link href="/dashboard">
                <Button className="w-full mt-6">{t('login.signIn')}</Button>
            </Link>
            <Separator className="my-6">
              <span className="px-2 text-muted-foreground bg-background">{t('login.or')}</span>
            </Separator>
            <Button variant="outline" className="w-full">
              <GoogleIcon className="mr-2 h-4 w-4" />
              {t('login.googleSignIn')}
            </Button>
            <div className="mt-4 text-center text-sm">
              {t('login.noAccount')}{" "}
              <Link href="#" className="underline text-primary">
                {t('login.signUp')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
