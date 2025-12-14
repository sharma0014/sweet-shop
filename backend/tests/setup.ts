// Jest setup: ensure required env vars exist before any app/prisma modules load.
// Keep values deterministic for test runs.

import { execSync } from "node:child_process";
import path from "node:path";

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";

// Prisma reads DATABASE_URL from process.env
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./test.db";

// src/env.ts requires JWT_SECRET
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";

// Make sure the schema exists in the test DB.
// Using `db push` avoids needing to run migrations for the test database.
const projectRoot = path.resolve(__dirname, "..");
execSync("npx prisma db push --skip-generate", {
	cwd: projectRoot,
	env: process.env,
	stdio: "pipe",
});
