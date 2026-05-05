import { z } from "zod";

const scheduledAtSchema = z.coerce.date().refine((value) => value.getTime() > Date.now(), {
  message: "Scheduled slot must be in the future",
});

export const addCartItemSchema = z.object({
  serviceId: z.string().trim().min(1),
  scheduledAt: scheduledAtSchema,
  quantity: z.coerce.number().int().positive().max(5).default(1),
});

export const updateCartItemSchema = z
  .object({
    scheduledAt: scheduledAtSchema.optional(),
    quantity: z.coerce.number().int().positive().max(5).optional(),
  })
  .refine((value) => value.scheduledAt || value.quantity, {
    message: "Provide at least one field to update",
  });
