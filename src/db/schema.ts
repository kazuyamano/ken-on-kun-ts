import {
  pgTable,
  serial,
  text,
  real,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  temp: real("temp").notNull(),
  breathlessness: boolean("breathlessness").default(false),
  dullness: boolean("dullness").default(false),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
