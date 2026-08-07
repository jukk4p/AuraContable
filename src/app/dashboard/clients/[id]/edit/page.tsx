"use client"

import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import ClientForm from "../../client-form";
import { getClients } from "@/actions/clients";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { Client } from '@/lib/types';

export default function EditClientPage() {
    const { data: session, status } = useSession();
    const user = session?.user;
    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;

    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchClient = async () => {
            if (user?.id && clientId) {
                setLoading(true);
                try {
                    const userClients = await getClients();
                    const matched = userClients.find(c => c.id === clientId);
                    if (matched) {
                        setClient(matched);
                    } else {
                        setError("Cliente no encontrado.");
                    }
                } catch (e) {
                    console.error(e);
                    setError("Error al cargar la información del cliente.");
                } finally {
                    setLoading(false);
                }
            } else if (status !== 'loading') {
                setLoading(false);
            }
        };
        fetchClient();
    }, [user, clientId, status]);

    if (status === 'loading' || loading) return <div className="p-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

    if (!user) {
        return (
           <Alert variant="destructive" className="rounded-3xl border-none shadow-2xl">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle className="font-black uppercase tracking-widest text-xs">Acceso Denegado</AlertTitle>
               <AlertDescription className="font-bold">Debes iniciar sesión para ver esta página.</AlertDescription>
           </Alert>
       );
    }

    if (error || !client) {
        return (
           <div className="max-w-md mx-auto space-y-4 text-center py-20">
               <Alert variant="destructive" className="rounded-3xl border-none shadow-2xl">
                   <AlertCircle className="h-4 w-4" />
                   <AlertTitle className="font-black uppercase tracking-widest text-xs">Error</AlertTitle>
                   <AlertDescription className="font-bold">{error || "Cliente no encontrado."}</AlertDescription>
               </Alert>
               <button onClick={() => router.push('/dashboard/clients')} className="text-primary font-bold hover:underline">Volver a Clientes</button>
           </div>
        );
    }

    return <ClientForm client={client} userId={user.id} />;
}
