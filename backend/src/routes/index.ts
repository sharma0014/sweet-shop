import { Router } from "express";
import { authRouter } from "./auth";
import { sweetsRouter } from "./sweets";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/sweets", sweetsRouter);
