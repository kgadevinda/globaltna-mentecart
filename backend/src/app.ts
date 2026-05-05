import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existingId = req.headers["x-request-id"];
        const requestId = typeof existingId === "string" ? existingId : randomUUID();
        res.setHeader("x-request-id", requestId);
        return requestId;
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigin === "*" ? true : env.clientOrigin,
    }),
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.status(200).json({
      name: "MenteCart API",
      status: "ok",
      message: "This server exposes the booking API. Run the Flutter client separately for the UI.",
      routes: {
        health: "/health",
        api: "/api",
        auth: "/api/auth",
        services: "/api/services",
        cart: "/api/cart",
        bookings: "/api/bookings",
        payments: "/api/payments",
      },
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api", apiRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
