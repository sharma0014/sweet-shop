import request from "supertest";
import { createApp } from "../src/app";

export const app = createApp();

export async function registerAndLogin(email: string, password: string) {
  const registerRes = await request(app).post("/api/auth/register").send({ email, password });
  const token = registerRes.body.token as string;
  return { token, user: registerRes.body.user };
}
