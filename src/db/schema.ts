import { pgTable, text, timestamp, varchar, integer, boolean, serial, uuid, jsonb } from 'drizzle-orm/pg-core';
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
});

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
});

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
});

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  price: integer('price').notNull().default(0), // storing in cents
  total: integer('total').notNull().default(0),
});

export const invoiceTaxes = pgTable('invoice_taxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  percentage: integer('percentage').notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  href: varchar('href', { length: 500 }).notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  amount: integer('amount').notNull().default(0), // cents
  category: varchar('category', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  description: text('description'),
  receiptUrl: varchar('receipt_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
