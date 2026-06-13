import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('employee'),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const whatsappSessionsTable = sqliteTable('whatsapp_sessions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull().default('disconnected'),
  phoneNumber: text('phone_number'),
  qrCode: text('qr_code'),
  webhookUrl: text('webhook_url'),
  webhookEvents: text('webhook_events').default('[]'),
  features: text('features').default('{}'),
  lastConnectedAt: text('last_connected_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const messagesTable = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull().references(() => whatsappSessionsTable.id),
  direction: text('direction').notNull(),
  type: text('type').notNull().default('text'),
  from_: text('from'),
  to_: text('to'),
  content: text('content'),
  mediaUrl: text('media_url'),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
});

export const apiKeysTable = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => usersTable.id),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  prefix: text('prefix').notNull(),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogsTable = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => usersTable.id),
  action: text('action').notNull(),
  details: text('details').default('{}'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Session = typeof whatsappSessionsTable.$inferSelect;
export type NewSession = typeof whatsappSessionsTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;
export type ApiKey = typeof apiKeysTable.$inferSelect;
export type NewApiKey = typeof apiKeysTable.$inferInsert;
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type NewAuditLog = typeof auditLogsTable.$inferInsert;
