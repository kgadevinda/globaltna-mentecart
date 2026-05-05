import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { initializeCache, shutdownCache } from "./services/cache.service";
import { cleanupExpiredHolds } from "./services/capacity.service";
import { ensureAdminUser } from "./services/bootstrap.service";
import { cleanupExpiredPayHereBookings } from "./services/booking.service";
import { seedCatalogIfEmpty } from "./services/seed.service";

async function bootstrap() {
  let memoryServer: MongoMemoryServer | undefined;
  let holdCleanupTimer: NodeJS.Timeout | undefined;
  let mongoUri = env.mongoUri;

  if (env.useInMemoryDb) {
    memoryServer = await MongoMemoryServer.create();
    mongoUri = memoryServer.getUri("mentecart");
    logger.info({ mongoUri }, "Started in-memory MongoDB");
  }

  await mongoose.connect(mongoUri);
  logger.info({ mongoUri }, "Connected to MongoDB");
  await initializeCache();

  await ensureAdminUser();

  if (env.seedOnStartup) {
    const seeded = await seedCatalogIfEmpty();

    if (seeded) {
      logger.info("Seeded default service catalog");
    }
  }

  const app = createApp();

  holdCleanupTimer = setInterval(() => {
    void Promise.all([cleanupExpiredHolds(), cleanupExpiredPayHereBookings()]).catch((error) => {
      logger.error({ err: error }, "Background cleanup tick failed");
    });
  }, env.holdCleanupIntervalMs);
  holdCleanupTimer.unref();

  const server = app.listen(env.port, () => {
    logger.info({ port: env.port }, "MenteCart backend listening");
  });

  const shutdown = async () => {
    server.close();
    if (holdCleanupTimer) {
      clearInterval(holdCleanupTimer);
    }
    await shutdownCache();
    await mongoose.disconnect();
    await memoryServer?.stop();
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void bootstrap().catch((error) => {
  logger.error({ err: error }, "Failed to start backend");
  process.exit(1);
});
