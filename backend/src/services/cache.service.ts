import { createClient } from "redis";

import { env } from "../config/env";
import { logger } from "../config/logger";

const localLocks = new Map<string, number>();
let redisClient: ReturnType<typeof createClient> | null = null;
let redisReady = false;

export async function initializeCache(): Promise<void> {
  if (!env.redisUrl) {
    logger.info("Redis not configured; using in-process webhook locking");
    return;
  }

  const candidateClient = createClient({
    url: env.redisUrl,
  });

  candidateClient.on("error", (error) => {
    logger.error({ err: error }, "Redis client error");
  });

  try {
    await candidateClient.connect();
    redisClient = candidateClient;
    redisReady = true;
    logger.info({ redisUrl: env.redisUrl }, "Connected to Redis");
  } catch (error) {
    logger.warn(
      { err: error, redisUrl: env.redisUrl },
      "Redis unavailable; continuing with in-process webhook locking",
    );

    try {
      await candidateClient.disconnect();
    } catch {
    }

    redisClient = null;
    redisReady = false;
  }
}

export async function shutdownCache(): Promise<void> {
  if (!redisClient) {
    return;
  }

  await redisClient.quit();
  redisClient = null;
  redisReady = false;
}

export async function withIdempotencyLock<T>(
  key: string,
  ttlMs: number,
  work: () => Promise<T>,
): Promise<T | null> {
  const acquired = await acquireLock(key, ttlMs);

  if (!acquired) {
    return null;
  }

  try {
    return await work();
  } finally {
    await releaseLock(key);
  }
}

async function acquireLock(key: string, ttlMs: number): Promise<boolean> {
  if (redisReady && redisClient) {
    const result = await redisClient.set(key, "1", {
      PX: ttlMs,
      NX: true,
    });

    return result === "OK";
  }

  const now = Date.now();
  const expiresAt = localLocks.get(key);

  if (expiresAt && expiresAt > now) {
    return false;
  }

  localLocks.set(key, now + ttlMs);
  return true;
}

async function releaseLock(key: string): Promise<void> {
  if (redisReady && redisClient) {
    await redisClient.del(key);
    return;
  }

  localLocks.delete(key);
}
