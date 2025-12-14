import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";

export const sweetsRouter = Router();

sweetsRouter.use(requireAuth);

const createSweetSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().int().nonnegative(),
  quantity: z.number().int().nonnegative(),
});

sweetsRouter.post("/", async (req, res) => {
  const parsed = createSweetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const sweet = await prisma.sweet.create({ data: parsed.data });
  return res.status(201).json(sweet);
});

sweetsRouter.get("/", async (_req, res) => {
  const sweets = await prisma.sweet.findMany({ orderBy: { createdAt: "desc" } });
  return res.status(200).json(sweets);
});

// /api/sweets/search?name=..&category=..&minPrice=..&maxPrice=..
const searchSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
});

sweetsRouter.get("/search", async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query", issues: parsed.error.issues });
  }

  const { name, category, minPrice, maxPrice } = parsed.data;

  const where: Prisma.SweetWhereInput = {};
  if (name) where.name = { contains: name };
  if (category) where.category = { contains: category };
  if (minPrice != null || maxPrice != null) {
    const priceFilter: Prisma.IntFilter = {};
    if (minPrice != null) priceFilter.gte = minPrice;
    if (maxPrice != null) priceFilter.lte = maxPrice;
    where.price = priceFilter;
  }

  const sweets = await prisma.sweet.findMany({ where, orderBy: { createdAt: "desc" } });
  return res.status(200).json(sweets);
});

const updateSweetSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  price: z.number().int().nonnegative().optional(),
  quantity: z.number().int().nonnegative().optional(),
});

sweetsRouter.put("/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = updateSweetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  try {
    const updated = await prisma.sweet.update({ where: { id }, data: parsed.data });
    return res.status(200).json(updated);
  } catch {
    return res.status(404).json({ message: "Sweet not found" });
  }
});

sweetsRouter.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.sweet.delete({ where: { id } });
    return res.status(204).send();
  } catch {
    return res.status(404).json({ message: "Sweet not found" });
  }
});

const adjustQtySchema = z.object({
  amount: z.number().int().positive().optional(),
});

sweetsRouter.post("/:id/purchase", async (req, res) => {
  const { id } = req.params;
  const parsed = adjustQtySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const amount = parsed.data.amount ?? 1;

  try {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const sweet = await tx.sweet.findUnique({ where: { id } });
      if (!sweet) {
        return { status: 404 as const, body: { message: "Sweet not found" } };
      }
      if (sweet.quantity < amount) {
        return { status: 400 as const, body: { message: "Not enough stock" } };
      }
      const next = await tx.sweet.update({
        where: { id },
        data: { quantity: sweet.quantity - amount },
      });
      return { status: 200 as const, body: next };
    });

    return res.status(updated.status).json(updated.body);
  } catch {
    return res.status(500).json({ message: "Unexpected error" });
  }
});

sweetsRouter.post("/:id/restock", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const parsed = adjustQtySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const amount = parsed.data.amount ?? 1;

  try {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const sweet = await tx.sweet.findUnique({ where: { id } });
      if (!sweet) {
        return { status: 404 as const, body: { message: "Sweet not found" } };
      }
      const next = await tx.sweet.update({
        where: { id },
        data: { quantity: sweet.quantity + amount },
      });
      return { status: 200 as const, body: next };
    });

    return res.status(updated.status).json(updated.body);
  } catch {
    return res.status(500).json({ message: "Unexpected error" });
  }
});
