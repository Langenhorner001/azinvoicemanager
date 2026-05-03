import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, insertProductSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function serializeProduct(product: { id: number; name: string; defaultPrice: string | number; createdAt: Date }) {
  return { ...product, defaultPrice: parseFloat(String(product.defaultPrice)) };
}

router.get("/products", async (_req, res) => {
  const products = await db.select().from(productsTable).orderBy(productsTable.createdAt);
  res.json(products.map(serializeProduct));
});

router.post("/products", async (req, res) => {
  const parsed = insertProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.insert(productsTable).values(parsed.data).returning();
  res.status(201).json(serializeProduct(product));
});

router.put("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = insertProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.update(productsTable).set(parsed.data).where(eq(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(serializeProduct(product));
});

router.delete("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [product] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.status(204).send();
});

export default router;
