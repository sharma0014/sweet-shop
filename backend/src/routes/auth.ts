import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken, type Role } from "../lib/jwt";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const { email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "ADMIN" : "USER";

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
    },
    select: { id: true, email: true, role: true },
  });

  const roleForToken: Role = user.role === "ADMIN" ? "ADMIN" : "USER";
  const token = signToken({ userId: user.id, role: roleForToken });
  return res.status(201).json({ token, user });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const roleForToken: Role = user.role === "ADMIN" ? "ADMIN" : "USER";
  const token = signToken({ userId: user.id, role: roleForToken });
  return res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role } });
});
