import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, insertCustomerSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/customers", async (_req, res) => {
  const customers = await db.select().from(customersTable).orderBy(customersTable.createdAt);
  res.json(customers);
});

router.post("/customers", async (req, res) => {
  const parsed = insertCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [customer] = await db.insert(customersTable).values(parsed.data).returning();
  res.status(201).json(customer);
});

router.put("/customers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = insertCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [customer] = await db.update(customersTable).set(parsed.data).where(eq(customersTable.id, id)).returning();
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(customer);
});

router.delete("/customers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [customer] = await db.delete(customersTable).where(eq(customersTable.id, id)).returning();
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.status(204).send();
});

export default router;
