import jwt from "jsonwebtoken";
import { env } from "../env";

export type Role = "USER" | "ADMIN";

export type JwtPayload = {
  userId: string;
  role: Role;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "2h" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
