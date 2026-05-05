import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().toLowerCase().email().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  REDIS_URL: optionalTrimmedString,
  PUBLIC_SERVER_URL: optionalTrimmedString,
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("12h"),
  CLIENT_ORIGIN: z.string().default("*"),
  SLOT_HOLD_MINUTES: z.coerce.number().int().positive().default(15),
  MAX_BOOKINGS_PER_DAY: z.coerce.number().int().positive().default(3),
  CANCELLATION_CUTOFF_HOURS: z.coerce.number().int().nonnegative().default(6),
  HOLD_CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  PAYHERE_SANDBOX: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  PAYHERE_MERCHANT_ID: optionalTrimmedString,
  PAYHERE_MERCHANT_SECRET: optionalTrimmedString,
  PAYHERE_NOTIFY_URL: optionalTrimmedString,
  PAYHERE_RETURN_URL: optionalTrimmedString,
  PAYHERE_CANCEL_URL: optionalTrimmedString,
  PAYHERE_CURRENCY: z.enum(["LKR", "USD"]).default("LKR"),
  SEED_ON_STARTUP: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  USE_IN_MEMORY_DB: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  ADMIN_EMAIL: optionalEmail,
  ADMIN_PASSWORD: optionalTrimmedString,
  ADMIN_NAME: optionalTrimmedString,
}).superRefine((data, ctx) => {
  if (!!data.ADMIN_EMAIL !== !!data.ADMIN_PASSWORD) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "ADMIN_EMAIL and ADMIN_PASSWORD must be provided together",
      path: ["ADMIN_EMAIL"],
    });
  }

  const payHereFields = [
    data.PAYHERE_MERCHANT_ID,
    data.PAYHERE_MERCHANT_SECRET,
    data.PAYHERE_NOTIFY_URL,
  ];

  const somePayHereFieldsSet = payHereFields.some(Boolean);
  const allPayHereFieldsSet = payHereFields.every(Boolean);

  if (somePayHereFieldsSet && !allPayHereFieldsSet) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "PAYHERE_MERCHANT_ID, PAYHERE_MERCHANT_SECRET, and PAYHERE_NOTIFY_URL must be provided together",
      path: ["PAYHERE_MERCHANT_ID"],
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  mongoUri: parsed.data.MONGODB_URI,
  redisUrl: parsed.data.REDIS_URL,
  publicServerUrl: parsed.data.PUBLIC_SERVER_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  clientOrigin: parsed.data.CLIENT_ORIGIN,
  slotHoldMinutes: parsed.data.SLOT_HOLD_MINUTES,
  maxBookingsPerDay: parsed.data.MAX_BOOKINGS_PER_DAY,
  cancellationCutoffHours: parsed.data.CANCELLATION_CUTOFF_HOURS,
  holdCleanupIntervalMs: parsed.data.HOLD_CLEANUP_INTERVAL_MS,
  payhereSandbox: parsed.data.PAYHERE_SANDBOX,
  payhereMerchantId: parsed.data.PAYHERE_MERCHANT_ID,
  payhereMerchantSecret: parsed.data.PAYHERE_MERCHANT_SECRET,
  payhereNotifyUrl: parsed.data.PAYHERE_NOTIFY_URL,
  payhereReturnUrl: parsed.data.PAYHERE_RETURN_URL,
  payhereCancelUrl: parsed.data.PAYHERE_CANCEL_URL,
  payhereCurrency: parsed.data.PAYHERE_CURRENCY,
  seedOnStartup: parsed.data.SEED_ON_STARTUP,
  useInMemoryDb: parsed.data.USE_IN_MEMORY_DB,
  adminEmail: parsed.data.ADMIN_EMAIL,
  adminPassword: parsed.data.ADMIN_PASSWORD,
  adminName: parsed.data.ADMIN_NAME ?? "Operations Admin",
};
