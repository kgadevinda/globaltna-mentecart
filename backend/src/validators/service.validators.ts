import { z } from "zod";

export const serviceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
});
