import { pgTable, text, timestamp, varchar, integer, numeric, boolean, uuid, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const companyProfiles = pgTable('company_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  taxId: varchar('tax_id', { length: 100 }),
  address: text('address'),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 100 }),
  logoUrl: text('logo_url'),
  iban: varchar('iban', { length: 100 }),
  currency: varchar('currency', { length: 10 }).default('EUR'),
  language: varchar('language', { length: 10 }).default('es'),
  fiscalData: text('fiscal_data'),
  defaultTerms: text('default_terms'),
  defaultTaxes: jsonb('default_taxes'),
  templates: jsonb('templates'),
  notifications: jsonb('notifications'),
  theme: varchar('theme', { length: 50 }).default('system'),
  // Stripe Integration
  stripeEnabled: boolean('stripe_enabled').default(false),
  stripePublishableKey: text('stripe_publishable_key'),
  stripeSecretKey: text('stripe_secret_key'),
  stripeWebhookSecret: text('stripe_webhook_secret'),
  // PayPal Integration
  paypalEnabled: boolean('paypal_enabled').default(false),
  paypalClientId: text('paypal_client_id'),
  paypalSecret: text('paypal_secret'),
  paypalSandbox: boolean('paypal_sandbox').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Un perfil por cuenta: el código ya lo asumía al hacer findFirst.
  userUnq: uniqueIndex('company_profiles_user_id_unq').on(table.userId),
}));

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  address: text('address'),
  country: varchar('country', { length: 100 }),
  taxId: varchar('tax_id', { length: 100 }),
  phone: varchar('phone', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('clients_user_id_idx').on(table.userId),
}));

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('Pending'), // 'Pending', 'Paid', 'Overdue'
  subtotal: integer('subtotal').notNull().default(0), // storing in cents
  total: integer('total').notNull().default(0), // storing in cents
  notes: text('notes'),
  // Payment Integration
  paymentMethod: varchar('payment_method', { length: 50 }), // 'Stripe', 'PayPal', 'Manual'
  paymentId: varchar('payment_id', { length: 255 }),
  paymentStatus: varchar('payment_status', { length: 50 }), // 'Pending', 'Paid', 'Failed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('invoices_user_id_idx').on(table.userId),
  clientIdx: index('invoices_client_id_idx').on(table.clientId),
  // Una serie de facturación no puede repetir número dentro de la misma cuenta.
  numberPerUser: uniqueIndex('invoices_user_number_unq').on(table.userId, table.invoiceNumber),
}));

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  price: integer('price').notNull().default(0), // storing in cents
  total: integer('total').notNull().default(0),
}, (table) => ({
  invoiceIdx: index('invoice_items_invoice_id_idx').on(table.invoiceId),
}));

export const invoiceTaxes = pgTable('invoice_taxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  // Numeric, no integer: con enteros era imposible un 21,5% o un 4,5%.
  // Admite negativos para las retenciones de IRPF.
  percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull(),
}, (table) => ({
  invoiceIdx: index('invoice_taxes_invoice_id_idx').on(table.invoiceId),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  href: varchar('href', { length: 500 }).notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('notifications_user_id_idx').on(table.userId),
}));

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  amount: integer('amount').notNull().default(0), // cents
  category: varchar('category', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  description: text('description'),
  receiptUrl: text('receipt_url'),
  quantity: integer('quantity').default(1).notNull(),
  // IVA soportado del gasto. Sin este dato el Modelo 303 solo podía estimar la
  // cuota deducible aplicando un 21% a ciegas.
  vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).default('21').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('expenses_user_id_idx').on(table.userId),
}));

// Relaciones
export const usersRelations = relations(users, ({ many, one }) => ({
  companyProfile: one(companyProfiles, {
    fields: [users.id],
    references: [companyProfiles.userId]
  }),
  clients: many(clients),
  invoices: many(invoices),
  expenses: many(expenses),
  notifications: many(notifications),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
  taxes: many(invoiceTaxes),
}));

export const invoiceTaxesRelations = relations(invoiceTaxes, ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceTaxes.invoiceId],
      references: [invoices.id],
    }),
  }));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
