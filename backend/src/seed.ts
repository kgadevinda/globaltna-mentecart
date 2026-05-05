import mongoose from "mongoose";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { seedCatalogIfEmpty } from "./services/seed.service";

async function runSeed() {
  await mongoose.connect(env.mongoUri);
  const seeded = await seedCatalogIfEmpty();
  logger.info({ seeded }, "Seed completed");
  await mongoose.disconnect();
}

void runSeed().catch((error) => {
  logger.error({ err: error }, "Seed failed");
  process.exit(1);
});
