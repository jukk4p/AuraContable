
"use server"

import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "./config";
import type { Client } from "@/lib/types";

// Type guard para verificar si un documento es de tipo Client
function isClient(doc: DocumentData): doc is Client {
    return (
        typeof doc.name === 'string' &&
        typeof doc.email === 'string' &&
        typeof doc.avatarUrl === 'string' &&
        typeof doc.userId === 'string'
    );
}

// Helper para convertir un snapshot a un objeto Client
const clientFromSnapshot = (snapshot: QueryDocumentSnapshot<DocumentData>): Client => {
    const data = snapshot.data();
    if (!isClient(data)) {
        throw new Error("Invalid client data from Firestore.");
    }
    return {
        id: snapshot.id,
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl,
        userId: data.userId,
    };
};


export async function getClients(userId: string): Promise<Client[]> {
    if (!userId) return [];
    const q = query(collection(db, "clients"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(clientFromSnapshot);
}

export async function addClient(client: Omit<Client, 'id'>): Promise<Client> {
    const docRef = await addDoc(collection(db, "clients"), client);
    return { id: docRef.id, ...client };
}

export async function updateClient(clientId: string, client: Partial<Client>): Promise<void> {
    const clientRef = doc(db, "clients", clientId);
    await updateDoc(clientRef, client);
}

export async function deleteClient(clientId: string): Promise<void> {
    await deleteDoc(doc(db, "clients", clientId));
}
