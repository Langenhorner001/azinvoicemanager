import { relations } from "drizzle-orm";
import { invoicesTable, invoiceItemsTable } from "./invoices";

export const invoicesRelations = relations(invoicesTable, ({ many }) => ({
  items: many(invoiceItemsTable),
}));

export const invoiceItemsRelations = relations(invoiceItemsTable, ({ one }) => ({
  invoice: one(invoicesTable, {
    fields: [invoiceItemsTable.invoiceId],
    references: [invoicesTable.id],
  }),
}));
