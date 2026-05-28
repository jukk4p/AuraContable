"use client";

import { useSession } from "next-auth/react";
import ExpenseForm from "../expense-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function NewExpensePage() {
    const { data: session, status } = useSession();
    const user = session?.user;

    if (status === 'loading') {
        return <div className="p-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
    }

    if (!user) {
        return (
            <Alert variant="destructive" className="rounded-3xl border-none shadow-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-black uppercase tracking-widest text-xs">Acceso Denegado</AlertTitle>
                <AlertDescription className="font-bold">Debes iniciar sesión para ver esta página.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            <ExpenseForm userId={user.id} />
        </div>
    );
}
