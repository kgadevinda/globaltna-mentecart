import bcrypt from "bcryptjs";

import { env } from "../config/env";
import { logger } from "../config/logger";
import { createUser, findUserByEmailWithPassword } from "../repositories/user.repository";

export async function ensureAdminUser(): Promise<void> {
  if (!env.adminEmail || !env.adminPassword) {
    return;
  }

  const existingUser = await findUserByEmailWithPassword(env.adminEmail);

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(env.adminPassword, 12);

    await createUser({
      name: env.adminName,
      email: env.adminEmail,
      passwordHash,
      role: "admin",
    });

    logger.info({ email: env.adminEmail }, "Bootstrapped admin account");
    return;
  }

  let changed = false;

  if (existingUser.role !== "admin") {
    existingUser.role = "admin";
    changed = true;
  }

  if ((existingUser.name ?? null) !== env.adminName) {
    existingUser.name = env.adminName;
    changed = true;
  }

  const passwordMatches = await bcrypt.compare(env.adminPassword, existingUser.passwordHash);

  if (!passwordMatches) {
    existingUser.passwordHash = await bcrypt.hash(env.adminPassword, 12);
    changed = true;
  }

  if (changed) {
    await existingUser.save();
    logger.info({ email: env.adminEmail }, "Synchronized admin account");
  }
}
