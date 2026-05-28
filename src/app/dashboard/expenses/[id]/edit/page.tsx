"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import ExpenseForm from "../../expense-form";
import { getExpenseById } from "@/actions/expenses";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EditExpensePage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { data: session, status } = useSession();
    const user = session?.user;
    const expenseId = params.id as string;

    const [expense, setExpense] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchExpense = async () => {
            if (user && expenseId) {
                try {
                    const data = await getExpenseById(expenseId);
                    if (data) {
                        setExpense(data);
                    } else {
                        toast({ title: "Error", description: "Gasto no encontrado.", variant: "destructive" });
                        router.push('/dashboard/expenses');
                    }
                } catch (error) {
                    console.error(error);
                    toast({ title: "Error", description: "No se pudo cargar el gasto.", variant: "destructive" });
                } finally {
                    setIsLoading(false);
                }
            } else if (status !== 'loading') {
                setIsLoading(false);
            }
        };
        fetchExpense();
    }, [user, status, expenseId, router, toast]);

    if (status === 'loading' || isLoading) {
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
            <ExpenseForm expense={expense} userId={user.id} />
        </div>
    );
}
