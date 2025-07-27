

"use server"

import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, DocumentData, QueryDocumentSnapshot, Timestamp, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";
import type { Client, Invoice, Expense, CompanyProfile } from "@/lib/types";

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
        // doc.clientId is now optional in some flows
        // typeof doc.clientId === 'string' &&
        Array.isArray(doc.items) &&
        typeof doc.subtotal === 'number' &&
        typeof doc.total === 'number' &&
        // taxes can be optional
        // Array.isArray(doc.taxes) &&
        ['Paid', 'Pending', 'Overdue'].includes(doc.status) &&
        doc.issueDate instanceof Timestamp &&
        doc.dueDate instanceof Timestamp &&
        typeof doc.userId === 'string'
    );
}

// Helper to convert snapshot to Invoice
const invoiceFromSnapshot = (snapshot: QueryDocumentSnapshot<DocumentData> | DocumentData): Invoice => {
    const data = 'data' in snapshot ? snapshot.data() : snapshot;
    if (!isInvoice(data)) {
        console.error("Invalid invoice data received from Firestore:", data);
        throw new Error("Invalid invoice data from Firestore.");
    }
    return {
        id: 'id' in snapshot ? snapshot.id : '',
        ...data,
        issueDate: data.issueDate.toDate(),
        dueDate: data.dueDate.toDate(),
        taxes: data.taxes || [], // Ensure taxes is an array
        notes: data.notes || '',
        terms: data.terms || '',
    };
};

// Invoice functions
export async function getInvoices(userId: string): Promise<Invoice[]> {
    if (!userId) return [];
    const q = query(collection(db, "invoices"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => invoiceFromSnapshot(d));
}

export async function getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    if (!invoiceId) return null;
    const docRef = doc(db, "invoices", invoiceId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
         if (!isInvoice(data)) {
            console.error("Invalid invoice data received from Firestore:", data);
            throw new Error("Invalid invoice data from Firestore.");
        }
        return {
            id: docSnap.id,
            ...data,
            issueDate: data.issueDate.toDate(),
            dueDate: data.dueDate.toDate(),
        };
    } else {
        return null;
    }
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

// Type guard for Expense
function isExpense(doc: DocumentData): doc is Omit<Expense, 'id' | 'date'> & { date: Timestamp } {
    return (
        doc.date instanceof Timestamp &&
        typeof doc.category === 'string' &&
        typeof doc.provider === 'string' &&
        typeof doc.description === 'string' &&
        typeof doc.amount === 'number' &&
        typeof doc.tax === 'number' &&
        typeof doc.userId === 'string'
    );
}

// Helper to convert snapshot to Expense
const expenseFromSnapshot = (snapshot: QueryDocumentSnapshot<DocumentData>): Expense => {
    const data = snapshot.data();
    if (!isExpense(data)) {
        throw new Error("Invalid expense data from Firestore.");
    }
    return {
        id: snapshot.id,
        ...data,
        date: data.date.toDate(),
    };
};

// Expense functions
export async function getExpenses(userId: string): Promise<Expense[]> {
    if (!userId) return [];
    const q = query(collection(db, "expenses"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(expenseFromSnapshot);
}

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const docRef = await addDoc(collection(db, "expenses"), expense);
    return { id: docRef.id, ...expense };
}

export async function updateExpense(expenseId: string, expense: Partial<Omit<Expense, 'id'>>): Promise<void> {
    const expenseRef = doc(db, "expenses", expenseId);
    await updateDoc(expenseRef, expense);
}

export async function deleteExpense(expenseId: string): Promise<void> {
    await deleteDoc(doc(db, "expenses", expenseId));
}

// Company Profile functions
export async function getCompanyProfile(userId: string): Promise<CompanyProfile | null> {
    if (!userId) return null;
    const docRef = doc(db, "companyProfiles", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CompanyProfile;
    } else {
        return null;
    }
}

export async function saveCompanyProfile(profile: Omit<CompanyProfile, 'id'>): Promise<void> {
    const docRef = doc(db, "companyProfiles", profile.userId);
    await setDoc(docRef, profile, { merge: true });
}
