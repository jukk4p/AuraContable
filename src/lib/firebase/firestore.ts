
"use server"

import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, DocumentData, QueryDocumentSnapshot, Timestamp } from "firebase/firestore";
import { db } from "./config";
import type { Client, Invoice, InvoiceItem } from "@/lib/types";

// Type guard for Client
function isClient(doc: DocumentData): doc is Client {
    return (
        typeof doc.name === 'string' &&
        typeof doc.email === 'string' &&
        typeof doc.avatarUrl === 'string' &&
        typeof doc.userId === 'string'
    );
}

// Helper to convert snapshot to Client
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

export async function updateClient(clientId: string, client: Partial<Omit<Client, 'id'>>): Promise<void> {
    const clientRef = doc(db, "clients", clientId);
    await updateDoc(clientRef, client);
}

export async function deleteClient(clientId: string): Promise<void> {
    await deleteDoc(doc(db, "clients", clientId));
}


// Type guard for Invoice
function isInvoice(doc: DocumentData): doc is Omit<Invoice, 'id' | 'issueDate' | 'dueDate'> & { issueDate: Timestamp, dueDate: Timestamp } {
     return (
        typeof doc.invoiceNumber === 'string' &&
        doc.client && typeof doc.client.name === 'string' &&
        typeof doc.clientId === 'string' &&
        Array.isArray(doc.items) &&
        typeof doc.subtotal === 'number' &&
        ['Paid', 'Pending', 'Overdue'].includes(doc.status) &&
        doc.issueDate instanceof Timestamp &&
        doc.dueDate instanceof Timestamp &&
        typeof doc.userId === 'string'
    );
}

// Helper to convert snapshot to Invoice
const invoiceFromSnapshot = (snapshot: QueryDocumentSnapshot<DocumentData>): Invoice => {
    const data = snapshot.data();
    if (!isInvoice(data)) {
        console.error("Invalid invoice data received from Firestore:", data);
        throw new Error("Invalid invoice data from Firestore.");
    }
    return {
        id: snapshot.id,
        ...data,
        issueDate: data.issueDate.toDate(),
        dueDate: data.dueDate.toDate(),
    };
};

// Invoice functions
export async function getInvoices(userId: string): Promise<Invoice[]> {
    if (!userId) return [];
    const q = query(collection(db, "invoices"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(invoiceFromSnapshot);
}

export async function addInvoice(invoice: Omit<Invoice, 'id'>): Promise<Invoice> {
    const docRef = await addDoc(collection(db, "invoices"), invoice);
    return { id: docRef.id, ...invoice };
}

export async function updateInvoice(invoiceId: string, invoice: Partial<Omit<Invoice, 'id'>>): Promise<void> {
    const invoiceRef = doc(db, "invoices", invoiceId);
    await updateDoc(invoiceRef, invoice);
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
    await deleteDoc(doc(db, "invoices", invoiceId));
}

