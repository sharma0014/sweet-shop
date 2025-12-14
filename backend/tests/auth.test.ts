import request from "supertest";
import { prisma } from "../src/db/prisma";
import { app } from "./helpers";

beforeAll(async () => {
  // Ensure database is reachable
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.sweet.deleteMany();
  await prisma.user.deleteMany();
});

describe("Auth", () => {
  it("registers a user and returns a token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@example.com", password: "secret12" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("a@example.com");
  });

  it("logs in an existing user", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "b@example.com", password: "secret12" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "b@example.com", password: "secret12" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("b@example.com");
  });
});
