import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, DocumentData, QueryDocumentSnapshot, Timestamp, getDoc, setDoc, orderBy, limit, onSnapshot, FirestoreError } from "firebase/firestore";
import { db } from "./config";
import type { Client, Invoice, Expense, CompanyProfile, AppNotification, UserProfile, Product, Report, ImportExportRecord } from "@/lib/types";

// Type guard for UserProfile
function isUserProfile(doc: DocumentData): doc is UserProfile {
    const data = doc as UserProfile;
    // Add checks for UserProfile fields
    return typeof data.uid === 'string'; 
}

// Helper to convert snapshot to UserProfile
const userProfileFromSnapshot = (snapshot: QueryDocumentSnapshot<DocumentData>): UserProfile => {
    const data = snapshot.data();
    if (!isUserProfile(data)) {
        throw new Error("Invalid user profile data from Firestore.");
    }
    return {
        id: snapshot.id,
        ...data,
    };
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!userId) return null;
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return userProfileFromSnapshot(docSnap as QueryDocumentSnapshot<DocumentData>);
    } else {
        return null;
    }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
    const docRef = doc(db, "users", profile.uid);
    await setDoc(docRef, profile, { merge: true });
}


// Type guard for Client
function isClient(doc: DocumentData): doc is Client {
    const data = doc as Client;
    return (
        typeof data.name === 'string' &&
        typeof data.email === 'string' &&
        typeof data.userId === 'string'
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
        userId: data.userId,
        name: data.name,
        email: data.email,
        address: data.address,
        country: data.country,
        taxId: data.taxId,
        phone: data.phone,
        notes: data.notes,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    };
};

export async function getClients(userId: string): Promise<Client[]> {
    if (!userId) return [];
    const q = query(collection(db, "clients"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const clients = querySnapshot.docs.map(clientFromSnapshot);
    return clients.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const newClient = { ...client, createdAt: new Date() };
    const docRef = await addDoc(collection(db, "clients"), newClient);
    return { id: docRef.id, ...newClient };
}

export async function updateClient(clientId: string, client: Partial<Omit<Client, 'id' | 'userId'>>): Promise<void> {
    const clientRef = doc(db, "clients", clientId);
    await updateDoc(clientRef, client);
}

export async function deleteClient(clientId: string): Promise<void> {
    await deleteDoc(doc(db, "clients", clientId));
}


// Type guard for Invoice
function isInvoice(doc: DocumentData): doc is Omit<Invoice, 'id' | 'issueDate' | 'dueDate' | 'createdAt'> & { issueDate: Timestamp, dueDate: Timestamp, createdAt: Timestamp } {
     const data = doc as Invoice & { issueDate: Timestamp, dueDate: Timestamp, createdAt: Timestamp };
     return (
        typeof data.invoiceNumber === 'string' &&
        data.client && typeof data.client.name === 'string' &&
        Array.isArray(data.items) &&
        typeof data.subtotal === 'number' &&
        typeof data.total === 'number' &&
        ['Paid', 'Pending', 'Overdue'].includes(data.status) &&
        data.issueDate instanceof Timestamp &&
        data.dueDate instanceof Timestamp &&
        data.createdAt instanceof Timestamp &&
        typeof data.userId === 'string'
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
        createdAt: data.createdAt.toDate(),
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
            createdAt: data.createdAt.toDate(),
        };
    } else {
        return null;
    }
}


export async function addInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    const newInvoice = { ...invoice, createdAt: new Date() };
    const docRef = await addDoc(collection(db, "invoices"), newInvoice);
    return { id: docRef.id, ...newInvoice };
}

export async function updateInvoice(invoiceId: string, invoice: Partial<Omit<Invoice, 'id' | 'userId'>>): Promise<void> {
    const invoiceRef = doc(db, "invoices", invoiceId);
    const cleanInvoice = Object.fromEntries(Object.entries(invoice).filter(([_, v]) => v !== undefined));
    await updateDoc(invoiceRef, cleanInvoice);
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

export async function updateExpense(expenseId: string, expense: Partial<Omit<Expense, 'id' | 'userId'>>): Promise<void> {
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
        return docSnap.data() as CompanyProfile;
    } else {
        return null;
    }
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<void> {
    const docRef = doc(db, "companyProfiles", profile.userId);
    const cleanProfile = Object.fromEntries(Object.entries(profile).filter(([_, v]) => v !== undefined));
    await setDoc(docRef, cleanProfile, { merge: true });
}

// Notification functions
const notificationFromSnapshot = (snapshot: QueryDocumentSnapshot<DocumentData>): AppNotification => {
    const data = snapshot.data();
    return {
        id: snapshot.id,
        userId: data.userId,
        message: data.message,
        type: data.type,
        channel: data.channel,
        isRead: data.isRead,
        reference: data.reference,
        createdAt: (data.createdAt as Timestamp).toDate(),
    };
};

export function getNotifications(
    userId: string,
    callback: (notifications: AppNotification[]) => void,
    onError: (error: FirestoreError) => void
) {
    if (!userId) {
        return () => {}; // Return an empty unsubscribe function
    }

    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(10)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const notifications = querySnapshot.docs.map(notificationFromSnapshot);
        callback(notifications);
    }, onError);

    return unsubscribe; // Return the actual unsubscribe function from onSnapshot
}


export async function addNotification(notification: Omit<AppNotification, 'id' | 'createdAt'>): Promise<void> {
    const newNotification = { ...notification, createdAt: new Date(), isRead: false };
    await addDoc(collection(db, "notifications"), newNotification);
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { isRead: true });
}
