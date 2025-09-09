import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'tourist' or 'police'
  name: text("name").notNull(),
  nationality: text("nationality"),
  badge: text("badge"), // for police officers
  createdAt: timestamp("created_at").defaultNow(),
});

export const tourists = pgTable("tourists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  touristId: text("tourist_id").notNull().unique(), // TID-2024-001523 format
  safetyScore: decimal("safety_score", { precision: 5, scale: 2 }).default("85.00"),
  currentLocation: text("current_location"),
  lastKnownLat: decimal("last_known_lat", { precision: 10, scale: 8 }),
  lastKnownLng: decimal("last_known_lng", { precision: 11, scale: 8 }),
  locationSharing: boolean("location_sharing").default(true),
  status: text("status").default("safe"), // 'safe', 'caution', 'alert'
  validUntil: timestamp("valid_until"),
  emergencyContacts: json("emergency_contacts").$type<Array<{name: string, phone: string, relation: string}>>(),
  itinerary: json("itinerary").$type<Array<{place: string, date: string, time: string}>>(),
  lastUpdate: timestamp("last_update").defaultNow(),
});

export const geoZones = pgTable("geo_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'safe', 'caution', 'restricted'
  coordinates: json("coordinates").$type<Array<{lat: number, lng: number}>>().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  touristId: varchar("tourist_id").references(() => tourists.id).notNull(),
  type: text("type").notNull(), // 'panic', 'geofence', 'medical', 'missing'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  status: text("status").default("active"), // 'active', 'resolved', 'investigating'
  location: text("location"),
  lat: decimal("lat", { precision: 10, scale: 8 }),
  lng: decimal("lng", { precision: 11, scale: 8 }),
  description: text("description"),
  respondedBy: varchar("responded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTouristSchema = createInsertSchema(tourists).omit({
  id: true,
  lastUpdate: true,
});

export const insertGeoZoneSchema = createInsertSchema(geoZones).omit({
  id: true,
  createdAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTourist = z.infer<typeof insertTouristSchema>;
export type Tourist = typeof tourists.$inferSelect;
export type InsertGeoZone = z.infer<typeof insertGeoZoneSchema>;
export type GeoZone = typeof geoZones.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
