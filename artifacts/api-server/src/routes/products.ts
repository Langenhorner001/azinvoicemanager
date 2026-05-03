import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function serializeProduct(product: { id: number; name: string; defaultPrice: string | number; createdAt: Date }) {
  return { ...product, defaultPrice: parseFloat(String(product.defaultPrice)) };
}

function parseProductBody(body: Record<string, unknown>): { name: string; defaultPrice: string } | null {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return null;
  const rawPrice = body.defaultPrice;
  const price = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice ?? "0"));
  const defaultPrice = isNaN(price) || price < 0 ? "0" : String(price);
  return { name, defaultPrice };
}

router.get("/products", async (_req, res) => {
  const products = await db.select().from(productsTable).orderBy(productsTable.createdAt);
  res.json(products.map(serializeProduct));
});

router.post("/products", async (req, res) => {
  const data = parseProductBody(req.body as Record<string, unknown>);
  if (!data) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [product] = await db.insert(productsTable).values(data).returning();
  res.status(201).json(serializeProduct(product));
});

router.put("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = parseProductBody(req.body as Record<string, unknown>);
  if (!data) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [product] = await db.update(productsTable).set(data).where(eq(productsTable.id, id)).returning();
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
