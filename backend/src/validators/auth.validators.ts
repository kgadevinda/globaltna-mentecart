import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(72),
});
