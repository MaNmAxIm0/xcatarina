import { sql } from "drizzle-orm";
import { integer,sqliteTable,text } from "drizzle-orm/sqlite-core";
export const videos=sqliteTable("videos",{id:text("id").primaryKey(),title:text("title").notNull(),description:text("description").notNull().default(""),category:text("category",{enum:["art","lego"]}).notNull(),objectKey:text("object_key").notNull(),mimeType:text("mime_type").notNull(),duration:text("duration").notNull().default(""),featured:integer("featured").notNull().default(0),createdAt:text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)});
