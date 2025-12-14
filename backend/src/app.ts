import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/api", apiRouter);

  // Serve built frontend in production (optional, for single-service deploy)
  const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
  const indexHtmlPath = path.join(frontendDistPath, "index.html");
  if (process.env.NODE_ENV !== "test" && fs.existsSync(indexHtmlPath)) {
    app.use(express.static(frontendDistPath));
    // Express 5 + path-to-regexp v6 doesn't support "*"; use a regex.
    app.get(/^(?!\/api)(?!\/health$).*/, (_req, res) => {
      return res.sendFile(indexHtmlPath);
    });
  }

  // basic error fallback
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}
