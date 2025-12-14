import request from "supertest";
import { prisma } from "../src/db/prisma";
import { app, registerAndLogin } from "./helpers";

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.sweet.deleteMany();
  await prisma.user.deleteMany();
});

describe("Sweets", () => {
  it("creates and lists sweets (protected)", async () => {
    const { token } = await registerAndLogin("admin@example.com", "secret12");

    const createRes = await request(app)
      .post("/api/sweets")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Ladoo", category: "Indian", price: 100, quantity: 5 });

    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get("/api/sweets")
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBe(1);
  });

  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/sweets");
    expect(res.status).toBe(401);
  });

  it("searches sweets by name/category/price range", async () => {
    const { token } = await registerAndLogin("admin@example.com", "secret12");

    await prisma.sweet.createMany({
      data: [
        { name: "Ladoo", category: "Indian", price: 100, quantity: 5 },
        { name: "Barfi", category: "Indian", price: 150, quantity: 2 },
        { name: "Donut", category: "Bakery", price: 250, quantity: 10 },
      ],
    });

    const byName = await request(app)
      .get("/api/sweets/search")
      .query({ name: "doo" })
      .set("Authorization", `Bearer ${token}`);
    expect(byName.status).toBe(200);
    expect(byName.body).toHaveLength(1);
    expect(byName.body[0].name).toBe("Ladoo");

    const byCategory = await request(app)
      .get("/api/sweets/search")
      .query({ category: "ind" })
      .set("Authorization", `Bearer ${token}`);
    expect(byCategory.status).toBe(200);
    expect(byCategory.body).toHaveLength(2);

    const byPrice = await request(app)
      .get("/api/sweets/search")
      .query({ minPrice: 120, maxPrice: 260 })
      .set("Authorization", `Bearer ${token}`);
    expect(byPrice.status).toBe(200);
    expect(byPrice.body).toHaveLength(2);
  });

  it("updates a sweet", async () => {
    const { token } = await registerAndLogin("admin@example.com", "secret12");

    const sweet = await prisma.sweet.create({
      data: { name: "Jalebi", category: "Indian", price: 120, quantity: 3 },
    });

    const res = await request(app)
      .put(`/api/sweets/${sweet.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 130, quantity: 4 });

    expect(res.status).toBe(200);
    expect(res.body.price).toBe(130);
    expect(res.body.quantity).toBe(4);
  });

  it("purchases a sweet and decreases quantity", async () => {
    const { token } = await registerAndLogin("admin@example.com", "secret12");

    const sweet = await prisma.sweet.create({
      data: { name: "Barfi", category: "Indian", price: 150, quantity: 2 },
    });

    const res = await request(app)
      .post(`/api/sweets/${sweet.id}/purchase`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1 });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(1);
  });

  it("rejects purchase when not enough stock", async () => {
    const { token } = await registerAndLogin("admin@example.com", "secret12");

    const sweet = await prisma.sweet.create({
      data: { name: "Peda", category: "Indian", price: 90, quantity: 1 },
    });

    const res = await request(app)
      .post(`/api/sweets/${sweet.id}/purchase`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 2 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Not enough stock");
  });

  it("restocks a sweet (admin only)", async () => {
    const { token } = await registerAndLogin("admin@example.com", "secret12");

    const sweet = await prisma.sweet.create({
      data: { name: "Jalebi", category: "Indian", price: 120, quantity: 0 },
    });

    const res = await request(app)
      .post(`/api/sweets/${sweet.id}/restock`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 5 });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(5);
  });

  it("prevents non-admin from restocking and deleting", async () => {
    // First user is ADMIN
    await registerAndLogin("admin@example.com", "secret12");
    // Second user is USER
    const { token } = await registerAndLogin("user@example.com", "secret12");

    const sweet = await prisma.sweet.create({
      data: { name: "Halwa", category: "Indian", price: 110, quantity: 1 },
    });

    const restockRes = await request(app)
      .post(`/api/sweets/${sweet.id}/restock`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1 });
    expect(restockRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/sweets/${sweet.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(403);
  });
});
