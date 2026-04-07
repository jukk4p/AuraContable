import { format, subDays, addDays, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import type { Invoice, Client, InvoiceStatus, Expense } from "./types";

// Helper to generate realistic data for 2026 Q1
// Seeded random to avoid hydration mismatch
const seed = 12345;
let state = seed % 2147483647;
if (state <= 0) state += 2147483646;
const seededDelta = () => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
};

export const generateMockData = () => {
  const clients: Client[] = [
    { id: "c1", name: "Tecnología Avanzada S.L.", email: "info@tec-avanzada.es", address: "Calle Mayor 1, Madrid", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c2", name: "Diseños Creativos S.A.", email: "hola@creativos.es", address: "Gran Vía 45, Barcelona", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c3", name: "Consultoría Estratégica", email: "paco@consultoria.com", address: "Av. Libertad 12, Valencia", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c4", name: "Logística Express", email: "envios@logistica.es", address: "Polígono Ind. Sur, Sevilla", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c5", name: "Marketing Digital Pro", email: "contacto@mktpro.es", address: "Paseo de la Castellana 100, Madrid", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c6", name: "Restauración Hermanos", email: "reservas@rest-hermanos.com", address: "Plaza España 5, Zaragoza", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c7", name: "Soft Solutions", email: "support@softsol.es", address: "Parque Tecnológico, Málaga", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c8", name: "Importadora del Norte", email: "ventas@import-norte.es", address: "Calle Real 88, Santander", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c9", name: "Estudio Arquitectura", email: "arq@estudio.es", address: "Rambla 10, Alicante", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c10", name: "Seguros y Más", email: "info@segurosymas.es", address: "Calle Uría 30, Oviedo", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c11", name: "Panificadora Central", email: "pedidos@pan-central.es", address: "Camino Viejo 1, Murcia", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c12", name: "Auto Repuestos", email: "taller@autorepuestos.es", address: "Ctra. General 40, Bilbao", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c13", name: "Moda y Estilo", email: "tienda@modaestilo.es", address: "Serrano 22, Madrid", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c14", name: "Distribuciones Mediterráneas", email: "med@distribuciones.es", address: "Vía Augusta 5, Palma", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c15", name: "Energía Limpia S.A.", email: "sostenibilidad@energia.es", address: "Calle Sol 1, Valladolid", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c16", name: "Hostelería Siglo XXI", email: "hotel@h21.es", address: "Av. Playa 200, Benidorm", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c17", name: "Inmobiliaria Litoral", email: "ventas@litoral.es", address: "Paseo Marítimo, Cádiz", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c18", name: "Fábrica de Muebles", email: "carpinteria@fabrica.es", address: "Ctra. Lucena km 5, Córdoba", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c19", name: "Inversiones Capital", email: "capital@inversiones.com", address: "San Bernardo 15, Madrid", userId: "demo-user", createdAt: new Date("2025-01-01") },
    { id: "c20", name: "Servicios Agrícolas", email: "campo@servicios.es", address: "Av. Olivar 2, Jaén", userId: "demo-user", createdAt: new Date("2025-01-01") },
  ];

  const invoices: Invoice[] = [];
  const today = new Date("2026-03-24");

  for (let i = 1; i <= 50; i++) {
    const client = clients[Math.floor(seededDelta() * clients.length)];
    const issueDate = subDays(new Date("2026-03-20"), Math.floor(seededDelta() * 80));
    const dueDate = addDays(issueDate, 30);
    
    let status: InvoiceStatus = "Pending";
    if (i % 3 === 0) status = "Paid";
    else if (isBefore(dueDate, today) && i % 4 !== 0) status = "Overdue";

    const baseAmount = Math.floor(seededDelta() * 2000) + 100;
    const taxRate = 0.21;
    const total = baseAmount * (1 + taxRate);

    invoices.push({
      id: `inv-${i}`,
      invoiceNumber: `FACT-2026-${i.toString().padStart(3, '0')}`,
      status,
      issueDate,
      dueDate,
      total,
      currency: "EUR",
      client,
      items: [
        { id: `item-${i}-1`, description: "Servicios de Consultoría", quantity: 1, price: baseAmount }
      ],
      createdAt: issueDate,
      updatedAt: today,
      userId: "demo-user"
    });
  }

  const expenses: Expense[] = [];
  const providers = ["Amazon Web Services", "Google Cloud", "Office Depot", "Apple Store", "Endesa", "Movistar", "Alquileres Pro", "Renfe", "Vueling", "Restaurante El Prado"];
  const categories = ["Software", "Marketing", "Suministros", "Viajes", "Alquiler", "Otros"];

  for (let i = 1; i <= 40; i++) {
    const date = subDays(new Date("2026-03-20"), Math.floor(seededDelta() * 80));
    const amount = Math.floor(seededDelta() * 800) + 50;
    const category = categories[Math.floor(seededDelta() * categories.length)];
    const provider = providers[Math.floor(seededDelta() * providers.length)];

    expenses.push({
      id: `exp-${i}`,
      userId: "demo-user",
      date,
      category,
      provider,
      description: `Gasto de ${category.toLowerCase()} - ${provider}`,
      amount,
      tax: 21
    });
  }

  return { clients, invoices, expenses };
};

export const MOCK_DATA = generateMockData();
